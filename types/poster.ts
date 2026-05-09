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

export type PosterFormat =
  | "a2_portrait"
  | "a2_landscape"
  // | "a3_portrait"
  // | "a3_landscape"
  // | "a4_landscape"
  | "a5_portrait"
  | "a5_landscape"
  | "test";

export type PosterOrderItem = {
  locationId: string;
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
  status: "pending_payment" | "paid" | "processing" | "done";
  stripeSessionId?: string;
  amountPaid?: number;
  paidAt?: number;
  createdAt: number;
};
