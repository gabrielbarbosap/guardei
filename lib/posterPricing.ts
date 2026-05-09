import type { PosterFormat } from "@/types/poster";

// Preços em centavos de BRL (R$) — para exibição na UI
export const POSTER_PRICES: Record<PosterFormat, number> = {
  a2_portrait:  14990, // R$ 149,90
  a2_landscape: 14990, // R$ 149,90
  a5_portrait:   6990, // R$  69,90
  a5_landscape:  6990, // R$  69,90
};

// IDs de preço do Stripe (price_...)
export const STRIPE_PRICE_IDS: Record<PosterFormat, string> = {
  a2_portrait:  "price_1TVGuVHE2Cgz7JBOEYNCIvLM",
  a2_landscape: "price_1TVGuVHE2Cgz7JBOEYNCIvLM",
  a5_portrait:  "price_1TVGgFHE2Cgz7JBOhAxzhEyv",
  a5_landscape: "price_1TVGgFHE2Cgz7JBOhAxzhEyv",
};

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
