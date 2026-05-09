import type { ContinentKey, PosterFormat, PosterScope } from "@/types/poster";

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

export const FORMAT_DIMS: Record<PosterFormat, { w: number; h: number; label: string; physical: string }> = {
  portrait_40x60: { w: 1600, h: 2400, label: "Retrato", physical: "40 × 60 cm" },
  square_50x50: { w: 2000, h: 2000, label: "Quadrado", physical: "50 × 50 cm" },
  landscape_60x40: { w: 2400, h: 1600, label: "Paisagem", physical: "60 × 40 cm" },
  a3: { w: 1587, h: 2245, label: "A3", physical: "29.7 × 42 cm" },
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

export function geoToPixel(
  lat: number,
  lng: number,
  bbox: [number, number, number, number],
  canvasW: number,
  canvasH: number,
): { x: number; y: number } {
  const [west, , east, north] = bbox;
  const south = bbox[1];

  const x = ((lng - west) / (east - west)) * canvasW;

  const northRad = latToMercatorY(Math.min(north, 85));
  const southRad = latToMercatorY(Math.max(south, -85));
  const pointRad = latToMercatorY(lat);
  const y = ((northRad - pointRad) / (northRad - southRad)) * canvasH;

  return { x, y };
}

export function buildMapBackgroundUrl(
  bbox: [number, number, number, number],
  canvasW: number,
  canvasH: number,
  token: string,
): string {
  const { lon, lat, zoom } = bboxToMapboxParams(bbox, canvasW, canvasH);

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

export function scopeToBbox(scope: PosterScope): [number, number, number, number] {
  if (scope.type === "world") return [-180, -85, 180, 85];
  if (scope.type === "continent") return CONTINENT_BBOXES[scope.continent];
  return scope.bbox;
}
