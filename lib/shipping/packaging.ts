import type { PosterFormat } from "@/types/poster";
import type { PackageSpec } from "./types";

/**
 * Embalagem de cada formato: caixa rígida, pôster plano.
 *
 * ATENÇÃO — estes números definem o frete cobrado. Confira com a embalagem
 * real antes de vender: medida a menos vira prejuízo, porque a transportadora
 * repesa o pacote na postagem e cobra a diferença de você, não do cliente.
 *
 * As medidas incluem a embalagem, não só o papel:
 *   A2 = 42,0 x 59,4 cm  |  A5 = 14,8 x 21,0 cm
 */
export const PACKAGE_BY_FORMAT: Record<PosterFormat, PackageSpec> = {
  // caixa plana com folga sobre o A2 + proteção
  a2_portrait:  { widthCm: 45, heightCm: 4, lengthCm: 63, weightKg: 0.6 },
  a2_landscape: { widthCm: 45, heightCm: 4, lengthCm: 63, weightKg: 0.6 },
  // caixa plana com folga sobre o A5
  a5_portrait:  { widthCm: 18, heightCm: 3, lengthCm: 24, weightKg: 0.2 },
  a5_landscape: { widthCm: 18, heightCm: 3, lengthCm: 24, weightKg: 0.2 },
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
