import type { LocationPhoto } from "@/types/location";
import { buildMapBackgroundUrl } from "./posterMap";
import { layoutPolaroids } from "./posterLayout";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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

export async function renderPosterCanvas(
  canvas: HTMLCanvasElement,
  locations: LocationPhoto[],
  bbox: [number, number, number, number],
  featuredId: string,
): Promise<void> {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const SCALE = W / 1600;

  await document.fonts.ready;

  // ── 1. Map background ────────────────────────────────────────────────────
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
  try {
    const mapUrl = buildMapBackgroundUrl(bbox, W, H, token);
    const mapImg = await loadImage(mapUrl);
    ctx.drawImage(mapImg, 0, 0, W, H);
  } catch {
    ctx.fillStyle = "#0f1117";
    ctx.fillRect(0, 0, W, H);
  }

  // Vignette overlay
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
  vignette.addColorStop(0, "rgba(10,8,5,0.05)");
  vignette.addColorStop(1, "rgba(10,8,5,0.62)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // ── 2. Layout & render polaroids ─────────────────────────────────────────
  const placed = layoutPolaroids(locations, featuredId, bbox, W, H);

  const photoImgs = await Promise.all(
    placed.map(async (p) => {
      try { return await loadImage(p.location.imageUrl); }
      catch { return null; }
    }),
  );

  for (let i = 0; i < placed.length; i++) {
    const p = placed[i];
    const img = photoImgs[i];

    const s = p.size;                       // polaroid width
    const photoH = s * 0.78;               // photo area height (near-square)
    const capH = s * 0.22;                 // caption area height
    const padTop = 10 * SCALE;
    const pH = padTop + photoH + capH;     // total card height
    const pinLen = 14 * SCALE;             // line from card bottom to geo point

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);

    // Pin tail (behind card)
    ctx.beginPath();
    ctx.moveTo(0, -(pinLen));
    ctx.lineTo(0, 0);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1.5 * SCALE;
    ctx.stroke();

    // Geo dot at exact location
    ctx.beginPath();
    ctx.arc(0, 0, 3.5 * SCALE, 0, Math.PI * 2);
    ctx.fillStyle = p.isFeatured ? "rgba(244,196,48,0.95)" : "rgba(80,220,235,0.9)";
    ctx.fill();

    // Card shadow
    ctx.shadowColor = "rgba(0,0,0,0.52)";
    ctx.shadowBlur = 18 * SCALE;
    ctx.shadowOffsetY = 7 * SCALE;

    // Card background — bottom edge sits at -pinLen (above the pin)
    const cardTop = -(pinLen + pH);
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
      if (imgAspect > boxAspect) {
        sw = ih * boxAspect;
        sx = (iw - sw) / 2;
      } else {
        sh = iw / boxAspect;
        sy = (ih - sh) / 2;
      }
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

    // Caption
    const desc = p.location.description ?? "";
    const capText = desc.length > 28 ? desc.slice(0, 28) + "…" : desc;
    ctx.fillStyle = "#6b4f36";
    ctx.font = `italic ${Math.max(9, Math.round(11 * SCALE))}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.fillText(capText, 0, cardTop + padTop + photoH + capH * 0.55);

    ctx.restore();
  }

  // ── 3. Branding ──────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(250,246,236,0.42)";
  ctx.font = `${Math.round(11 * SCALE)}px 'Courier New', monospace`;
  ctx.textAlign = "center";
  ctx.fillText("guardei.art  ·  suas memórias no mapa", W / 2, H - 14 * SCALE);
}
