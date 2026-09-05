/**
 * Espaço de coordenadas da prévia do quadro de memórias.
 *
 * O layout é montado nestas unidades lógicas e depois reescalado para a
 * resolução final na hora de gerar a imagem. A prévia pode ser exibida menor
 * (celular) via CSS transform — o espaço lógico não muda, então a conversão
 * para a resolução final continua valendo.
 *
 * Este valor precisa ser o mesmo no compositor e em quem gera a imagem;
 * por isso mora aqui, e não duplicado nos dois.
 */
export const PREVIEW_W = 560;

/** Altura da prévia para um formato, mantendo a proporção física do quadro de memórias. */
export function previewHeightFor(dimsW: number, dimsH: number): number {
  return Math.round(PREVIEW_W * (dimsH / dimsW));
}
