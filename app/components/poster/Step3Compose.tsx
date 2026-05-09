"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationPhoto } from "@/types/location";
import type { PosterFormat } from "@/types/poster";
import { FORMAT_DIMS } from "@/lib/posterMap";
import { computePosterLayout, renderMapBackground } from "@/lib/posterCanvas";
import type { PlacedPolaroid } from "@/lib/posterLayout";

type Props = {
  locations: LocationPhoto[];
  format: PosterFormat;
  selectedIds: Set<string>;
  featuredId: string;
  onToggle: (id: string) => void;
  onSetFeatured: (id: string) => void;
  onNext: (layout: PlacedPolaroid[]) => void;
  onBack: () => void;
};

const PREVIEW_W = 560;

export default function Step3Compose({
  locations,
  format,
  selectedIds,
  featuredId,
  onToggle,
  onSetFeatured,
  onNext,
  onBack,
}: Props) {
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingMap, setLoadingMap] = useState(false);
  const [layout, setLayout] = useState<PlacedPolaroid[]>([]);
  const mapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dims = FORMAT_DIMS[format];
  const previewH = Math.round(PREVIEW_W * (dims.h / dims.w));
  const selected = locations.filter((l) => selectedIds.has(l.id));

  // ── Compute initial layout whenever selection changes ─────────────────────
  useEffect(() => {
    if (selected.length === 0) { setLayout([]); return; }
    const next = computePosterLayout(selected, featuredId, PREVIEW_W, previewH);
    setLayout(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, featuredId, format]);

  // ── Render map background whenever layout changes ─────────────────────────
  useEffect(() => {
    if (selected.length === 0) return;
    if (mapTimer.current) clearTimeout(mapTimer.current);
    mapTimer.current = setTimeout(async () => {
      const canvas = mapCanvasRef.current;
      if (!canvas) return;
      canvas.width = PREVIEW_W;
      canvas.height = previewH;
      setLoadingMap(true);
      try {
        await renderMapBackground(canvas, selected);
      } finally {
        setLoadingMap(false);
      }
    }, 500);
    return () => { if (mapTimer.current) clearTimeout(mapTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, format]);

  // ── Drag handler ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = layout.find((p) => p.location.id === id);
    if (!orig) return;

    const onMove = (me: MouseEvent) => {
      setLayout((prev) =>
        prev.map((p) =>
          p.location.id === id
            ? { ...p, cardX: orig.cardX + (me.clientX - startX), cardY: orig.cardY + (me.clientY - startY) }
            : p
        )
      );
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [layout]);

  // ── Resize handler (bottom-right corner) ─────────────────────────────────
  const handleResizeStart = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const orig = layout.find((p) => p.location.id === id);
    if (!orig) return;
    const MIN = 40, MAX = PREVIEW_W * 0.55;

    const onMove = (me: MouseEvent) => {
      const delta = me.clientX - startX;
      setLayout((prev) =>
        prev.map((p) =>
          p.location.id === id
            ? { ...p, size: Math.max(MIN, Math.min(MAX, orig.size + delta)) }
            : p
        )
      );
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [layout]);

  const selectedCount = selectedIds.size;

  return (
    <div style={{ display: "flex", gap: 16, flexDirection: "column" }}>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-600)", margin: 0 }}>
        Selecione as fotos. <strong>Arraste</strong> para reposicionar, <strong>canto inferior direito</strong> para redimensionar.
      </p>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

        {/* Photo grid — coluna lateral */}
        <div style={{ flex: "0 0 180px", minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-500)", marginBottom: 8 }}>
            {selectedCount} foto{selectedCount !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5, maxHeight: previewH, overflowY: "auto" }}>
            {locations.map((loc) => {
              const isSel = selectedIds.has(loc.id);
              const isFeat = featuredId === loc.id;
              return (
                <div
                  key={loc.id}
                  style={{ position: "relative", aspectRatio: "1", borderRadius: 4, overflow: "hidden", cursor: "pointer", border: `2px solid ${isFeat ? "rgba(184,134,11,0.9)" : isSel ? "rgba(80,220,235,0.6)" : "transparent"}`, opacity: isSel ? 1 : 0.38, transition: "all 0.15s" }}
                  onClick={() => onToggle(loc.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={loc.imageUrl} alt={loc.description} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {isSel && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onSetFeatured(loc.id); }}
                      style={{ position: "absolute", top: 3, right: 3, background: isFeat ? "rgba(184,134,11,0.9)" : "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
                    >★</button>
                  )}
                  <div style={{ position: "absolute", bottom: 3, left: 3, width: 14, height: 14, borderRadius: 2, background: isSel ? "rgba(80,220,235,0.85)" : "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isSel && <span style={{ fontSize: 9, color: "#000", fontWeight: "bold" }}>✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive preview — ocupa o restante */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-500)" }}>
            prévia interativa
          </div>

          <div
            ref={containerRef}
            style={{ position: "relative", width: PREVIEW_W, height: previewH, background: "#0f1117", borderRadius: 4, overflow: "hidden", userSelect: "none" }}
          >
            {/* Map background canvas */}
            <canvas
              ref={mapCanvasRef}
              style={{ display: "block", width: "100%", height: "100%", position: "absolute", inset: 0 }}
            />

            {/* Loading overlay */}
            {loadingMap && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,17,23,0.6)", zIndex: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(250,246,236,0.6)", letterSpacing: "0.08em" }}>carregando mapa…</span>
              </div>
            )}

            {selectedCount === 0 && !loadingMap && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(250,246,236,0.4)", letterSpacing: "0.1em" }}>selecione fotos</span>
              </div>
            )}

            {/* Pin dots */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }}>
              {layout.map((p) => {
                const s = p.size;
                const ph = s * 0.78 + s * 0.22 + 10;
                const cardAbove = p.cardY > ph + 20;
                const STEM = 16;
                const rotRad = (p.rotation * Math.PI) / 180;
                const localEdgeY = cardAbove ? -STEM : STEM;
                const edgeX = p.cardX - localEdgeY * Math.sin(rotRad);
                const edgeY = p.cardY + localEdgeY * Math.cos(rotRad);
                return (
                  <g key={p.location.id}>
                    <line
                      x1={p.pinX} y1={p.pinY}
                      x2={edgeX} y2={edgeY}
                      stroke="rgba(255,255,255,0.3)" strokeWidth="1"
                    />
                    <circle
                      cx={p.pinX} cy={p.pinY} r={p.isFeatured ? 4 : 3}
                      fill={p.isFeatured ? "rgba(244,196,48,0.95)" : "rgba(80,220,235,0.9)"}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Polaroid cards (interactive) */}
            {layout.map((p) => {
              const s = p.size;
              const photoH = s * 0.78;
              const desc = p.location.description ?? "";
              // Estimativa de linhas: ~26 chars por linha na largura do card
              const charsPerLine = Math.max(8, Math.round((s - 18) / (s * 0.072 * 0.58)));
              const estLines = desc ? Math.ceil(desc.length / charsPerLine) : 0;
              const capH = estLines > 0 ? estLines * s * 0.1 + 8 : 14;
              const ph = photoH + capH + 10;
              const cardAbove = p.cardY > ph + 20;
              const cardTop = cardAbove ? p.cardY - ph - 16 : p.cardY + 16;

              return (
                <div
                  key={p.location.id}
                  onMouseDown={(e) => handleDragStart(p.location.id, e)}
                  style={{
                    position: "absolute",
                    left: p.cardX - s / 2,
                    top: cardTop,
                    width: s,
                    height: "auto",
                    minHeight: ph,
                    transform: `rotate(${p.rotation}deg)`,
                    transformOrigin: `${s / 2}px ${cardAbove ? "100%" : "0"}`,
                    cursor: "grab",
                    zIndex: p.isFeatured ? 20 : 10,
                    background: "#faf6ec",
                    borderRadius: 3,
                    boxShadow: p.isFeatured
                      ? "0 4px 16px rgba(0,0,0,0.5), 0 0 0 2px rgba(244,196,48,0.6)"
                      : "0 4px 12px rgba(0,0,0,0.45)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Tape */}
                  <div style={{ position: "absolute", top: -5, left: "50%", transform: "translateX(-50%) rotate(2deg)", width: 32, height: 10, background: "rgba(244,196,48,0.5)", borderRadius: 2, zIndex: 2 }} />

                  {/* Photo */}
                  <div style={{ flex: `0 0 ${photoH}px`, overflow: "hidden", margin: "8px 6px 2px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.location.imageUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: 2 }}
                      draggable={false}
                    />
                  </div>

                  {/* Caption — sem limite, card cresce para acomodar */}
                  {desc && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2px 5px" }}>
                      <span style={{
                        fontFamily: "Georgia, serif",
                        fontStyle: "italic",
                        fontSize: Math.max(6, s * 0.072),
                        color: "#6b4f36",
                        textAlign: "center",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        lineHeight: 1.28,
                        maxWidth: "100%",
                      }}>
                        {desc}
                      </span>
                    </div>
                  )}

                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => handleResizeStart(p.location.id, e)}
                    style={{ position: "absolute", bottom: 2, right: 2, width: 12, height: 12, cursor: "se-resize", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8">
                      <path d="M1 7L7 1M4 7L7 4M7 7" stroke="rgba(107,79,54,0.5)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              );
            })}
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
          onClick={() => onNext(layout)}
          disabled={selectedCount === 0}
          style={{ flex: 2, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", padding: "10px 18px", background: selectedCount === 0 ? "var(--paper-300)" : "var(--ink-900)", color: selectedCount === 0 ? "var(--ink-500)" : "var(--paper-50)", border: "none", borderRadius: "var(--radius-sm)", cursor: selectedCount === 0 ? "not-allowed" : "pointer" }}
        >
          próximo →
        </button>
      </div>
    </div>
  );
}
