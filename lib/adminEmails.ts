/**
 * Quem administra a loja.
 *
 * Duplicado de proposito fora de firebaseAdmin: aquele modulo e server-only
 * (carrega o SDK admin) e importa-lo numa tela do navegador quebraria o build.
 * A lista aqui so decide o que aparece; quem decide o que pode acontecer e a
 * rota, que continua conferindo pelo token.
 */
export const ADMIN_EMAILS = ["gabriel@sistemap.com.br"];
