import type { FreightOption, FreightProvider, FreightQuoteInput } from "./types";

/**
 * Frete simulado, so para desenvolvimento.
 *
 * Existe para dar para rodar o fluxo de compra inteiro na maquina sem cadastro
 * no agregador. NUNCA e usado em producao: quem escolhe o provedor (quote.ts)
 * so cai aqui quando NODE_ENV !== "production" E nao ha token configurado.
 *
 * Os nomes saem marcados como "simulado" de proposito — preco de mentira nao
 * pode se passar por preco real na tela.
 *
 * ATENCAO: as constantes abaixo sao aproximacoes de tabela publica, ajustadas
 * so para a ordem de grandeza bater. Elas nao servem para decidir preco de
 * venda; para isso e preciso cotar de verdade.
 */

/** Divisor de cubagem usado pelas transportadoras: cm3 / 6000 = kg. */
const FATOR_CUBAGEM = 6000;

/**
 * O que a transportadora cobra e o maior entre peso real e peso cubado.
 *
 * A versao anterior deste simulador usava so o peso real, e por isso dava quase
 * o mesmo valor para um A5 e para um A2 — quando na pratica a caixa plana do A2
 * e cobrada como 1,9 kg apesar de pesar 600 g.
 */
function pesoCobrado(input: FreightQuoteInput): number {
  const { widthCm, heightCm, lengthCm, weightKg } = input.packageSpec;
  const cubado = (widthCm * heightCm * lengthCm) / FATOR_CUBAGEM;
  return Math.max(weightKg, cubado);
}

/**
 * Faixa de distancia pelo primeiro digito do CEP, que no Brasil ja separa as
 * regioes: 0-1 SP, 2 RJ/ES, 3 MG, 4 BA/SE, 5 PE e vizinhos, 6 CE/norte,
 * 7 DF/centro-oeste, 8 PR/SC, 9 RS.
 */
function faixa(originCep: string, destinationCep: string): { nome: string; multiplicador: number } {
  const a = Number(originCep[0]);
  const b = Number(destinationCep[0]);
  if (originCep.slice(0, 3) === destinationCep.slice(0, 3)) {
    return { nome: "local", multiplicador: 1 };
  }
  if (a === b) return { nome: "mesma regiao", multiplicador: 1.2 };
  return { nome: "outra regiao", multiplicador: 1.6 };
}

export const devStub: FreightProvider = {
  id: "dev_stub",

  async quote(input: FreightQuoteInput): Promise<FreightOption[]> {
    const kg = pesoCobrado(input);
    const { multiplicador } = faixa(input.originCep, input.destinationCep);

    /* Constantes aferidas contra cotacoes reais do Melhor Envio saindo de
       Recife em 05/09/2026 (A2 e A5, quatro destinos). A versao anterior
       cobrava 2 a 3 vezes mais que a realidade e fazia o frete local
       parecer caro quando nao era. */
    const pac = Math.round((900 + kg * 350) * multiplicador);
    // o seguro entra sobre o valor declarado, como nas tabelas reais
    const seguro = Math.round(input.declaredValueCents * 0.01);

    console.warn(
      "[frete] usando SIMULADOR de desenvolvimento — configure MELHOR_ENVIO_TOKEN para precos reais",
    );

    return [
      {
        serviceId: "dev-pac",
        name: "PAC (simulado)",
        carrier: "Correios",
        priceCents: pac + seguro,
        deliveryDays: multiplicador === 1 ? 3 : multiplicador < 1.5 ? 6 : 9,
      },
      {
        serviceId: "dev-sedex",
        name: "SEDEX (simulado)",
        carrier: "Correios",
        priceCents: Math.round(pac * 1.9) + seguro,
        deliveryDays: multiplicador === 1 ? 1 : multiplicador < 1.5 ? 2 : 4,
      },
    ];
  },
};
