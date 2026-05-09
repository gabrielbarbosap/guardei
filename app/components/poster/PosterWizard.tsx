"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import type { LocationPhoto } from "@/types/location";
import type { PosterFormat, PosterScope } from "@/types/poster";
import { FORMAT_DIMS, scopeToBbox } from "@/lib/posterMap";
import { savePosterOrder } from "@/lib/firestore";
import Step1Scope from "./Step1Scope";
import Step2Format from "./Step2Format";
import Step3Compose from "./Step3Compose";
import Step4Order from "./Step4Order";

type Props = {
  user: User;
  locations: LocationPhoto[];
  onClose: () => void;
};

type Step = 1 | 2 | 3 | 4 | "success";

const STEP_LABELS = ["escopo", "formato", "composição", "pedido"];

export default function PosterWizard({ user, locations, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [scope, setScope] = useState<PosterScope | null>(null);
  const [format, setFormat] = useState<PosterFormat>("portrait_40x60");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(locations.map((l) => l.id)),
  );
  const [featuredId, setFeaturedId] = useState<string>(locations[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string>("");

  const bbox = scope ? scopeToBbox(scope) : ([-180, -85, 180, 85] as [number, number, number, number]);

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

  async function handleOrderSubmit(
    customerName: string,
    customerContact: string,
    contactType: "email" | "whatsapp",
  ) {
    if (!scope) return;
    setSubmitting(true);
    try {
      const items = locations
        .filter((l) => selectedIds.has(l.id))
        .map((l) => ({
          locationId: l.id,
          imageUrl: l.imageUrl,
          lat: l.lat,
          lng: l.lng,
          description: l.description,
          isFeatured: l.id === featuredId,
        }));

      const id = await savePosterOrder({
        userId: user.uid,
        userEmail: user.email,
        scope,
        format,
        items,
        featuredLocationId: featuredId,
        customerName,
        customerContact,
        contactType,
        status: "pending",
        createdAt: Date.now(),
      });
      setOrderId(id);

      // Notify owner (fire and forget — order is already saved)
      fetch("/api/notify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: { userId: user.uid, userEmail: user.email, scope, format, items, customerName, customerContact, contactType, status: "pending", createdAt: Date.now() }, orderId: id }),
      }).catch(() => {/* already saved to firestore, notification is best-effort */});

      setStep("success");
    } finally {
      setSubmitting(false);
    }
  }

  const currentStepNum = step === "success" ? 4 : (step as number);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(42,31,20,0.55)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", padding: "16px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ background: "var(--paper-50)", border: "1px solid var(--paper-300)", borderRadius: "var(--radius-md)", boxShadow: "0 24px 80px rgba(42,31,20,0.28), 0 4px 16px rgba(42,31,20,0.14)", width: "100%", maxWidth: 680, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* Header */}
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid var(--paper-200, #ede5d4)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--ink-900)" }}>
              Criar Poster
            </div>
            {step !== "success" && (
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
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
            )}
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
            <Step1Scope
              onNext={(s) => {
                setScope(s);
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <Step2Format
              value={format}
              onChange={setFormat}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <Step3Compose
              locations={locations}
              bbox={bbox}
              format={format}
              selectedIds={selectedIds}
              featuredId={featuredId}
              onToggle={handleToggle}
              onSetFeatured={handleSetFeatured}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <Step4Order
              onSubmit={handleOrderSubmit}
              onBack={() => setStep(3)}
              submitting={submitting}
            />
          )}

          {step === "success" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0", textAlign: "center" }}>
              <div style={{ fontSize: 48 }}>🖼️</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink-900)" }}>
                Pedido confirmado!
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-600)", maxWidth: 380, lineHeight: 1.65 }}>
                Recebemos seu pedido. Em breve entraremos em contato pelo canal informado para combinar os detalhes e a entrega.
              </p>
              {orderId && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "var(--ink-400)", background: "var(--paper-100)", padding: "6px 12px", borderRadius: "var(--radius-sm)" }}>
                  pedido #{orderId.slice(0, 8).toUpperCase()}
                </div>
              )}
              <button
                onClick={onClose}
                style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", padding: "10px 24px", background: "var(--ink-900)", color: "var(--paper-50)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
              >
                fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
