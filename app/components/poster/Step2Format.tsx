"use client";

import type { PosterFormat } from "@/types/poster";
import { FORMAT_DIMS } from "@/lib/posterMap";

type Props = {
  value: PosterFormat;
  onChange: (f: PosterFormat) => void;
  onNext: () => void;
  onBack: () => void;
};

const FORMATS = Object.entries(FORMAT_DIMS) as [PosterFormat, (typeof FORMAT_DIMS)[PosterFormat]][];

export default function Step2Format({ value, onChange, onNext, onBack }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-600)", margin: 0 }}>
        Escolha o formato do poster para impressão.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {FORMATS.map(([key, info]) => {
          const isSelected = value === key;
          // visual proportional preview: normalize to max 60px
          const maxPx = 60;
          const aspect = info.w / info.h;
          const previewW = aspect >= 1 ? maxPx : Math.round(maxPx * aspect);
          const previewH = aspect >= 1 ? Math.round(maxPx / aspect) : maxPx;

          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              style={{
                cursor: "pointer",
                border: `1.5px solid ${isSelected ? "var(--accent-gold, #b8860b)" : "var(--paper-300)"}`,
                borderRadius: "var(--radius-sm)",
                background: isSelected ? "rgba(184,134,11,0.07)" : "var(--paper-50)",
                padding: "16px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                transition: "all 0.15s ease",
              }}
            >
              {/* Aspect ratio preview */}
              <div
                style={{
                  width: previewW,
                  height: previewH,
                  background: isSelected ? "rgba(184,134,11,0.25)" : "var(--paper-200, #e8e0d0)",
                  border: `1px solid ${isSelected ? "rgba(184,134,11,0.5)" : "var(--paper-400)"}`,
                  borderRadius: 2,
                }}
              />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.08em", color: isSelected ? "var(--accent-gold, #b8860b)" : "var(--ink-700)", textTransform: "uppercase" }}>
                  {info.label}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-500)", marginTop: 2 }}>
                  {info.physical}
                </div>
              </div>
            </button>
          );
        })}
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
