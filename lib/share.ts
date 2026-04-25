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

// next/font obfuscates family names — read the resolved font-family for a CSS var
function resolveFontFamily(cssVar: string, fallback: string): string {
  const el = document.createElement("span");
  el.style.fontFamily = `var(${cssVar}), ${fallback}`;
  el.style.position = "absolute";
  el.style.visibility = "hidden";
  document.body.appendChild(el);
  const family = getComputedStyle(el).fontFamily;
  document.body.removeChild(el);
  return family || fallback;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function renderPolaroidBlob(location: LocationPhoto): Promise<Blob> {
  await document.fonts.ready;

  const W = 520;
  const PAD = 38;
  const PHOTO_SIZE = W - PAD * 2;
  const DESC_FONT_SIZE = 28;
  const DESC_LINE_HEIGHT = 36;
  const DESC_GAP = 36;
  const MEMORY_GAP = 22;
  const MEMORY_FONT_SIZE = 11;
  const BOTTOM_PAD = 58;

  const descFont = resolveFontFamily("--font-over-the-rainbow", "cursive");
  const memoryFont = resolveFontFamily("--font-cinzel-decorative", "serif");

  const tmp = document.createElement("canvas").getContext("2d")!;
  tmp.font = `${DESC_FONT_SIZE}px ${descFont}`;
  const lines = wrapText(tmp, location.description || "", PHOTO_SIZE);
  const descHeight = lines.length * DESC_LINE_HEIGHT;

  const H = PAD + PHOTO_SIZE + DESC_GAP + descHeight + MEMORY_GAP + MEMORY_FONT_SIZE + BOTTOM_PAD;

  const DPR = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);

  // White polaroid background + soft shadow feel (slight off-white at edges)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Photo (cover-crop to square)
  const img = await loadImage(location.imageUrl);
  const aspect = img.width / img.height;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (aspect > 1) {
    sw = img.height;
    sx = (img.width - sw) / 2;
  } else if (aspect < 1) {
    sh = img.width;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, PAD, PAD, PHOTO_SIZE, PHOTO_SIZE);

  // Description
  ctx.fillStyle = "#525252";
  ctx.font = `${DESC_FONT_SIZE}px ${descFont}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, PAD + PHOTO_SIZE + DESC_GAP + i * DESC_LINE_HEIGHT);
  });

  // MEMORY label (spaced letters, like the modal)
  ctx.fillStyle = "#a3a3a3";
  ctx.font = `${MEMORY_FONT_SIZE}px ${memoryFont}`;
  ctx.fillText(
    "M  E  M  O  R  Y",
    W / 2,
    PAD + PHOTO_SIZE + DESC_GAP + descHeight + MEMORY_GAP,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas toBlob failed"))),
      "image/png",
    );
  });
}

export async function sharePolaroid(location: LocationPhoto): Promise<void> {
  const blob = await renderPolaroidBlob(location);
  const file = new File([blob], `memory-${location.id}.png`, { type: "image/png" });

  // Mobile: native share sheet (includes WhatsApp)
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: location.description });
      return;
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }
  }

  // Desktop fallback: download the polaroid and open WhatsApp Web with the description
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `memory-${location.id}.png`;
  link.click();
  URL.revokeObjectURL(url);

  const text = encodeURIComponent(
    `${location.description}\n\n(arraste a imagem baixada para o chat)`,
  );
  window.open(`https://wa.me/?text=${text}`, "_blank");
}
