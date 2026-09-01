/**
 * Camada de frete, propositalmente agnóstica de provedor.
 *
 * As APIs abertas dos Correios foram desligadas em 30/09/2023: hoje o cálculo
 * oficial (api.correios.com.br) exige contrato ativo com os serviços 38202 e
 * 38210 habilitados. Enquanto não houver contrato, cotamos via agregador, que
 * devolve as mesmas transportadoras (PAC/SEDEX inclusive) sem custo fixo.
 *
 * Só o adaptador conhece o provedor; o resto do sistema fala esta interface.
 */

export type FreightOption = {
  /** Identificador do serviço no provedor — volta no checkout para revalidar. */
  serviceId: string;
  /** Nome exibido, ex.: "PAC", "SEDEX". */
  name: string;
  /** Transportadora, ex.: "Correios". */
  carrier: string;
  /** Valor em centavos de BRL, para casar com o resto do sistema. */
  priceCents: number;
  /** Prazo estimado em dias úteis, quando o provedor informa. */
  deliveryDays: number | null;
};

export type FreightQuoteInput = {
  originCep: string;
  destinationCep: string;
  /** Dimensões e peso da embalagem já montada. */
  packageSpec: PackageSpec;
  /** Valor declarado em centavos, usado para o seguro. */
  declaredValueCents: number;
};

export type PackageSpec = {
  /** cm */
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  /** kg */
  weightKg: number;
};

export interface FreightProvider {
  readonly id: string;
  quote(input: FreightQuoteInput): Promise<FreightOption[]>;
}

/** Erro de cotação que pode ser mostrado a quem está comprando. */
export class FreightError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "FreightError";
  }
}

/** Mantém só dígitos e valida o formato de CEP brasileiro. */
export function normalizeCep(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}
