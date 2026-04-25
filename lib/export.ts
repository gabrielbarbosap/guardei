import type { LocationPhoto } from "@/types/location";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY;
}

export async function exportPolaroid(location: LocationPhoto): Promise<void> {
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // preload logo (used in polaroid stamp + bottom branding)
  let logoImg: HTMLImageElement | null = null;
  try { logoImg = await loadImage("/photos/logo.svg"); } catch { /* skip */ }

  // ── 1. Map background ──────────────────────────────────────────────────
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapUrl =
    `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/` +
    `${location.lng},${location.lat},11,0/540x675@2x` +
    `?access_token=${token}`;

  try {
    const mapImg = await loadImage(mapUrl);
    // draw slightly oversized so the Mapbox attribution row at the bottom is cropped out
    ctx.drawImage(mapImg, 0, -36, W, H + 36);
  } catch {
    ctx.fillStyle = "#1c1410";
    ctx.fillRect(0, 0, W, H);
  }

  // vignette overlay
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
  vignette.addColorStop(0, "rgba(20,14,8,0.25)");
  vignette.addColorStop(1, "rgba(20,14,8,0.72)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // ── 2. Polaroid card ───────────────────────────────────────────────────
  const pW = 660;
  const photoSize = pW - 32;
  const captionZone = 118;
  const pH = 16 + photoSize + captionZone;
  const pX = (W - pW) / 2;
  const pY = (H - pH) / 2 - 40;

  ctx.save();
  // slight tilt
  ctx.translate(W / 2, pY + pH / 2);
  ctx.rotate(-0.015);
  ctx.translate(-W / 2, -(pY + pH / 2));

  // drop shadow
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 64;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 28;
  ctx.fillStyle = "#faf6ec";
  roundRect(ctx, pX, pY, pW, pH, 4);
  ctx.fill();
  ctx.shadowColor = "transparent";

  // photo — cover crop to avoid distortion
  try {
    const photoImg = await loadImage(location.imageUrl);
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, pX + 16, pY + 16, photoSize, photoSize, 2);
    ctx.clip();

    const iw = photoImg.naturalWidth, ih = photoImg.naturalHeight;
    const imgAspect = iw / ih;
    let sx = 0, sy = 0, sw = iw, sh = ih;
    if (imgAspect > 1) {
      sw = ih;
      sx = (iw - sw) / 2;
    } else {
      sh = iw;
      sy = (ih - sh) / 2;
    }
    ctx.drawImage(photoImg, sx, sy, sw, sh, pX + 16, pY + 16, photoSize, photoSize);
    ctx.restore();
  } catch { /* skip if image fails */ }

  // tape strip
  ctx.save();
  ctx.translate(W / 2, pY - 10);
  ctx.rotate(0.025);
  ctx.fillStyle = "rgba(244,196,48,0.55)";
  roundRect(ctx, -40, -10, 80, 20, 2);
  ctx.fill();
  ctx.restore();

  // caption
  const capY = pY + 16 + photoSize + 36;
  ctx.fillStyle = "#5c4632";
  ctx.font = "italic 26px Georgia, serif";
  ctx.textAlign = "center";
  wrapText(ctx, location.description || "", W / 2, capY, pW - 56, 34);

  // logo stamp inside polaroid
  if (logoImg) {
    const stampSize = 46;
    ctx.globalAlpha = 0.42;
    ctx.drawImage(logoImg, W / 2 - stampSize / 2, pY + pH - stampSize - 8, stampSize, stampSize);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = "#b5a081";
    ctx.font = "11px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("G U A R D E I", W / 2, pY + pH - 18);
  }

  ctx.restore();

  // ── 3. Branding ─────────────────────────────────────────────────────────
  // logo + "guardei," side by side, centered
  const logoSize = 72;
  ctx.font = "italic 52px Georgia, serif";
  const textW = ctx.measureText("guardei,").width;
  const gap = 16;
  const groupW = logoSize + gap + textW;
  const groupX = W / 2 - groupW / 2;

  if (logoImg) {
    ctx.globalAlpha = 0.85;
    ctx.drawImage(logoImg, groupX, H - logoSize - 38, logoSize, logoSize);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = "rgba(250,246,236,0.90)";
  ctx.textAlign = "left";
  ctx.fillText("guardei,", groupX + logoSize + gap, H - 38 + logoSize / 2 + 18);

  ctx.fillStyle = "rgba(250,246,236,0.45)";
  ctx.font = "13px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("guardei.art  ·  suas memórias no mapa", W / 2, H - 14);

  // ── 4. Download ─────────────────────────────────────────────────────────
  const link = document.createElement("a");
  link.download = "guardei-memoria.jpg";
  link.href = canvas.toDataURL("image/jpeg", 0.93);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
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
