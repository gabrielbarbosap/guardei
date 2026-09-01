import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb, isAdmin, misconfiguredResponse, verifyCaller } from "@/lib/firebaseAdmin";
import { sendOrderShipped } from "@/lib/emails";
import type { PosterOrder } from "@/types/poster";

/** Link padrão de rastreio quando não vier um da transportadora. */
function defaultTrackingUrl(code: string) {
  return `https://www.linkcorreios.com.br/?id=${encodeURIComponent(code)}`;
}

/**
 * Marca um pedido como enviado e avisa quem comprou.
 *
 * Só o administrador pode chamar: a verificação é pelo token do Firebase, e não
 * por um campo no corpo da requisição, que qualquer um poderia forjar.
 */
export async function POST(req: NextRequest) {
  const result = await verifyCaller(req);
  if (!result.ok && result.reason === "misconfigured") return misconfiguredResponse();
  if (!result.ok || !isAdmin(result.caller)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  let orderId: string, code: string, url: string | undefined;
  try {
    const body = await req.json() as { orderId?: unknown; trackingCode?: unknown; trackingUrl?: unknown };
    if (typeof body.orderId !== "string" || !body.orderId) {
      return NextResponse.json({ error: "Pedido ausente." }, { status: 400 });
    }
    if (typeof body.trackingCode !== "string" || body.trackingCode.trim().length < 5) {
      return NextResponse.json({ error: "Informe o código de rastreio." }, { status: 400 });
    }
    orderId = body.orderId;
    code = body.trackingCode.trim().toUpperCase();
    url = typeof body.trackingUrl === "string" && body.trackingUrl.trim() ? body.trackingUrl.trim() : undefined;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  try {
    const ref = getAdminDb().collection("posterOrders").doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

    const order = snap.data() as PosterOrder;
    if (order.status === "pending_payment") {
      return NextResponse.json({ error: "Esse pedido ainda não foi pago." }, { status: 409 });
    }

    const trackingUrl = url ?? defaultTrackingUrl(code);

    await ref.set({
      status: "shipped",
      shippedAt: Date.now(),
      trackingCode: code,
      trackingUrl,
    }, { merge: true });

    // o aviso sai uma vez só; remarcar o rastreio não reenvia
    if (!order.shipNotifiedAt) {
      const to = order.contactType === "email" ? order.customerContact : order.userEmail;
      if (to) {
        await sendOrderShipped({ ...order, trackingCode: code, trackingUrl }, orderId, to, { code, url: trackingUrl });
        await ref.set({ shipNotifiedAt: Date.now() }, { merge: true });
      }
    }

    return NextResponse.json({ ok: true, trackingUrl });
  } catch (err) {
    console.error("[orders/ship]", err);
    return NextResponse.json({ error: "Falha ao marcar como enviado." }, { status: 500 });
  }
}
