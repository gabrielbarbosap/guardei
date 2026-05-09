import type { LocationPhoto } from "@/types/location";
import { geoToPixelFromCenter } from "./posterMap";

export type PlacedPolaroid = {
  location: LocationPhoto;
  pinX: number;   // posição geográfica real (não muda)
  pinY: number;
  cardX: number;  // posição do card (usuário pode arrastar)
  cardY: number;
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
  centerLon: number,
  centerLat: number,
  zoom: number,
  canvasW: number,
  canvasH: number,
  apiW: number,
  apiH: number,
): PlacedPolaroid[] {
  const count = Math.max(1, locations.length);
  const baseRatio = Math.min(0.13, 0.38 / Math.sqrt(count));
  const BASE_SIZE = Math.max(60, canvasW * baseRatio);
  const FEATURED_SIZE = Math.max(90, BASE_SIZE * 1.65);

  // Coloca cada foto na sua posição geográfica real
  const placed: PlacedPolaroid[] = locations.map((loc) => {
    const { x, y } = geoToPixelFromCenter(
      loc.lat, loc.lng,
      centerLon, centerLat, zoom,
      canvasW, canvasH, apiW, apiH,
    );
    const isFeatured = loc.id === featuredId;
    return {
      location: loc,
      pinX: x, pinY: y,
      cardX: x, cardY: y,
      size: isFeatured ? FEATURED_SIZE : BASE_SIZE,
      rotation: seededFloat(loc.id) * 14 - 7,
      isFeatured,
    };
  });

  // Resolve sobreposições reduzindo o tamanho dos cards menos prioritários
  // (não move os pins — apenas encolhe)
  resolveOverlapSizes(placed, BASE_SIZE);

  // Ordem de renderização: mais acima no mapa = atrás; destaque = sempre na frente
  return [
    ...placed.filter((p) => !p.isFeatured).sort((a, b) => a.pinY - b.pinY),
    ...placed.filter((p) => p.isFeatured),
  ];
}

function resolveOverlapSizes(placed: PlacedPolaroid[], minSize: number) {
  const MIN = minSize * 0.45;
  // Itera algumas vezes para convergir
  for (let iter = 0; iter < 4; iter++) {
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const dx = b.pinX - a.pinX;
        const dy = b.pinY - a.pinY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const overlap = (a.size + b.size) * 0.5 - dist;
        if (overlap <= 0) continue;

        // Shrink the lower-priority one (featured never shrinks)
        if (!b.isFeatured && b.size > MIN) {
          placed[j] = { ...b, size: Math.max(MIN, b.size - overlap * 0.6) };
        } else if (!a.isFeatured && a.size > MIN) {
          placed[i] = { ...a, size: Math.max(MIN, a.size - overlap * 0.6) };
        }
      }
    }
  }
}
