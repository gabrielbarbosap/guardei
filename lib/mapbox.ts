type ReverseGeocodeResponse = {
  features?: Array<{
    properties?: {
      short_code?: string;
    };
  }>;
};

export async function getCountryCodeFromCoordinates(lat: number, lng: number) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return undefined;

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?types=country&limit=1&access_token=${token}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;

    const data = (await response.json()) as ReverseGeocodeResponse;
    const shortCode = data.features?.[0]?.properties?.short_code;
    if (!shortCode) return undefined;

    return shortCode.toUpperCase();
  } catch {
    return undefined;
  }
}
