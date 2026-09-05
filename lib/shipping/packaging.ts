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
 *   A3 = 29,7 x 42,0 cm | A4 = 21,0 x 29,7 cm | A5 = 14,8 x 21,0 cm
 */
export const PACKAGE_BY_FORMAT: Record<PosterFormat, PackageSpec> = {
  // caixa plana com folga sobre o A3 + proteção
  a3_portrait:  { widthCm: 32, heightCm: 3, lengthCm: 45, weightKg: 0.35 },
  a3_landscape: { widthCm: 32, heightCm: 3, lengthCm: 45, weightKg: 0.35 },
  // caixa plana com folga sobre o A4
  a4_portrait:  { widthCm: 24, heightCm: 3, lengthCm: 33, weightKg: 0.25 },
  a4_landscape: { widthCm: 24, heightCm: 3, lengthCm: 33, weightKg: 0.25 },
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
