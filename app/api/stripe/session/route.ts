import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";

/**
 * Resumo da compra para a página de sucesso.
 *
 * Devolve só o que a própria pessoa acabou de ver no checkout — valores e nome
 * do serviço de entrega. Nada de e-mail, endereço ou dados de pagamento: o
 * session_id viaja na URL e não deve destrancar informação pessoal.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("session_id");
  if (!id || !id.startsWith("cs_")) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Pagamento não confirmado." }, { status: 409 });
    }

    const shippingCents = session.shipping_cost?.amount_total ?? 0;
    const totalCents = session.amount_total ?? 0;

    return NextResponse.json({
      totalCents,
      shippingCents,
      posterCents: Math.max(0, totalCents - shippingCents),
      shippingName: session.metadata?.shippingName ?? null,
      orderRef: (session.metadata?.orderId ?? "").slice(0, 8).toUpperCase() || null,
    });
  } catch (err) {
    console.error("[stripe/session]", err);
    return NextResponse.json({ error: "Não foi possível carregar o pedido." }, { status: 500 });
  }
}
