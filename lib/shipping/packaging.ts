import type { PosterFormat } from "@/types/poster";
import type { PackageSpec } from "./types";

/**
 * Embalagem de cada formato: caixa plana com o quadro emoldurado dentro.
 *
 * ATENÇÃO — estes números definem quanto o frete custa. Confira com a
 * embalagem real antes de vender: agora o frete é grátis para quem compra, então
 * medida a menos não vira surpresa no checkout — vira prejuízo direto seu,
 * porque a transportadora repesa o pacote na postagem e cobra a diferença.
 *
 * O quadro de memórias sai emoldurado, então o que viaja é o quadro montado, não o papel:
 *   A3 impresso 29,7 x 42,0 cm -> quadro ~33 x 45 cm
 *   A4 impresso 21,0 x 29,7 cm -> quadro ~24 x 33 cm
 */
export const PACKAGE_BY_FORMAT: Record<PosterFormat, PackageSpec> = {
  // quadro A3 emoldurado (30x42 interno, ~33x45 externo) + proteção
  a3_portrait:  { widthCm: 36, heightCm: 5, lengthCm: 48, weightKg: 0.85 },
  a3_landscape: { widthCm: 36, heightCm: 5, lengthCm: 48, weightKg: 0.85 },
  // quadro A4 emoldurado (21x30 interno, ~24x33 externo) + proteção
  a4_portrait:  { widthCm: 27, heightCm: 5, lengthCm: 36, weightKg: 0.60 },
  a4_landscape: { widthCm: 27, heightCm: 5, lengthCm: 36, weightKg: 0.60 },
  // produto interno de teste: usa a menor embalagem
  test:         { widthCm: 18, heightCm: 3, lengthCm: 24, weightKg: 0.2 },
};

/**
 * Correios recusam pacotes fora destes limites, e o agregador repassa a recusa.
 * Validar aqui dá um erro claro em vez de uma cotação vazia sem explicação.
 */
const MIN_CM = 1;
const MAX_SUM_CM = 200; // soma das três dimensões
const MAX_SIDE_CM = 100;

export function packageFor(format: PosterFormat): PackageSpec {
  return PACKAGE_BY_FORMAT[format];
}

export function validatePackage(spec: PackageSpec): string | null {
  const { widthCm, heightCm, lengthCm } = spec;
  if ([widthCm, heightCm, lengthCm].some((d) => d < MIN_CM)) {
    return "Dimensões da embalagem abaixo do mínimo aceito.";
  }
  if ([widthCm, heightCm, lengthCm].some((d) => d > MAX_SIDE_CM)) {
    return "Alguma dimensão da embalagem passa do limite de 100 cm.";
  }
  if (widthCm + heightCm + lengthCm > MAX_SUM_CM) {
    return "A soma das dimensões da embalagem passa de 200 cm.";
  }
  return null;
}
