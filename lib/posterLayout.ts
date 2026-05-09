import type { LocationPhoto } from "@/types/location";
import { geoToPixel } from "./posterMap";

export type PlacedPolaroid = {
  location: LocationPhoto;
  x: number;
  y: number;
  size: number;
  rotation: number;
  isFeatured: boolean;
};

function seededFloat(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  }
  return (h >>> 0) / 0xffffffff;
}

export function layoutPolaroids(
  locations: LocationPhoto[],
  featuredId: string,
  bbox: [number, number, number, number],
  canvasW: number,
  canvasH: number,
): PlacedPolaroid[] {
  const BASE_SIZE = Math.max(60, canvasW * 0.106);
  const FEATURED_SIZE = Math.max(90, canvasW * 0.163);

  let placed: PlacedPolaroid[] = locations.map((loc) => {
    const { x, y } = geoToPixel(loc.lat, loc.lng, bbox, canvasW, canvasH);
    const isFeatured = loc.id === featuredId;
    return {
      location: loc,
      x, y,
      size: isFeatured ? FEATURED_SIZE : BASE_SIZE,
      rotation: seededFloat(loc.id) * 16 - 8,
      isFeatured,
    };
  });

  // Repulsion: featured is an anchor (doesn't move)
  for (let iter = 0; iter < 30; iter++) {
    let moved = false;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const minDist = (a.size + b.size) / 2 * 1.2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist > 0.5) {
          const push = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          if (!a.isFeatured) placed[i] = { ...a, x: a.x - nx * push, y: a.y - ny * push };
          if (!b.isFeatured) placed[j] = { ...b, x: b.x + nx * push, y: b.y + ny * push };
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  // Clamp to canvas bounds with margin
  const margin = BASE_SIZE * 0.7;
  placed = placed.map((p) => ({
    ...p,
    x: Math.max(margin, Math.min(canvasW - margin, p.x)),
    y: Math.max(margin, Math.min(canvasH - margin, p.y)),
  }));

  // Featured renders last (on top)
  return [...placed.filter((p) => !p.isFeatured), ...placed.filter((p) => p.isFeatured)];
}
