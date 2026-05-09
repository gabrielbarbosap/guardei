import type { LocationPhoto } from "@/types/location";
import { buildMapBackgroundUrl, bboxToMapboxParams, computeApiDims, computePhotoBbox, getVisitedCountryCodes } from "./posterMap";
import { layoutPolaroids, type PlacedPolaroid } from "./posterLayout";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Quebra texto em linhas sem limite de altura (card cresce para acomodar)
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  fontSize: number,
): string[] {
  ctx.font = `italic ${fontSize}px Georgia, serif`;
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width <= maxW) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      // palavra maior que a linha: parte na força
      if (ctx.measureText(word).width > maxW) {
        let part = "";
        for (const ch of word) {
          if (ctx.measureText(part + ch).width <= maxW) { part += ch; }
          else { lines.push(part); part = ch; }
        }
        cur = part;
      } else {
        cur = word;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Calcula bbox automático + parâmetros de câmera para um conjunto de fotos
export function buildPosterParams(
  locations: LocationPhoto[],
  canvasW: number,
  canvasH: number,
) {
  const lats = locations.map((l) => l.lat);
  const lngs = locations.map((l) => l.lng);
  const bbox = computePhotoBbox(lats, lngs, canvasW, canvasH);
  const { apiW, apiH } = computeApiDims(canvasW, canvasH);
  const { lon: centerLon, lat: centerLat, zoom } = bboxToMapboxParams(bbox, apiW, apiH);
  return { bbox, apiW, apiH, centerLon, centerLat, zoom };
}

// Computa o layout inicial (posições geográficas reais) para um conjunto de fotos
export function computePosterLayout(
  locations: LocationPhoto[],
  featuredId: string,
  canvasW: number,
  canvasH: number,
): PlacedPolaroid[] {
  const { apiW, apiH, centerLon, centerLat, zoom } = buildPosterParams(locations, canvasW, canvasH);
  return layoutPolaroids(locations, featuredId, centerLon, centerLat, zoom, canvasW, canvasH, apiW, apiH);
}

// Renderiza o fundo do mapa com GL: oceano escuro + países visitados em dourado
export async function renderMapBackground(
  canvas: HTMLCanvasElement,
  locations: LocationPhoto[],
): Promise<void> {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
  const { bbox, apiW, apiH, centerLon, centerLat, zoom } = buildPosterParams(locations, W, H);

  // Reverse geocoding para saber quais países têm fotos
  const visitedCodes = await getVisitedCountryCodes(locations, token);

  // Tenta renderizar com Mapbox GL (oceano escuro + países dourados)
  let rendered = false;
  try {
    await renderWithGL(canvas, centerLon, centerLat, zoom, apiW, apiH, visitedCodes, token);
    rendered = true;
  } catch (err) {
    console.warn("[poster] GL render falhou, usando static API:", err);
  }

  // Fallback: static API sem customização
  if (!rendered) {
    try {
      const url = buildMapBackgroundUrl(bbox, W, H, token);
      const img = await loadImage(url);
      ctx.drawImage(img, 0, 0, W, H);
    } catch {
      ctx.fillStyle = "#0f1117";
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Vignette sobre qualquer mapa
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
  vignette.addColorStop(0, "rgba(10,8,5,0.05)");
  vignette.addColorStop(1, "rgba(10,8,5,0.65)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

async function renderWithGL(
  targetCanvas: HTMLCanvasElement,
  lon: number,
  lat: number,
  zoom: number,
  apiW: number,
  apiH: number,
  visitedCodes: string[],
  token: string,
): Promise<void> {
  const mapboxgl = (await import("mapbox-gl")).default;
  (mapboxgl as unknown as { accessToken: string }).accessToken = token;

  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "fixed",
    left: "-99999px",
    top: "0",
    width: `${apiW}px`,
    height: `${apiH}px`,
    visibility: "hidden",
  });
  document.body.appendChild(container);

  await new Promise<void>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new (mapboxgl as any).Map({
      container,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [lon, lat],
      zoom,
      pitch: 0,
      bearing: 0,
      preserveDrawingBuffer: true,
      interactive: false,
      attributionControl: false,
    });

    const cleanup = () => {
      try { map.remove(); } catch { /* ignore */ }
      container.remove();
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("mapbox GL timeout"));
    }, 20000);

    map.once("load", () => {
      try {
        // Escurece camadas de água
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const layer of (map.getStyle().layers as any[])) {
          if (layer.type === "fill" && /water/.test(layer.id)) {
            try { map.setPaintProperty(layer.id, "fill-color", "#020408"); } catch { /* skip */ }
          }
        }

        // Países visitados: fill dourado + borda dourada
        if (visitedCodes.length > 0) {
          map.addSource("visited-countries", {
            type: "vector",
            url: "mapbox://mapbox.country-boundaries-v1",
          });
          map.addLayer({
            id: "visited-fill",
            type: "fill",
            source: "visited-countries",
            "source-layer": "country_boundaries",
            filter: ["match", ["get", "iso_3166_1"], visitedCodes, true, false],
            paint: {
              "fill-color": "rgba(184,134,11,0.20)",
              "fill-opacity": 1,
            },
          });
          map.addLayer({
            id: "visited-border",
            type: "line",
            source: "visited-countries",
            "source-layer": "country_boundaries",
            filter: ["match", ["get", "iso_3166_1"], visitedCodes, true, false],
            paint: {
              "line-color": "rgba(244,196,48,0.80)",
              "line-width": ["interpolate", ["linear"], ["zoom"], 2, 1, 6, 2],
            },
          });
        }
      } catch (err) {
        clearTimeout(timer);
        cleanup();
        reject(err);
        return;
      }

      // Aguarda todos os tiles renderizarem
      map.once("idle", () => {
        clearTimeout(timer);
        try {
          const glCanvas = map.getCanvas() as HTMLCanvasElement;
          const W = targetCanvas.width;
          const H = targetCanvas.height;
          targetCanvas.getContext("2d")!.drawImage(glCanvas, 0, 0, W, H);
          cleanup();
          resolve();
        } catch (err) {
          cleanup();
          reject(err);
        }
      });
    });

    map.on("error", (e: { error: Error }) => {
      clearTimeout(timer);
      cleanup();
      reject(e?.error ?? new Error("mapbox GL error"));
    });
  });
}

// Renderiza os polaroids em um canvas (sem mapa — assume mapa já desenhado)
async function renderPolaroids(
  canvas: HTMLCanvasElement,
  placed: PlacedPolaroid[],
) {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const SCALE = W / 1600;

  const photoImgs = await Promise.all(
    placed.map(async (p) => {
      try { return await loadImage(p.location.imageUrl); }
      catch { return null; }
    }),
  );

  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    const img = photoImgs[i];
    const s = p.size;
    const photoH = s * 0.78;
    const padTop = 10 * SCALE;
    const capAreaW = s - 18 * SCALE;
    const capFs = Math.max(9, Math.round(11 * SCALE));
    const PIN_LEN = 16 * SCALE;
    const rotRad = (p.rotation * Math.PI) / 180;

    // Pré-computa a legenda para saber a altura real do card (sem limite)
    const desc = p.location.description ?? "";
    const captionLines = desc ? wrapText(ctx, desc, capAreaW, capFs) : [];
    const capH = captionLines.length > 0
      ? captionLines.length * capFs * 1.28 + 8 * SCALE
      : 14 * SCALE;
    const pH = padTop + photoH + capH;

    // Decide se card vai acima ou abaixo do ponto âncora
    const cardAbove = p.cardY > pH + PIN_LEN + 10 * SCALE;

    // Borda do card (em coords locais relativas ao âncora):
    // cardAbove → borda inferior = (0, -PIN_LEN)
    // !cardAbove → borda superior = (0, +PIN_LEN)
    // Após rotação do card: ponto local (0, localY) → absoluto (cardX - localY·sin, cardY + localY·cos)
    const localEdgeY = cardAbove ? -PIN_LEN : PIN_LEN;
    const edgeX = p.cardX - localEdgeY * Math.sin(rotRad);
    const edgeY = p.cardY + localEdgeY * Math.cos(rotRad);

    // Linha do ponto geográfico até a borda exata do card (sem ultrapassar)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p.pinX, p.pinY);
    ctx.lineTo(edgeX, edgeY);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5 * SCALE;
    ctx.stroke();

    // Geo dot
    ctx.beginPath();
    ctx.arc(p.pinX, p.pinY, 3.5 * SCALE, 0, Math.PI * 2);
    ctx.fillStyle = p.isFeatured ? "rgba(244,196,48,0.95)" : "rgba(80,220,235,0.9)";
    ctx.fill();
    ctx.restore();

    // Card
    ctx.save();
    ctx.translate(p.cardX, p.cardY);
    ctx.rotate(rotRad);
    const cardTop = cardAbove
      ? -(PIN_LEN + pH)
      : PIN_LEN;

    // Shadow
    ctx.shadowColor = "rgba(0,0,0,0.52)";
    ctx.shadowBlur = 18 * SCALE;
    ctx.shadowOffsetY = 7 * SCALE;

    ctx.fillStyle = "#faf6ec";
    roundRect(ctx, -s / 2, cardTop, s, pH, 3 * SCALE);
    ctx.fill();

    if (p.isFeatured) {
      ctx.strokeStyle = "rgba(244,196,48,0.65)";
      ctx.lineWidth = 2 * SCALE;
      roundRect(ctx, -s / 2, cardTop, s, pH, 3 * SCALE);
      ctx.stroke();
    }
    ctx.shadowColor = "transparent";

    // Photo
    if (img) {
      ctx.save();
      const photoX = -s / 2 + 8 * SCALE;
      const photoY = cardTop + padTop;
      const photoW = s - 16 * SCALE;
      const photoDrawH = photoH - 4 * SCALE;
      roundRect(ctx, photoX, photoY, photoW, photoDrawH, 2 * SCALE);
      ctx.clip();
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const boxAspect = photoW / photoDrawH;
      const imgAspect = iw / ih;
      let sx = 0, sy = 0, sw = iw, sh = ih;
      if (imgAspect > boxAspect) { sw = ih * boxAspect; sx = (iw - sw) / 2; }
      else { sh = iw / boxAspect; sy = (ih - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, photoX, photoY, photoW, photoDrawH);
      ctx.restore();
    }

    // Tape strip
    ctx.save();
    ctx.rotate(0.04);
    ctx.fillStyle = "rgba(244,196,48,0.48)";
    roundRect(ctx, -24 * SCALE, cardTop - 7 * SCALE, 48 * SCALE, 13 * SCALE, 2);
    ctx.fill();
    ctx.restore();

    // Caption — texto completo, card cresce para acomodar
    if (captionLines.length > 0) {
      ctx.fillStyle = "#6b4f36";
      ctx.font = `italic ${capFs}px Georgia, serif`;
      ctx.textAlign = "center";
      const lh = capFs * 1.28;
      const totalH = captionLines.length * lh;
      const startY = cardTop + padTop + photoH + (capH - totalH) / 2 + capFs;
      captionLines.forEach((line, i) => ctx.fillText(line, 0, startY + i * lh));
    }

    ctx.restore();
  }
}

// Renderiza poster completo a partir de um layout já computado (com posições ajustadas pelo usuário)
export async function renderPosterFromLayout(
  canvas: HTMLCanvasElement,
  placed: PlacedPolaroid[],
  locations: LocationPhoto[],
): Promise<void> {
  await document.fonts.ready;
  await renderMapBackground(canvas, locations);
  await renderPolaroids(canvas, placed);

  const W = canvas.width;
  const H = canvas.height;
  const SCALE = W / 1600;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(250,246,236,0.42)";
  ctx.font = `${Math.round(11 * SCALE)}px 'Courier New', monospace`;
  ctx.textAlign = "center";
  ctx.fillText("guardei.art  ·  suas memórias no mapa", W / 2, H - 14 * SCALE);
}

// API de compatibilidade (usada pelo PosterWizard para renderização final)
export async function renderPosterCanvas(
  canvas: HTMLCanvasElement,
  locations: LocationPhoto[],
  _bboxHint: [number, number, number, number],
  featuredId: string,
  precomputedLayout?: PlacedPolaroid[],
): Promise<void> {
  await document.fonts.ready;
  const W = canvas.width;
  const H = canvas.height;

  let placed: PlacedPolaroid[];
  if (precomputedLayout) {
    // Escala o layout da prévia para o canvas final
    const previewW = precomputedLayout[0] ? Math.max(...precomputedLayout.map(p => Math.max(p.pinX, p.cardX))) * 1.1 : W;
    const scaleX = W / previewW;
    const scaleY = H / (previewW * (H / W));
    placed = precomputedLayout.map((p) => ({
      ...p,
      pinX: p.pinX * scaleX,
      pinY: p.pinY * scaleY,
      cardX: p.cardX * scaleX,
      cardY: p.cardY * scaleY,
      size: p.size * scaleX,
    }));
  } else {
    placed = computePosterLayout(locations, featuredId, W, H);
  }

  await renderPosterFromLayout(canvas, placed, locations);
}
