import type { FreightOption, FreightProvider, FreightQuoteInput } from "./types";

/**
 * Frete simulado, só para desenvolvimento.
 *
 * Existe para dar para rodar o fluxo de compra inteiro na máquina sem cadastro
 * no agregador. NUNCA é usado em produção: quem escolhe o provedor (quote.ts)
 * só cai aqui quando NODE_ENV !== "production" E não há token configurado.
 *
 * Os nomes saem marcados como "simulado" de propósito — preço de mentira não
 * pode se passar por preço real na tela.
 */
export const devStub: FreightProvider = {
  id: "dev_stub",

  async quote(input: FreightQuoteInput): Promise<FreightOption[]> {
    // varia com o peso e com a "distância" entre os CEPs, só para os valores
    // mudarem de um teste para outro em vez de serem sempre iguais
    const origin = Number(input.originCep.slice(0, 2)) || 0;
    const dest = Number(input.destinationCep.slice(0, 2)) || 0;
    const spread = Math.min(40, Math.abs(origin - dest));
    const base = 1800 + spread * 90 + Math.round(input.packageSpec.weightKg * 1200);

    console.warn(
      "[frete] usando SIMULADOR de desenvolvimento — configure MELHOR_ENVIO_TOKEN para preços reais",
    );

    return [
      {
        serviceId: "dev-pac",
        name: "PAC (simulado)",
        carrier: "Correios",
        priceCents: base,
        deliveryDays: 6 + Math.round(spread / 8),
      },
      {
        serviceId: "dev-sedex",
        name: "SEDEX (simulado)",
        carrier: "Correios",
        priceCents: Math.round(base * 1.75),
        deliveryDays: 2 + Math.round(spread / 20),
      },
    ];
  },
};
