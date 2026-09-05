import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb, isAdmin, misconfiguredResponse, verifyCaller } from "@/lib/firebaseAdmin";
import type { PosterOrder } from "@/types/poster";

/**
 * Todos os pedidos que precisam ser despachados.
 *
 * Antes a tela consultava o Firestore direto do navegador e batia em "missing
 * or insufficient permissions" — e nao havia regra correta a escrever: sem
 * custom claim o Firestore nao distingue o administrador de qualquer outro
 * usuario logado, entao a regra que fizesse a tela funcionar liberaria endereco
 * e telefone dos compradores para todo mundo.
 *
 * Aqui a identidade vem do token, verificada do mesmo jeito que na rota que
 * marca o pedido como enviado.
 */
export async function GET(req: NextRequest) {
  const result = await verifyCaller(req);
  if (!result.ok && result.reason === "misconfigured") return misconfiguredResponse();
  if (!result.ok || !isAdmin(result.caller)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const snap = await getAdminDb()
      .collection("posterOrders")
      // pedido sem pagamento nao interessa aqui: so o que precisa despachar
      .where("status", "in", ["paid", "processing", "shipped", "done"])
      .get();

    const orders = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as PosterOrder) }))
      .sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("[admin/orders]", err);
    return NextResponse.json({ error: "Falha ao carregar pedidos." }, { status: 500 });
  }
}
