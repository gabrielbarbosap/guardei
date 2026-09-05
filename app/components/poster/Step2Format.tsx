"use client";

import { useState } from "react";
import Image from "next/image";
import { Truck } from "lucide-react";
import type { PosterFormat } from "@/types/poster";
import { FORMAT_DIMS } from "@/lib/posterMap";
import { POSTER_PRICES, formatPrice } from "@/lib/posterPricing";

const ADMIN_EMAIL = "gabriel@sistemap.com.br";

type Props = {
  value: PosterFormat;
  onChange: (f: PosterFormat) => void;
  onNext: () => void;
  onBack: () => void;
  userEmail?: string | null;
};

const GROUPS: { size: string; formats: PosterFormat[] }[] = [
  { size: "A3", formats: ["a3_portrait", "a3_landscape"] },
  { size: "A4", formats: ["a4_portrait", "a4_landscape"] },
];

const ORIENTATION_ICON: Record<string, string> = {
  a3_portrait:  "▯",
  a3_landscape: "▭",
  a4_portrait:  "▯",
  a4_landscape: "▭",
};

export default function Step2Format({ value, onChange, onNext, onBack, userEmail }: Props) {
  const isAdmin = userEmail === ADMIN_EMAIL;
  const [view, setView] = useState<"showcase" | "select">("showcase");
  const [lightbox, setLightbox] = useState<string | null>(null);

  /* ── SHOWCASE ── */
  if (view === "showcase") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>

        {/* Título */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink-900)", letterSpacing: "-0.02em" }}>
            Seu mapa de memórias
          </div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-500)", margin: "8px 0 0", lineHeight: 1.6 }}>
            Suas viagens viram um quadro emoldurado, impresso com as suas fotos de verdade.
          </p>
        </div>

        {/* Fotos lado a lado */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 12, width: "100%", maxWidth: 560 }}>

          {/* Retrato */}
          <button
            onClick={() => setLightbox("/photos/quadro-detalhe.jpg")}
            style={{ padding: 0, border: "none", background: "none", cursor: "zoom-in", borderRadius: 8, overflow: "hidden", position: "relative", aspectRatio: "2/3", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", transition: "transform 0.2s ease" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Image src="/photos/quadro-detalhe.jpg" alt="Quadro emoldurado do mapa de memórias, de perto" fill style={{ objectFit: "cover" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.65))", padding: "24px 12px 10px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>o quadro que chega na sua casa</div>
            </div>
          </button>

          {/* Paisagem */}
          <button
            onClick={() => setLightbox("/photos/poster-paisagem.jpg")}
            style={{ padding: 0, border: "none", background: "none", cursor: "zoom-in", borderRadius: 8, overflow: "hidden", position: "relative", aspectRatio: "3/2", alignSelf: "start", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", transition: "transform 0.2s ease" }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Image src="/photos/poster-paisagem.jpg" alt="Exemplo paisagem" fill style={{ objectFit: "cover" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.65))", padding: "24px 12px 10px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>também em paisagem</div>
            </div>
          </button>
        </div>

        <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-400)", margin: "10px 0 0" }}>
          clique para ampliar
        </p>
        <div className="fmt-ship-banner">
          <Truck size={15} strokeWidth={1.8} />
          <span><strong>frete grátis</strong> para todo o Brasil</span>
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: 10, marginTop: 28, width: "100%", maxWidth: 560 }}>
          <button
            onClick={onBack}
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", padding: "11px 20px", background: "none", color: "var(--ink-500)", border: "1px dashed var(--paper-400)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
          >
            ← voltar
          </button>
          <button
            onClick={() => setView("select")}
            style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", padding: "11px 20px", background: "var(--ink-900)", color: "var(--paper-50)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
          >
            criar o meu →
          </button>
        </div>

        {/* Lightbox */}
        {lightbox && (
          <div
            onClick={() => setLightbox(null)}
            style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out" }}
          >
            <img src={lightbox} alt="Exemplo ampliado" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 6, boxShadow: "0 8px 60px rgba(0,0,0,0.7)" }} />
          </div>
        )}
      </div>
    );
  }

  /* ── SELECT ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Chamada */}
      <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ink-900)", letterSpacing: "-0.02em" }}>
          Agora você vai fazer o seu ✨
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--ink-500)", margin: "6px 0 0" }}>
          Escolha o tamanho e a orientação do poster.
        </p>
      </div>

      {/* O que vai na caixa. Todo item aqui é verificável: a moldura é
          comprada, o frete é pago por nós e o arquivo é gerado em 300 DPI. */}
      <ul className="fmt-included">
        <li>quadro já emoldurado, pronto para pendurar</li>
        <li>impressão em 300 DPI, qualidade de gráfica</li>
        <li><strong>frete grátis para todo o Brasil</strong></li>
      </ul>

      {/* Cards de formato */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {GROUPS.map(({ size, formats }) => (
          <div key={size}>
            <div className="fmt-group-head">
              <span>{size}</span>
              {/* O A3 é o formato de maior margem e o que as pessoas mais
                  escolhem; sinalizar isso é orientação honesta, não pressão. */}
              {size === "A3" && <span className="fmt-badge">mais escolhido</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${formats.length}, 1fr)`, gap: 8 }}>
              {formats.map((key) => {
                const info = FORMAT_DIMS[key];
                const isSelected = value === key;
                const isPortrait = info.h > info.w;
                const maxPx = 44;
                const aspect = info.w / info.h;
                const previewW = isPortrait ? Math.round(maxPx * aspect) : maxPx;
                const previewH = isPortrait ? maxPx : Math.round(maxPx / aspect);

                return (
                  <button
                    key={key}
                    onClick={() => onChange(key)}
                    style={{
                      cursor: "pointer",
                      border: `1.5px solid ${isSelected ? "#b8860b" : "var(--paper-300)"}`,
                      borderRadius: "var(--radius-sm)",
                      background: isSelected ? "rgba(184,134,11,0.07)" : "var(--paper-50)",
                      padding: "14px 10px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ width: previewW, height: previewH, background: isSelected ? "rgba(184,134,11,0.22)" : "var(--paper-300)", border: `1px solid ${isSelected ? "rgba(184,134,11,0.5)" : "var(--paper-400)"}`, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, opacity: 0.5, color: isSelected ? "#b8860b" : "var(--ink-500)" }}>
                        {ORIENTATION_ICON[key]}
                      </span>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em", color: isSelected ? "#b8860b" : "var(--ink-700)", textTransform: "uppercase", fontWeight: isSelected ? 600 : 400 }}>
                        {info.label}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: isSelected ? "#b8860b" : "var(--ink-400)", marginTop: 3, opacity: 0.85 }}>
                        {info.physical}
                      </div>
                      <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: isSelected ? "#b8860b" : "var(--ink-800)", letterSpacing: "0.02em" }}>
                        {formatPrice(POSTER_PRICES[key])}
                      </div>
                      <div className="fmt-freeship">
                        frete grátis
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Card de teste — só para admin */}
      {isAdmin && (
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-400)", marginBottom: 8 }}>
            🔧 interno
          </div>
          <button
            onClick={() => onChange("test")}
            style={{
              width: "100%",
              cursor: "pointer",
              border: `1.5px dashed ${value === "test" ? "#b8860b" : "var(--paper-300)"}`,
              borderRadius: "var(--radius-sm)",
              background: value === "test" ? "rgba(184,134,11,0.07)" : "var(--paper-50)",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: value === "test" ? "#b8860b" : "var(--ink-500)", letterSpacing: "0.08em" }}>
              Produto de teste
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: value === "test" ? "#b8860b" : "var(--ink-700)" }}>
              {formatPrice(POSTER_PRICES["test"])}
            </span>
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={() => setView("showcase")}
          style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", padding: "10px", background: "none", color: "var(--ink-600)", border: "1px dashed var(--paper-400)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
        >
          ← voltar
        </button>
        <button
          onClick={onNext}
          style={{ flex: 2, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", padding: "10px 18px", background: "var(--ink-900)", color: "var(--paper-50)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
        >
          próximo →
        </button>
      </div>
    </div>
  );
}
