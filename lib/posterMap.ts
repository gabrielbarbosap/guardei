import type { ContinentKey, PosterFormat, PosterScope } from "@/types/poster";
import type { LocationPhoto } from "@/types/location";

export const CONTINENT_BBOXES: Record<ContinentKey, [number, number, number, number]> = {
  south_america: [-82, -56, -34, 13],
  north_america: [-170, 14, -52, 72],
  europe: [-25, 34, 45, 72],
  africa: [-20, -36, 55, 38],
  asia: [25, -12, 180, 78],
  oceania: [110, -48, 180, -8],
};

export const CONTINENT_LABELS: Record<ContinentKey, string> = {
  south_america: "América do Sul",
  north_america: "América do Norte",
  europe: "Europa",
  africa: "África",
  asia: "Ásia",
  oceania: "Oceania",
};

export const FORMAT_DIMS: Record<PosterFormat, { w: number; h: number; label: string; physical: string; size: string }> = {
  // A3 — 29,7 × 42 cm (150 DPI)
  a3_portrait:  { w: 1754, h: 2480, label: "A3 Retrato",  physical: "29,7 × 42 cm", size: "A3" },
  a3_landscape: { w: 2480, h: 1754, label: "A3 Paisagem", physical: "42 × 29,7 cm", size: "A3" },
  // A4 — 21 × 29,7 cm (150 DPI)
  a4_portrait:  { w: 1240, h: 1754, label: "A4 Retrato",  physical: "21 × 29,7 cm", size: "A4" },
  a4_landscape: { w: 1754, h: 1240, label: "A4 Paisagem", physical: "29,7 × 21 cm", size: "A4" },
  // Produto interno — visível apenas para gabriel@sistemap.com.br
  test:         { w:  874, h: 1240, label: "Teste Interno", physical: "teste", size: "TEST" },
};

/**
 * Formatos que nao estao mais a venda.
 *
 * O A2 saiu do catalogo quando virou A3, mas os pedidos ja feitos continuam
 * gravados com ele no banco. Sem este mapa o painel mostraria "a2_portrait"
 * cru para quem comprou antes da mudanca.
 */
export const LEGACY_FORMAT_LABELS: Record<string, string> = {
  a2_portrait: "A2 Retrato (descontinuado)",
  a2_landscape: "A2 Paisagem (descontinuado)",
  a5_portrait: "A5 Retrato (descontinuado)",
  a5_landscape: "A5 Paisagem (descontinuado)",
};

function latToMercatorY(lat: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

export function bboxToMapboxParams(
  bbox: [number, number, number, number],
  canvasW: number,
  canvasH: number,
): { lon: number; lat: number; zoom: number } {
  const [west, south, east, north] = bbox;
  const lon = (west + east) / 2;
  const lat = (north + south) / 2;

  const TILE_SIZE = 512;
  const northRad = latToMercatorY(Math.min(north, 85));
  const southRad = latToMercatorY(Math.max(south, -85));
  const latFraction = (northRad - southRad) / Math.PI;
  const lngFraction = (east - west) / 360;

  const latZoom = Math.log2(canvasH / TILE_SIZE / latFraction);
  const lngZoom = Math.log2(canvasW / TILE_SIZE / lngFraction);
  const zoom = Math.min(latZoom, lngZoom) - 0.3;

  return { lon, lat, zoom: Math.max(0, Math.min(zoom, 18)) };
}

function lngToWorldX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * 512 * Math.pow(2, zoom);
}

function latToWorldY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  const sinLat = Math.sin(latRad);
  return (1 - Math.log((1 + sinLat) / (1 - sinLat)) / (2 * Math.PI)) / 2 * 512 * Math.pow(2, zoom);
}

export function computeApiDims(canvasW: number, canvasH: number): { apiW: number; apiH: number } {
  const maxApiSize = 1280;
  const aspect = canvasW / canvasH;
  let apiW: number, apiH: number;
  if (aspect >= 1) {
    apiW = maxApiSize;
    apiH = Math.min(maxApiSize, Math.round(maxApiSize / aspect));
  } else {
    apiH = maxApiSize;
    apiW = Math.min(maxApiSize, Math.round(maxApiSize * aspect));
  }
  return { apiW, apiH };
}

// Converte lat/lng para pixel usando o mesmo sistema de coordenadas do Mapbox Static Images
export function geoToPixelFromCenter(
  lat: number,
  lng: number,
  centerLon: number,
  centerLat: number,
  zoom: number,
  canvasW: number,
  canvasH: number,
  apiW: number,
  apiH: number,
): { x: number; y: number } {
  const worldX = lngToWorldX(lng, zoom);
  const worldY = latToWorldY(lat, zoom);
  const centerWorldX = lngToWorldX(centerLon, zoom);
  const centerWorldY = latToWorldY(centerLat, zoom);

  return {
    x: canvasW / 2 + (worldX - centerWorldX) * (canvasW / apiW),
    y: canvasH / 2 + (worldY - centerWorldY) * (canvasH / apiH),
  };
}

export function buildMapBackgroundUrl(
  bbox: [number, number, number, number],
  canvasW: number,
  canvasH: number,
  token: string,
): string {
  const { apiW, apiH } = computeApiDims(canvasW, canvasH);
  const { lon, lat, zoom } = bboxToMapboxParams(bbox, apiW, apiH);

  return (
    `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/` +
    `${lon.toFixed(4)},${lat.toFixed(4)},${zoom.toFixed(2)},0/${apiW}x${apiH}@2x` +
    `?access_token=${token}`
  );
}

export async function getCountryBbox(
  countryName: string,
  token: string,
): Promise<{ bbox: [number, number, number, number]; countryCode: string } | null> {
  const encoded = encodeURIComponent(countryName);
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
    `?types=country&limit=1&access_token=${token}`;
  try {
    const res = await fetch(url);
    const data = await res.json() as { features?: Array<{ bbox?: number[]; properties?: { short_code?: string } }> };
    const feature = data.features?.[0];
    if (!feature?.bbox) return null;
    const bbox = feature.bbox as [number, number, number, number];
    const countryCode = (feature.properties?.short_code ?? "").toUpperCase();
    return { bbox, countryCode };
  } catch {
    return null;
  }
}

// Reverse geocoding: retorna os ISO-2 únicos dos países onde as fotos foram tiradas
export async function getVisitedCountryCodes(
  locations: LocationPhoto[],
  token: string,
): Promise<string[]> {
  const results = await Promise.all(
    locations.map(async (loc) => {
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
          `${loc.lng.toFixed(4)},${loc.lat.toFixed(4)}.json` +
          `?types=country&access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json() as { features?: Array<{ properties?: { short_code?: string } }> };
        return (data.features?.[0]?.properties?.short_code ?? "").toUpperCase() || null;
      } catch {
        return null;
      }
    }),
  );
  return [...new Set(results.filter((c): c is string => !!c))];
}

export function scopeToBbox(scope: PosterScope): [number, number, number, number] {
  if (scope.type === "world") return [-180, -85, 180, 85];
  if (scope.type === "continent") return CONTINENT_BBOXES[scope.continent];
  return scope.bbox;
}

// Calcula bbox automático a partir das coordenadas das fotos, ajustado ao aspect ratio do canvas
export function computePhotoBbox(
  lats: number[],
  lngs: number[],
  canvasW: number,
  canvasH: number,
): [number, number, number, number] {
  if (lats.length === 0) return [-180, -85, 180, 85];

  let west = Math.min(...lngs);
  let east = Math.max(...lngs);
  let south = Math.min(...lats);
  let north = Math.max(...lats);

  // Garante span mínimo para ponto único ou fotos muito próximas
  const latSpan = Math.max(north - south, 0.8);
  const lngSpan = Math.max(east - west, 0.8);
  const centerLat2 = (north + south) / 2;
  const centerLng2 = (west + east) / 2;
  north = centerLat2 + latSpan / 2;
  south = centerLat2 - latSpan / 2;
  east = centerLng2 + lngSpan / 2;
  west = centerLng2 - lngSpan / 2;

  // Padding de 40% para dar contexto geográfico ao redor das fotos
  const padLat = latSpan * 0.4;
  const padLng = lngSpan * 0.4;
  north += padLat;
  south -= padLat;
  east += padLng;
  west -= padLng;

  // Ajusta para o aspect ratio do canvas (expansão na dimensão mais curta)
  const canvasAspect = canvasW / canvasH;
  const bboxLngSpan = east - west;
  const bboxLatSpan = north - south;
  const bboxAspect = bboxLngSpan / Math.max(bboxLatSpan, 0.01);

  if (canvasAspect > bboxAspect) {
    const targetLng = bboxLatSpan * canvasAspect;
    const extra = (targetLng - bboxLngSpan) / 2;
    west -= extra;
    east += extra;
  } else {
    const targetLat = bboxLngSpan / canvasAspect;
    const extra = (targetLat - bboxLatSpan) / 2;
    south -= extra;
    north += extra;
  }

  return [
    Math.max(-179.9, west),
    Math.max(-85, south),
    Math.min(179.9, east),
    Math.min(85, north),
  ];
}
