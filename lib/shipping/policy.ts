import type { FreightOption } from "./types";

/**
 * Regras de entrega do negocio, separadas do provedor.
 *
 * O adaptador diz o que existe e por quanto; aqui decide-se o que a Guardei
 * aceita despachar. Ficam juntas porque as duas regras respondem a mesma
 * pergunta — quanto tempo ate a memoria chegar na mao de alguem.
 */

/** Dias uteis entre o pagamento e a postagem: impressao, conferencia, embalagem. */
export const PRODUCTION_DAYS = 2;

/**
 * Faixa de CEP tratada como entrega local.
 *
 * Cobre a Regiao Metropolitana do Recife por banda de CEP: 50-52 e a capital,
 * 53 pega Olinda, Paulista, Abreu e Lima e Igarassu, 54 pega Jaboatao e Cabo.
 * E uma aproximacao — a banda 53/54 inclui alguns municipios de fora da RMR —
 * aceita de proposito porque errar para o lado de oferecer entrega local a um
 * vizinho custa menos do que negar a quem esta a vinte minutos daqui.
 */
const LOCAL_MIN = 50000000;
const LOCAL_MAX = 54999999;

export function isLocalArea(cep: string): boolean {
  const n = Number(cep.replace(/\D/g, ""));
  return Number.isFinite(n) && n >= LOCAL_MIN && n <= LOCAL_MAX;
}

/** Reconhece o PAC tanto na resposta real quanto na do simulador. */
function isPac(option: FreightOption): boolean {
  return /correios/i.test(option.carrier) && /\bpac\b/i.test(option.name);
}

/**
 * Aplica a politica de transportadora ao que o provedor devolveu.
 *
 * Na regiao metropolitana vale qualquer transportadora: a entrega e local,
 * rapida e barata, e as opcoes porta a porta custam menos que os Correios.
 * Para fora, so PAC — cobertura nacional sem depender de agencia parceira, ao
 * preco mais baixo dos Correios.
 *
 * O filtro mora aqui, e nao na tela, porque o checkout revalida pelo mesmo
 * caminho: se fosse so exibicao, daria para mandar o id de uma transportadora
 * escondida pelo console e pagar o frete mais barato que a regra recusa.
 */
export function applyCarrierPolicy(
  options: FreightOption[],
  destinationCep: string,
): FreightOption[] {
  if (isLocalArea(destinationCep)) return options;
  return options.filter(isPac);
}

/**
 * Prazo que a pessoa realmente espera: producao mais transporte.
 *
 * O provedor informa so o transporte. Mostrar esse numero sozinho prometeria
 * uma data que nao existe, porque o pacote nem foi impresso ainda.
 */
export function totalDeliveryDays(transitDays: number | null): number | null {
  return transitDays === null ? null : transitDays + PRODUCTION_DAYS;
}
