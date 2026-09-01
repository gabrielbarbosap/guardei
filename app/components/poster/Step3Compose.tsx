"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Star, Minus, Plus, TriangleAlert } from "lucide-react";
import type { LocationPhoto } from "@/types/location";
import type { PosterFormat } from "@/types/poster";
import { FORMAT_DIMS } from "@/lib/posterMap";
import { computePosterLayout, renderMapBackground } from "@/lib/posterCanvas";
import type { PlacedPolaroid } from "@/lib/posterLayout";
import { PREVIEW_W, previewHeightFor } from "@/lib/posterPreview";
import { POSTER_MAX_PHOTOS } from "@/lib/posterRules";

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

type CardOverride = Partial<Pick<PlacedPolaroid, "cardX" | "cardY" | "size">>;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/** Altura do card: foto + legenda, que cresce com o texto. */
function cardHeightFor(size: number, description: string): number {
  const photoH = size * 0.78;
  const charsPerLine = Math.max(8, Math.round((size - 18) / (size * 0.072 * 0.58)));
  const lines = description ? Math.ceil(description.length / charsPerLine) : 0;
  const captionH = lines > 0 ? lines * size * 0.1 + 8 : 14;
  return photoH + captionH + 10;
}

/**
 * Quanto o card se estende para cada lado de `cardX` depois de girado.
 *
 * O card gira em torno do topo ou da base (não do centro), então a extensão é
 * assimétrica: um dos lados avança mais que o outro conforme o sinal do ângulo.
 * Medir pelos quatro cantos evita que um canto fique de fora do pôster — no
 * papel isso sai cortado.
 */
function rotatedExtents(
  card: PlacedPolaroid,
  cardAbove: boolean,
): { left: number; right: number } {
  const theta = card.rotation * (Math.PI / 180);
  const s = card.size;
  const h = cardHeightFor(s, card.location.description ?? "");
  const originY = cardAbove ? h : 0; // origem da rotação em coordenadas locais
  const xs = [
    [-s / 2, -originY],
    [s / 2, -originY],
    [-s / 2, h - originY],
    [s / 2, h - originY],
  ].map(([x, y]) => x * Math.cos(theta) - y * Math.sin(theta));
  return { left: -Math.min(...xs), right: Math.max(...xs) };
}

const MIN_SIZE = 40;
const MAX_SIZE = PREVIEW_W * 0.55;
/** Movimento (em px de tela) abaixo do qual o gesto conta como toque, não arrasto. */
const TAP_SLOP = 5;
/** Respiro na borda do pôster, absorvendo arredondamento de sub-pixel. */
const EDGE_MARGIN = 6;

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
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const mapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gesture = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origin: PlacedPolaroid;
    moved: boolean;
  } | null>(null);

  const [loadingMap, setLoadingMap] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stageW, setStageW] = useState<number | null>(null);
  /* Ajustes manuais por foto. Ficam separados do layout calculado (que é
     determinístico) para que marcar ou desmarcar uma foto recalcule o arranjo
     sem jogar fora o que a pessoa já posicionou. */
  const [overrides, setOverrides] = useState<Record<string, CardOverride>>({});

  const dims = FORMAT_DIMS[format];
  const previewH = previewHeightFor(dims.w, dims.h);
  const selected = locations.filter((l) => selectedIds.has(l.id));
  const selectedCount = selectedIds.size;

  const layout: PlacedPolaroid[] =
    selected.length === 0
      ? []
      : computePosterLayout(selected, featuredId, PREVIEW_W, previewH).map((p) => {
          const o = overrides[p.location.id];
          return o ? { ...p, ...o } : p;
        });

  /* A prévia é exibida na largura que couber; o layout segue em unidades
     lógicas de PREVIEW_W e só o desenho é escalado. */
  const scale = stageW ? Math.min(1, stageW / PREVIEW_W) : 1;

  /* Mede na montagem (ref callback) e a cada mudança de tamanho (observer).
     A medida na montagem importa: sem ela a primeira pintura sairia sem escala. */
  function attachStage(el: HTMLDivElement | null) {
    stageWrapRef.current = el;
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    if (w > 0) setStageW((prev) => (prev === w ? prev : w));
  }

  useEffect(() => {
    const el = stageWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setStageW((prev) => (prev === w ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Fundo do mapa ─────────────────────────────────────────────────────────
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

  /* ── Gestos: um só caminho para mouse e toque ──────────────────────────── */
  function beginGesture(
    id: string,
    mode: "move" | "resize",
    e: React.PointerEvent,
  ) {
    e.preventDefault();
    e.stopPropagation();
    const origin = layout.find((p) => p.location.id === id);
    if (!origin) return;
    gesture.current = { id, mode, startX: e.clientX, startY: e.clientY, origin, moved: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* sem captura o arrasto ainda funciona enquanto o dedo estiver sobre o card */
    }
    setActiveId(id);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    // px de tela → unidades lógicas
    const dx = (e.clientX - g.startX) / scale;
    const dy = (e.clientY - g.startY) / scale;
    if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > TAP_SLOP) g.moved = true;

    const nextCardY = clamp(g.origin.cardY + dy, 0, previewH);
    const cardAbove = nextCardY > cardHeightFor(g.origin.size, g.origin.location.description ?? "") + 20;
    const span = rotatedExtents(g.origin, cardAbove);

    const patch: CardOverride =
      g.mode === "resize"
        ? { size: clamp(g.origin.size + dx, MIN_SIZE, MAX_SIZE) }
        : {
            /* Mantém o card inteiro dentro do pôster. O limite considera a
               metade da largura porque o card é desenhado centrado em cardX —
               travar só o centro deixaria metade dele para fora, e no papel
               isso sai cortado. Na vertical o card já vira para cima ou para
               baixo conforme a posição, então basta manter a âncora no pôster. */
            cardX: clamp(g.origin.cardX + dx, span.left + EDGE_MARGIN, PREVIEW_W - span.right - EDGE_MARGIN),
            cardY: nextCardY,
          };
    setOverrides((prev) => ({ ...prev, [g.id]: { ...prev[g.id], ...patch } }));
  }

  function endGesture() {
    gesture.current = null;
  }

  const activeCard = layout.find((p) => p.location.id === activeId) ?? null;

  function setSizeExact(value: number) {
    if (!activeId) return;
    const size = clamp(value, MIN_SIZE, MAX_SIZE);
    setOverrides((prev) => ({ ...prev, [activeId]: { ...prev[activeId], size } }));
  }

  function changeSize(delta: number) {
    if (!activeCard) return;
    setSizeExact(activeCard.size + delta);
  }

  return (
    <div className="compose">
      <p className="compose-hint">
        Escolha as fotos e <strong>arraste</strong> cada polaroid para posicionar.
        Toque em uma para ajustar o tamanho.
      </p>

      <div className="compose-body">
        {/* ── Fotos ── */}
        <div className="compose-picker">
          <div className="compose-label">
            {selectedCount} de {locations.length} foto{locations.length !== 1 ? "s" : ""}
          </div>
          <div className="compose-thumbs">
            {locations.map((loc) => {
              const isSel = selectedIds.has(loc.id);
              const isFeat = featuredId === loc.id;
              return (
                <div
                  key={loc.id}
                  className={`thumb${isSel ? " is-selected" : ""}${isFeat ? " is-featured" : ""}`}
                  onClick={() => onToggle(loc.id)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSel}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(loc.id); } }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={loc.imageUrl} alt={loc.description} />
                  <span className="thumb-check">{isSel && <Check size={12} strokeWidth={3} />}</span>
                  {isSel && (
                    <button
                      className="thumb-star"
                      onClick={(e) => { e.stopPropagation(); onSetFeatured(loc.id); }}
                      aria-label={isFeat ? "Foto em destaque" : "Destacar esta foto"}
                      title="Destacar"
                    >
                      <Star size={12} strokeWidth={2} fill={isFeat ? "currentColor" : "none"} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Prévia ── */}
        <div className="compose-preview">
          <div className="compose-label">prévia interativa</div>

          <div
            ref={attachStage}
            className="compose-stage-wrap"
            style={{ aspectRatio: `${PREVIEW_W} / ${previewH}` }}
            onPointerDown={() => setActiveId(null)}
          >
            <div
              className="compose-stage"
              style={{
                width: PREVIEW_W,
                height: previewH,
                transform: `scale(${scale})`,
                transformOrigin: "0 0",
              }}
            >
              <canvas ref={mapCanvasRef} className="compose-map" />

              {loadingMap && (
                <div className="compose-overlay"><span>carregando mapa…</span></div>
              )}
              {selectedCount === 0 && !loadingMap && (
                <div className="compose-overlay"><span>selecione fotos</span></div>
              )}

              {/* linhas ligando o pin ao card */}
              <svg className="compose-threads">
                {layout.map((p) => {
                  const ph = cardHeightFor(p.size, p.location.description ?? "");
                  const cardAbove = p.cardY > ph + 20;
                  const STEM = 16;
                  const rotRad = (p.rotation * Math.PI) / 180;
                  const localEdgeY = cardAbove ? -STEM : STEM;
                  return (
                    <g key={p.location.id}>
                      <line
                        x1={p.pinX} y1={p.pinY}
                        x2={p.cardX - localEdgeY * Math.sin(rotRad)}
                        y2={p.cardY + localEdgeY * Math.cos(rotRad)}
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

              {layout.map((p) => {
                const s = p.size;
                const photoH = s * 0.78;
                const desc = p.location.description ?? "";
                const ph = cardHeightFor(s, desc);
                const cardAbove = p.cardY > ph + 20;
                const isActive = p.location.id === activeId;

                return (
                  <div
                    key={p.location.id}
                    className={`compose-card${isActive ? " is-active" : ""}${p.isFeatured ? " is-featured" : ""}`}
                    onPointerDown={(e) => beginGesture(p.location.id, "move", e)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endGesture}
                    onPointerCancel={endGesture}
                    style={{
                      left: p.cardX - s / 2,
                      top: cardAbove ? p.cardY - ph - 16 : p.cardY + 16,
                      width: s,
                      minHeight: ph,
                      transform: `rotate(${p.rotation}deg)`,
                      transformOrigin: `${s / 2}px ${cardAbove ? "100%" : "0"}`,
                      zIndex: isActive ? 30 : p.isFeatured ? 20 : 10,
                    }}
                  >
                    <div className="cc-tape" />
                    <div className="cc-photo" style={{ flex: `0 0 ${photoH}px` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.location.imageUrl} alt="" draggable={false} />
                    </div>
                    {desc && (
                      <div className="cc-caption">
                        <span style={{ fontSize: Math.max(6, s * 0.072) }}>{desc}</span>
                      </div>
                    )}
                    <div
                      className="cc-resize"
                      onPointerDown={(e) => beginGesture(p.location.id, "resize", e)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={endGesture}
                      onPointerCancel={endGesture}
                      aria-hidden
                    >
                      <svg width="9" height="9" viewBox="0 0 8 8">
                        <path d="M1 7L7 1M4 7L7 4M7 7" stroke="rgba(107,79,54,0.65)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <span className="compose-dims">{dims.physical}</span>
        </div>
      </div>

      {/* ── Controle de tamanho: alternativa ao canto de 12px, que é impossível no toque ── */}
      {activeCard && (
        <div className="compose-toolbar">
          <div className="ct-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={activeCard.location.imageUrl} alt="" />
          </div>
          <button className="ct-step" onClick={() => changeSize(-12)} aria-label="Diminuir">
            <Minus size={15} strokeWidth={2} />
          </button>
          <input
            className="ct-range"
            type="range"
            min={MIN_SIZE}
            max={Math.round(MAX_SIZE)}
            value={Math.round(activeCard.size)}
            onChange={(e) => setSizeExact(Number(e.target.value))}
            aria-label="Tamanho da polaroid"
          />
          <button className="ct-step" onClick={() => changeSize(12)} aria-label="Aumentar">
            <Plus size={15} strokeWidth={2} />
          </button>
          <button className="ct-done" onClick={() => setActiveId(null)}>ok</button>
        </div>
      )}

      {selectedCount > POSTER_MAX_PHOTOS && (
        <div className="compose-warn" role="status">
          <TriangleAlert size={15} strokeWidth={1.8} />
          <span>
            <strong>{selectedCount} fotos selecionadas.</strong> Acima de {POSTER_MAX_PHOTOS} as
            polaroids encolhem e começam a cobrir o mapa. Dá para seguir assim — o pôster só
            fica mais bonito com até {POSTER_MAX_PHOTOS}.
          </span>
        </div>
      )}

      <div className="compose-actions">
        <button className="compose-back" onClick={onBack}>← voltar</button>
        <button
          className="compose-next"
          onClick={() => onNext(layout)}
          disabled={selectedCount === 0}
        >
          próximo →
        </button>
      </div>
    </div>
  );
}
