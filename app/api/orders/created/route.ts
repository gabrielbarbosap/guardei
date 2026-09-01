import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb, verifyCaller } from "@/lib/firebaseAdmin";
import { sendOrderCreated } from "@/lib/emails";
import type { PosterOrder } from "@/types/poster";

/** Aviso de "pedido registrado", disparado logo após salvar o pôster. */
export async function POST(req: NextRequest) {
  const caller = await verifyCaller(req);
  if (!caller) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let orderId: string;
  try {
    const body = await req.json() as { orderId?: unknown };
    if (typeof body.orderId !== "string" || !body.orderId) {
      return NextResponse.json({ error: "Pedido ausente." }, { status: 400 });
    }
    orderId = body.orderId;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  try {
    const ref = getAdminDb().collection("posterOrders").doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

    const order = snap.data() as PosterOrder;
    // ninguém dispara e-mail sobre pedido de outra pessoa
    if (order.userId !== caller.uid) {
      return NextResponse.json({ error: "Pedido de outro usuário." }, { status: 403 });
    }
    if (order.createdNotifiedAt) return NextResponse.json({ ok: true, duplicate: true });

    const to = order.contactType === "email" ? order.customerContact : (order.userEmail ?? caller.email);
    if (!to) return NextResponse.json({ ok: true, skipped: "sem e-mail" });

    await sendOrderCreated(order, orderId, to);
    await ref.set({ createdNotifiedAt: Date.now() }, { merge: true });

    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    console.error("[orders/created]", err);
    return NextResponse.json({ error: "Falha ao enviar." }, { status: 500 });
  }
}
