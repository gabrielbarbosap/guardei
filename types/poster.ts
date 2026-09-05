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
  | "a3_portrait"
  | "a3_landscape"
  | "a4_portrait"
  | "a4_landscape"
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

export type ShippingAddress = {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
};

/** Frete escolhido, congelado no pedido para conferência depois. */
export type ShippingChoice = {
  serviceId: string;
  name: string;
  carrier: string;
  /** centavos de BRL */
  priceCents: number;
  deliveryDays: number | null;
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
  shippingAddress?: ShippingAddress;
  shipping?: ShippingChoice;
  status: "pending_payment" | "paid" | "processing" | "shipped" | "done";
  /** Arte final enviada para impressao, gravada apos o pedido nascer. */
  posterImageUrl?: string;
  stripeSessionId?: string;
  amountPaid?: number;
  paidAt?: number;
  /** Quando os e-mails de confirmação saíram; trava o reenvio do webhook. */
  notifiedAt?: number;
  /** Quando o pôster foi postado, e por onde acompanhar. */
  shippedAt?: number;
  trackingCode?: string;
  trackingUrl?: string;
  /** Trava o reenvio do aviso de postagem. */
  shipNotifiedAt?: number;
  /** Trava o reenvio do aviso de pedido registrado. */
  createdNotifiedAt?: number;
  createdAt: number;
};
