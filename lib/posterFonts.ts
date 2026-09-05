/**
 * As fontes que quem compra pode escolher para a frase do poster.
 *
 * A chave e o que fica gravado no pedido, e nao o nome da familia: o next/font
 * resolve cada fonte para um nome proprio por build, entao guardar o nome
 * humano ("Cinzel Decorative") daria um pedido que aponta para uma fonte que o
 * canvas nao encontra. A chave sobrevive a qualquer rebuild.
 */

export type CaptionFontKey = "cinzel" | "life_savers" | "rainbow";

export const DEFAULT_CAPTION_FONT: CaptionFontKey = "cinzel";

export const CAPTION_FONTS: {
  key: CaptionFontKey;
  /** O que a pessoa le no seletor — o nome tecnico nao diz nada a ela. */
  label: string;
  cssVar: string;
}[] = [
  { key: "cinzel", label: "clássica", cssVar: "--font-cinzel-decorative" },
  { key: "life_savers", label: "arredondada", cssVar: "--font-life-savers" },
  { key: "rainbow", label: "manuscrita", cssVar: "--font-over-the-rainbow" },
];

/** Usada no servidor e quando o tema ainda nao esta disponivel. */
const FALLBACK = "Georgia, 'Times New Roman', serif";

function varDe(key: CaptionFontKey): string {
  return (CAPTION_FONTS.find((f) => f.key === key) ?? CAPTION_FONTS[0]).cssVar;
}

/** Para usar em CSS: a variavel resolve sozinha no navegador. */
export function captionFontCss(key: CaptionFontKey): string {
  return `var(${varDe(key)}), ${FALLBACK}`;
}

/**
 * Nome real da familia, para o canvas.
 *
 * O canvas nao entende var(): precisa do valor ja resolvido. Sem isto o desenho
 * cairia calado no serif do sistema, e a tipografia errada so apareceria
 * depois de impressa.
 */
export function captionFontFamily(key: CaptionFontKey): string {
  if (typeof document === "undefined") return FALLBACK;
  const valor = getComputedStyle(document.documentElement)
    .getPropertyValue(varDe(key))
    .trim();
  return valor ? `${valor}, ${FALLBACK}` : FALLBACK;
}
