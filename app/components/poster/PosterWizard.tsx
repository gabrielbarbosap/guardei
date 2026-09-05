"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import type { LocationPhoto } from "@/types/location";
import type { PosterCaption, PosterFormat, ShippingAddress, ShippingChoice } from "@/types/poster";
import { savePosterOrder, setPosterOrderImageUrl } from "@/lib/firestore";
import { renderPosterFromLayout, buildPosterParams } from "@/lib/posterCanvas";
import type { PlacedPolaroid } from "@/lib/posterLayout";
import { layoutPolaroids } from "@/lib/posterLayout";
import { PREVIEW_W, previewHeightFor } from "@/lib/posterPreview";
import { bestExportDims, PRINT_JPEG_QUALITY } from "@/lib/posterQuality";
import { notifyOrderCreated } from "@/lib/notify";
import { storage } from "@/lib/storage";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Step2Format from "./Step2Format";
import Step3Compose from "./Step3Compose";
import Step4Order from "./Step4Order";

type Props = {
  user: User;
  locations: LocationPhoto[];
  onClose: () => void;
};

type Step = 1 | 2 | 3;

const STEP_LABELS = ["formato", "composição", "pedido"];

export default function PosterWizard({ user, locations, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [format, setFormat] = useState<PosterFormat>("a3_portrait");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(locations.map((l) => l.id)));
  const [featuredId, setFeaturedId] = useState<string>(locations[0]?.id ?? "");
  const [userLayout, setUserLayout] = useState<PlacedPolaroid[] | null>(null);
  /* Guardada em unidades da previa; a escala para a arte final acontece na hora
     de desenhar, junto com a do layout. */
  const [caption, setCaption] = useState<PosterCaption | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitStep, setSubmitStep] = useState("");

  function handleToggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (featuredId === id) {
          const remaining = locations.find((l) => next.has(l.id));
          setFeaturedId(remaining?.id ?? "");
        }
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSetFeatured(id: string) {
    if (selectedIds.has(id)) setFeaturedId(id);
  }

  function handleComposeNext(layout: PlacedPolaroid[], frase?: PosterCaption) {
    setUserLayout(layout);
    setCaption(frase);
    setStep(3);
  }

  async function handleOrderSubmit(
    customerName: string,
    customerContact: string,
    contactType: "email" | "whatsapp",
    shippingAddress: ShippingAddress,
    shipping: ShippingChoice,
  ) {
    setSubmitting(true);
    setSubmitError("");
    try {
      const selected = locations.filter((l) => selectedIds.has(l.id));
      const items = selected.map((l) => ({
        locationId: l.id,
        lat: l.lat,
        lng: l.lng,
        description: l.description,
        isFeatured: l.id === featuredId,
      }));

      setSubmitStep("salvando pedido...");
      const id = await savePosterOrder({
        userId: user.uid,
        userEmail: user.email,
        scope: { type: "world" },
        format,
        items,
        featuredLocationId: featuredId,
        // ausente quando ninguem escreveu nada; stripUndefinedDeep tira a chave
        caption,
        customerName,
        customerContact,
        contactType,
        shippingAddress,
        shipping,
        status: "pending_payment",
        createdAt: Date.now(),
      });

      // confirma o pedido por e-mail sem travar a geração da imagem
      notifyOrderCreated(id);

      /* A maior resolucao que este aparelho aguenta, de 300 DPI para baixo.
         FORMAT_DIMS descreve o poster a 150 DPI, metade do padrao de grafica. */
      const dims = bestExportDims(format);
      setSubmitStep(`gerando imagem em ${dims.dpi} DPI...`);
      const canvas = document.createElement("canvas");
      canvas.width = dims.w;
      canvas.height = dims.h;

      /* Um fator so para o layout e para a frase: as duas coisas foram
         posicionadas na mesma previa e precisam continuar alinhadas. */
      const previewH = previewHeightFor(dims.w, dims.h);
      const scaleX = dims.w / PREVIEW_W;
      const scaleY = dims.h / previewH;
      const fraseFinal: PosterCaption | undefined = caption && {
        ...caption,
        x: caption.x * scaleX,
        y: caption.y * scaleY,
        size: caption.size * scaleX,
      };

      // Escala o layout da prévia para resolução final
      let fullLayout: PlacedPolaroid[];
      if (userLayout && userLayout.length > 0) {
        fullLayout = userLayout.map((p) => ({
          ...p,
          pinX: p.pinX * scaleX,
          pinY: p.pinY * scaleY,
          cardX: p.cardX * scaleX,
          cardY: p.cardY * scaleY,
          size: p.size * scaleX,
        }));
      } else {
        // Fallback: recomputa o layout em resolução final
        const { apiW, apiH, centerLon, centerLat, zoom } = buildPosterParams(selected, dims.w, dims.h);
        fullLayout = layoutPolaroids(selected, featuredId, centerLon, centerLat, zoom, dims.w, dims.h, apiW, apiH);
      }

      await renderPosterFromLayout(canvas, fullLayout, selected, fraseFinal);

      setSubmitStep("salvando imagem...");
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error("canvas vazio")), "image/jpeg", PRINT_JPEG_QUALITY);
      });
      const storageRef = ref(storage, `posterOrders/${id}/poster.jpg`);
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const posterImageUrl = await getDownloadURL(storageRef);
      await setPosterOrderImageUrl(id, posterImageUrl);

      // Redireciona para o Stripe Checkout
      setSubmitStep("redirecionando para pagamento...");
      const customerEmail = contactType === "email" ? customerContact : (user.email ?? undefined);
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: id,
          format,
          customerEmail,
          customerName,
          shippingAddress,
          shippingServiceId: shipping.serviceId,
          // o servidor recota e compara com este valor antes de cobrar
          shippingPriceCents: shipping.priceCents,
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(detail?.error ?? "Falha ao criar sessão de pagamento.");
      }
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (err) {
      console.error("poster order error:", err);
      setSubmitError(err instanceof Error && err.message ? err.message : "Erro ao processar pedido. Tente novamente.");
      setSubmitting(false);
      setSubmitStep("");
    }
  }

  const currentStepNum = step as number;

  return (
    <div
      className="poster-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="poster-modal"
        style={{ maxWidth: step === 2 ? 1100 : 720 }}
      >
        {/* Header */}
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid var(--paper-300)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink-900)" }}>
              Criar Poster
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {STEP_LABELS.map((label, i) => {
                const num = i + 1;
                const done = currentStepNum > num;
                const active = currentStepNum === num;
                return (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: done ? "var(--ink-700)" : active ? "var(--ink-900)" : "var(--paper-300)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 9, color: done || active ? "var(--paper-50)" : "var(--ink-500)", fontFamily: "var(--font-mono)" }}>{done ? "✓" : num}</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: active ? "var(--ink-800)" : "var(--ink-400)" }}>
                      {label}
                    </span>
                    {i < STEP_LABELS.length - 1 && (
                      <div style={{ width: 12, height: 1, background: "var(--paper-300)", marginLeft: 2 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--ink-400)", padding: "4px 8px", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px 24px", overflowY: "auto", flex: 1 }}>

          {step === 1 && (
            <Step2Format
              value={format}
              onChange={setFormat}
              onNext={() => setStep(2)}
              onBack={onClose}
              userEmail={user.email}
            />
          )}

          {step === 2 && (
            <Step3Compose
              locations={locations}
              format={format}
              selectedIds={selectedIds}
              featuredId={featuredId}
              onToggle={handleToggle}
              onSetFeatured={handleSetFeatured}
              onNext={handleComposeNext}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <Step4Order
              format={format}
              onSubmit={handleOrderSubmit}
              onBack={() => setStep(2)}
              submitting={submitting}
              submitStep={submitStep}
              submitError={submitError}
            />
          )}

        </div>
      </div>
    </div>
  );
}
