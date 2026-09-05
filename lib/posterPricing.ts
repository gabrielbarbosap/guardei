import type { PosterFormat } from "@/types/poster";

/*
 * Preços em centavos, para exibição — o que cobra de verdade é o Stripe.
 *
 * Os dois têm de bater: create-checkout compara este número com o do preço no
 * Stripe e recusa a venda se divergirem, porque a pessoa veria um total na tela
 * e pagaria outro no cartão.
 *
 * O frete não entra aqui: ele é grátis e sai do nosso bolso (ver FREE_SHIPPING).
 */
export const POSTER_PRICES: Record<PosterFormat, number> = {
  a3_portrait:  14900, // R$ 149,00
  a3_landscape: 14900, // R$ 149,00
  a4_portrait:   9900, // R$  99,00
  a4_landscape:  9900, // R$  99,00
  test:           100, // R$   1,00 — apenas para testes internos
};

// IDs de preço do Stripe (price_...)
export const STRIPE_PRICE_IDS: Record<PosterFormat, string> = {
  a3_portrait:  "price_1UCPhjHE2Cgz7JBOcd4ouzXs",
  a3_landscape: "price_1UCPhjHE2Cgz7JBOcd4ouzXs",
  a4_portrait:  "price_1UCPhRHE2Cgz7JBOMGIfLTqg",
  a4_landscape: "price_1UCPhRHE2Cgz7JBOMGIfLTqg",
  test:         "price_1TVIVOHE2Cgz7JBO6b9XDkMn",
};

/**
 * O frete vai por nossa conta.
 *
 * Não é generosidade: o PAC do quadro emoldurado custa o mesmo R$ 40,66 para
 * qualquer canto do país, então o valor é previsível e cabe no preço. Cobrando
 * à parte, quem mora perto pagaria R$ 13 e quem mora longe R$ 40 — e o segundo
 * abandonava a compra na última tela, que é onde o frete aparecia.
 *
 * A cotação continua existindo: precisamos saber quanto vamos pagar. Ela só
 * deixou de ser mostrada e cobrada.
 */
export const FREE_SHIPPING = true;

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
