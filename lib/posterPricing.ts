import type { PosterFormat } from "@/types/poster";

// Preços em centavos de BRL (R$) — para exibição na UI
export const POSTER_PRICES: Record<PosterFormat, number> = {
  a3_portrait:   9990, // R$  99,90
  a3_landscape:  9990, // R$  99,90
  a4_portrait:   6000, // R$  60,00
  a4_landscape:  6000, // R$  60,00
  a5_portrait:   4890, // R$  48,90
  a5_landscape:  4890, // R$  48,90
  test:           100, // R$   1,00 — apenas para testes internos
};

// IDs de preço do Stripe (price_...)
export const STRIPE_PRICE_IDS: Record<PosterFormat, string> = {
  a3_portrait:  "price_1TVH7AHE2Cgz7JBOzAREKGzn",
  a3_landscape: "price_1TVH7AHE2Cgz7JBOzAREKGzn",
  a4_portrait:  "price_1UCNFdHE2Cgz7JBOF3YJv4JN",
  a4_landscape: "price_1UCNFdHE2Cgz7JBOF3YJv4JN",
  a5_portrait:  "price_1TVH7nHE2Cgz7JBOS9QCX1fc",
  a5_landscape: "price_1TVH7nHE2Cgz7JBOS9QCX1fc",
  test:         "price_1TVIVOHE2Cgz7JBO6b9XDkMn",
};

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
