import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb, misconfiguredResponse, verifyCaller } from "@/lib/firebaseAdmin";
import type { PosterOrder } from "@/types/poster";

/**
 * Os pedidos de quem esta chamando.
 *
 * Passa pelo servidor, e nao pelo Firestore do navegador, por dois motivos.
 *
 * O primeiro e que a regra necessaria para o painel do admin funcionar no
 * cliente teria de permitir ler pedido alheio — sem custom claim o Firestore
 * nao sabe quem e administrador, e a regra acabaria expondo endereco e telefone
 * de todo mundo a qualquer pessoa autenticada.
 *
 * O segundo e que a arte final nao pode voltar para quem comprou: ela e o
 * arquivo de impressao, e sai da resposta aqui, onde o cliente nao alcanca.
 */

/** Estados que representam uma compra concluida. */
const PAGOS: PosterOrder["status"][] = ["paid", "processing", "shipped", "done"];

/** O que o comprador pode ver do proprio pedido. */
function paraCliente(order: PosterOrder & { id: string }) {
  // desestruturar e descartar deixa explicito o que fica de fora
  const { posterImageUrl: _arte, stripeSessionId: _sessao, ...visivel } = order;
  void _arte; void _sessao;
  return visivel;
}

export async function GET(req: NextRequest) {
  const result = await verifyCaller(req);
  if (!result.ok) {
    return result.reason === "misconfigured"
      ? misconfiguredResponse()
      : NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const snap = await getAdminDb()
      .collection("posterOrders")
      .where("userId", "==", result.caller.uid)
      .get();

    const orders = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as PosterOrder) }))
      /* Só o que foi pago: um pedido em pending_payment é um checkout que a
         pessoa abandonou ou que falhou, e mostrá-lo numa lista de compras
         sugeriria uma cobrança que nunca aconteceu.

         O filtro e a ordenação ficam aqui, e não na consulta, porque combinar
         userId com status ou createdAt exigiria índice composto no Firestore —
         que falharia só em produção, na primeira pessoa a abrir a tela. */
      .filter((o) => PAGOS.includes(o.status))
      .map(paraCliente)
      .sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("[orders/list]", err);
    return NextResponse.json({ error: "Falha ao carregar pedidos." }, { status: 500 });
  }
}
