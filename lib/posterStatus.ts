import type { PosterOrder } from "@/types/poster";

/**
 * Como cada estado do pedido aparece para gente.
 *
 * Um lugar so porque as duas telas mostram a mesma lista: o painel do admin e
 * a de compras de quem comprou. Quando estavam separadas, bastava alguem
 * renomear um estado de um lado para as duas passarem a contar historias
 * diferentes sobre o mesmo pedido.
 */
export const STATUS_LABEL: Record<PosterOrder["status"], string> = {
  pending_payment: "aguardando pagamento",
  paid: "pago",
  processing: "em produção",
  shipped: "enviado",
  done: "concluído",
};

/** O que a pessoa que comprou precisa saber que vai acontecer agora. */
export const STATUS_HINT: Record<PosterOrder["status"], string> = {
  pending_payment: "o pagamento não foi concluído — nada foi cobrado",
  paid: "recebemos o pagamento; a impressão começa em até 2 dias úteis",
  processing: "seu pôster está sendo impresso",
  shipped: "a caminho do seu endereço",
  done: "entregue",
};

/** Referência curta e legível, a mesma que vai nos e-mails. */
export function orderRef(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}
