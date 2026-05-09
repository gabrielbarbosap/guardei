"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationPhoto } from "@/types/location";
import type { PosterFormat } from "@/types/poster";
import { FORMAT_DIMS } from "@/lib/posterMap";
import { renderPosterCanvas } from "@/lib/posterCanvas";

type Props = {
  locations: LocationPhoto[];
  bbox: [number, number, number, number];
  format: PosterFormat;
  selectedIds: Set<string>;
  featuredId: string;
  onToggle: (id: string) => void;
  onSetFeatured: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
};

const PREVIEW_W = 320;

export default function Step3Compose({
  locations,
  bbox,
  format,
  selectedIds,
  featuredId,
  onToggle,
  onSetFeatured,
  onNext,
  onBack,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(false);
  const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dims = FORMAT_DIMS[format];
  const previewH = Math.round(PREVIEW_W * (dims.h / dims.w));

  const triggerRender = useCallback(() => {
    if (renderTimer.current) clearTimeout(renderTimer.current);
    renderTimer.current = setTimeout(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = PREVIEW_W;
      canvas.height = previewH;

      const selected = locations.filter((l) => selectedIds.has(l.id));
      if (selected.length === 0) return;

      setRendering(true);
      try {
        await renderPosterCanvas(canvas, selected, bbox, featuredId);
      } finally {
        setRendering(false);
      }
    }, 600);
  }, [locations, selectedIds, featuredId, bbox, previewH]);

  useEffect(() => {
    triggerRender();
    return () => { if (renderTimer.current) clearTimeout(renderTimer.current); };
  }, [triggerRender]);

  const selectedCount = selectedIds.size;

  return (
    <div style={{ display: "flex", gap: 16, flexDirection: "column" }}>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-600)", margin: 0 }}>
        Selecione as fotos que aparecerão no poster. Marque uma como destaque ★ para deixá-la maior.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* Photo grid */}
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-500)", marginBottom: 8 }}>
            {selectedCount} foto{selectedCount !== 1 ? "s" : ""} selecionada{selectedCount !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: Math.min(320, previewH), overflowY: "auto" }}>
            {locations.map((loc) => {
              const isSelected = selectedIds.has(loc.id);
              const isFeatured = featuredId === loc.id;

              return (
                <div
                  key={loc.id}
                  style={{ position: "relative", aspectRatio: "1", borderRadius: 4, overflow: "hidden", cursor: "pointer", border: `2px solid ${isFeatured ? "rgba(184,134,11,0.9)" : isSelected ? "rgba(80,220,235,0.6)" : "transparent"}`, opacity: isSelected ? 1 : 0.4, transition: "all 0.15s ease" }}
                  onClick={() => onToggle(loc.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={loc.imageUrl}
                    alt={loc.description}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />

                  {/* Star button */}
                  {isSelected && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onSetFeatured(loc.id); }}
                      title="Definir como destaque"
                      style={{ position: "absolute", top: 3, right: 3, background: isFeatured ? "rgba(184,134,11,0.9)" : "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", lineHeight: 1 }}
                    >
                      ★
                    </button>
                  )}

                  {/* Checkbox */}
                  <div
                    style={{ position: "absolute", bottom: 3, left: 3, width: 14, height: 14, borderRadius: 2, background: isSelected ? "rgba(80,220,235,0.85)" : "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {isSelected && <span style={{ fontSize: 9, color: "#000", fontWeight: "bold" }}>✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Canvas preview */}
        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-500)" }}>
            prévia
          </div>
          <div style={{ position: "relative", width: PREVIEW_W, height: previewH, background: "#0f1117", borderRadius: 4, overflow: "hidden" }}>
            <canvas
              ref={canvasRef}
              style={{ display: "block", width: "100%", height: "100%" }}
            />
            {rendering && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,17,23,0.6)" }}>
                <span style={{ fontFamily: "var(--font-hand)", fontSize: 16, color: "rgba(250,246,236,0.7)" }}>
                  renderizando...
                </span>
              </div>
            )}
            {selectedCount === 0 && !rendering && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(250,246,236,0.4)", letterSpacing: "0.1em" }}>
                  selecione fotos
                </span>
              </div>
            )}
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-400)", letterSpacing: "0.08em" }}>
            {FORMAT_DIMS[format].physical}
          </span>
        </div>
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
          disabled={selectedCount === 0}
          style={{ flex: 2, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", padding: "10px 18px", background: selectedCount === 0 ? "var(--paper-300)" : "var(--ink-900)", color: selectedCount === 0 ? "var(--ink-500)" : "var(--paper-50)", border: "none", borderRadius: "var(--radius-sm)", cursor: selectedCount === 0 ? "not-allowed" : "pointer" }}
        >
          próximo →
        </button>
      </div>
    </div>
  );
}
