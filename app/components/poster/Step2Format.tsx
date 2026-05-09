"use client";

import { useState } from "react";
import Image from "next/image";
import type { PosterFormat } from "@/types/poster";
import { FORMAT_DIMS } from "@/lib/posterMap";
import { POSTER_PRICES, formatPrice } from "@/lib/posterPricing";

type Props = {
  value: PosterFormat;
  onChange: (f: PosterFormat) => void;
  onNext: () => void;
  onBack: () => void;
};

// Agrupa formatos por tamanho de papel
const GROUPS: { size: string; formats: PosterFormat[] }[] = [
  { size: "A2", formats: ["a2_portrait", "a2_landscape"] },
  // { size: "A3", formats: ["a3_portrait", "a3_landscape"] },
  // { size: "A4", formats: ["a4_landscape"] },
  { size: "A5", formats: ["a5_portrait", "a5_landscape"] },
];

const ORIENTATION_ICON: Record<string, string> = {
  a2_portrait:  "▯",
  a2_landscape: "▭",
  a3_portrait:  "▯",
  a3_landscape: "▭",
  a4_landscape: "▭",
  a5_portrait:  "▯",
  a5_landscape: "▭",
};

const EXAMPLES = [
  { label: "Retrato", img: "/photos/poster-retrato.png", aspect: "2/3" },
  { label: "Paisagem", img: "/photos/poster-paisagem.jpg", aspect: "3/2" },
];

export default function Step2Format({ value, onChange, onNext, onBack }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-600)", margin: 0 }}>
        Escolha o tamanho e orientação do poster para impressão.
      </p>

      {/* Exemplos reais */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-400)", marginBottom: 10 }}>
          exemplos reais
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {EXAMPLES.map(({ label, img, aspect }) => (
            <button
              key={label}
              onClick={() => setLightbox(img)}
              style={{
                padding: 0,
                border: "1px solid var(--paper-300)",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
                cursor: "zoom-in",
                background: "none",
                position: "relative",
                aspectRatio: aspect,
              }}
            >
              <Image
                src={img}
                alt={`Exemplo poster ${label}`}
                fill
                style={{ objectFit: "cover" }}
              />
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                padding: "16px 10px 8px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#fff",
                textAlign: "left",
              }}>
                {label}
              </div>
            </button>
          ))}
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--ink-400)", margin: "6px 0 0", textAlign: "center" }}>
          clique para ampliar
        </p>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24, cursor: "zoom-out",
          }}
        >
          <img
            src={lightbox}
            alt="Exemplo poster ampliado"
            style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 4, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}
          />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {GROUPS.map(({ size, formats }) => (
          <div key={size}>
            {/* Rótulo do grupo */}
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-400)", marginBottom: 8 }}>
              {size}
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
                    {/* Miniatura proporcional */}
                    <div
                      style={{
                        width: previewW,
                        height: previewH,
                        background: isSelected ? "rgba(184,134,11,0.22)" : "var(--paper-300)",
                        border: `1px solid ${isSelected ? "rgba(184,134,11,0.5)" : "var(--paper-400)"}`,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 10, opacity: 0.5, color: isSelected ? "#b8860b" : "var(--ink-500)" }}>
                        {ORIENTATION_ICON[key]}
                      </span>
                    </div>

                    {/* Textos */}
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em", color: isSelected ? "#b8860b" : "var(--ink-700)", textTransform: "uppercase", fontWeight: isSelected ? 600 : 400 }}>
                        {info.label}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: isSelected ? "#b8860b" : "var(--ink-400)", marginTop: 3, opacity: 0.85 }}>
                        {info.physical}
                      </div>
                      <div style={{
                        marginTop: 8,
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: 700,
                        color: isSelected ? "#b8860b" : "var(--ink-800)",
                        letterSpacing: "0.02em",
                      }}>
                        {formatPrice(POSTER_PRICES[key])}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: isSelected ? "rgba(184,134,11,0.7)" : "var(--ink-400)", marginTop: 2, letterSpacing: "0.08em" }}>
                        + frete
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={onBack}
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
