export type ContinentKey =
  | "south_america"
  | "north_america"
  | "europe"
  | "africa"
  | "asia"
  | "oceania";

export type PosterScope =
  | { type: "world" }
  | { type: "continent"; continent: ContinentKey; label: string }
  | { type: "country"; countryCode: string; countryName: string; bbox: [number, number, number, number] };

export type PosterFormat = "portrait_40x60" | "square_50x50" | "landscape_60x40" | "a3";

export type PosterOrderItem = {
  locationId: string;
  imageUrl: string;
  lat: number;
  lng: number;
  description: string;
  isFeatured: boolean;
};

export type PosterOrder = {
  id?: string;
  userId: string;
  userEmail: string | null;
  scope: PosterScope;
  format: PosterFormat;
  items: PosterOrderItem[];
  featuredLocationId: string;
  customerName: string;
  customerContact: string;
  contactType: "email" | "whatsapp";
  status: "pending" | "processing" | "done";
  createdAt: number;
};
