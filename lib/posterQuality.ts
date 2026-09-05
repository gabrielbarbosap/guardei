import { FORMAT_DIMS } from "./posterMap";
import type { PosterFormat } from "@/types/poster";

/**
 * Resolucao de exportacao do poster.
 *
 * FORMAT_DIMS descreve o poster a 150 DPI, que e metade do padrao de grafica.
 * Dobrar leva a 300 DPI mantendo exatamente a mesma proporcao — nao ha
 * arredondamento novo, e todo o layout, que e proporcional a largura, continua
 * valendo sem ajuste.
 */
export const PRINT_SCALE = 2;

/** Qualidade do JPEG final. Acima disso o arquivo cresce sem ganho visivel. */
export const PRINT_JPEG_QUALITY = 0.95;

/**
 * Ate onde a maquina de quem esta comprando aguenta.
 *
 * Navegador nao avisa que o canvas passou do limite: ele devolve uma superficie
 * que aceita comandos de desenho e exporta em branco. O Safari do iPhone corta
 * em torno de 16,7 milhoes de pixels, e um A3 a 300 DPI tem 17,4 — ou seja,
 * exatamente o caso que quebraria, e em silencio.
 *
 * Por isso a checagem e empirica: pinta um pixel e le de volta. Se o canvas nao
 * foi alocado, a leitura nao bate.
 */
export function canvasSupports(width: number, height: number): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(width - 1, height - 1, 1, 1);
    const [r, , , a] = ctx.getImageData(width - 1, height - 1, 1, 1).data;
    // libera a memoria antes de tentar o proximo tamanho
    canvas.width = 1;
    canvas.height = 1;
    return r > 200 && a > 200;
  } catch {
    return false;
  }
}

export type ExportDims = { w: number; h: number; scale: number; dpi: number };

/**
 * O maior tamanho que este aparelho consegue exportar, de 300 DPI para baixo.
 *
 * Desce em passos ate achar um que a maquina aceite, e nunca abaixo dos 150 DPI
 * que ja funcionavam: pior do que exportar em 150 e exportar em branco.
 */
export function bestExportDims(format: PosterFormat): ExportDims {
  const base = FORMAT_DIMS[format];
  const escalas = [PRINT_SCALE, 1.75, 1.5, 1.25, 1];

  for (const scale of escalas) {
    const w = Math.round(base.w * scale);
    const h = Math.round(base.h * scale);
    if (scale === 1 || canvasSupports(w, h)) {
      return { w, h, scale, dpi: Math.round(150 * scale) };
    }
  }
  return { w: base.w, h: base.h, scale: 1, dpi: 150 };
}
