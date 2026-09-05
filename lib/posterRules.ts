/**
 * Regras de composição do pôster.
 *
 * Ficam aqui, e não dentro de um componente, porque valem para o onboarding
 * (que promete a faixa) e para o compositor (que avisa quando ela é ultrapassada).
 * Duas cópias do mesmo número acabariam divergindo.
 */

/** Mínimo para o mapa contar uma história — é a meta do onboarding. */
export const POSTER_MIN_PHOTOS = 5;

/**
 * Acima disso as polaroids encolhem e cobrem o mapa. Não é um bloqueio:
 * a pessoa pode seguir, apenas avisada do resultado.
 */
export const POSTER_MAX_PHOTOS = 22;

/**
 * Quantas memórias o onboarding pede antes de soltar a pessoa.
 *
 * É menor que o mínimo do pôster de propósito: o guia serve para tirar do zero,
 * não para completar o pôster. No fim ele avisa que faltam mais algumas.
 */
export const ONBOARDING_MEMORIES_GOAL = 3;

/**
 * Limite da frase livre do poster.
 *
 * Cinquenta caracteres cabem numa linha legivel a distancia de parede. Acima
 * disso a fonte teria de encolher tanto que a frase deixaria de funcionar como
 * titulo e viraria mais uma legenda.
 */
export const POSTER_CAPTION_MAX = 50;
