import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendAdminNotification, sendCustomerConfirmation } from "@/lib/emails";
import type Stripe from "stripe";
import type { PosterOrder } from "@/types/poster";

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Configuração de webhook ausente." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Assinatura inválida:", err);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    const stripeSessionId = session.id;
    const amountPaid = session.amount_total ?? 0;
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : undefined;

    if (!orderId) {
      return NextResponse.json({ received: true });
    }

    try {
      const orderRef = getAdminDb().collection("posterOrders").doc(orderId);

      // 1. Marca pedido como pago
      await orderRef.update({
        status: "paid",
        stripeSessionId,
        amountPaid,
        paidAt: Date.now(),
      });

      // 2. Busca dados completos do pedido
      const snap = await orderRef.get();
      const order = snap.data() as PosterOrder | undefined;
      if (!order) throw new Error(`Pedido ${orderId} não encontrado.`);

      // 3. Email para o admin
      await sendAdminNotification(order, orderId, stripeSessionId, amountPaid, paymentIntentId);

      // 4. Email para o cliente
      const customerEmail = session.customer_email
        ?? (order.contactType === "email" ? order.customerContact : null)
        ?? order.userEmail;

      if (customerEmail) {
        await sendCustomerConfirmation(order, orderId, customerEmail, amountPaid);
      }
    } catch (err) {
      console.error("[stripe/webhook] Erro ao processar pedido:", err);
      return NextResponse.json({ error: "Erro interno." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
