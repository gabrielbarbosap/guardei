import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendAdminNotification, sendCustomerConfirmation } from "@/lib/emails";
import type Stripe from "stripe";
import type { PosterOrder } from "@/types/poster";

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

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    return NextResponse.json({ received: true });
  }

  const stripeSessionId = session.id;
  const amountPaid = session.amount_total ?? 0;
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : undefined;

  try {
    const orderRef = getAdminDb().collection("posterOrders").doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) {
      // sem pedido não há o que processar; 200 evita reenvio eterno do Stripe
      console.error("[stripe/webhook] Pedido " + orderId + " não encontrado.");
      return NextResponse.json({ received: true });
    }
    const existing = snap.data() as PosterOrder;

    /* O Stripe reenvia o mesmo evento em retentativa e pode entregá-lo mais de
       uma vez. Sem esta trava o pedido era remarcado e o cliente recebia a
       confirmação repetida. As duas etapas são separadas de propósito: se o
       e-mail falhar, a retentativa reenvia só o e-mail. */
    const alreadyPaid = existing.status === "paid" || Boolean(existing.paidAt);

    if (!alreadyPaid) {
      /* O valor do frete gravado no pedido veio do navegador e não é confiável.
         O que vale é o que o Stripe efetivamente cobrou. */
      const chargedShipping = session.shipping_cost?.amount_total;
      const shippingFromStripe = typeof chargedShipping === "number"
        ? {
            ...(existing.shipping ?? { serviceId: "", carrier: "", name: "", deliveryDays: null }),
            name: session.metadata?.shippingName ?? existing.shipping?.name ?? "Entrega",
            priceCents: chargedShipping,
          }
        : existing.shipping;

      await orderRef.update({
        status: "paid",
        stripeSessionId,
        amountPaid,
        paidAt: Date.now(),
        ...(shippingFromStripe ? { shipping: shippingFromStripe } : {}),
      });
    }

    if (existing.notifiedAt) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // relê para que os e-mails mostrem os valores já reconciliados
    const fresh = (await orderRef.get()).data() as PosterOrder;

    await sendAdminNotification(fresh, orderId, stripeSessionId, amountPaid, paymentIntentId);

    const customerEmail = session.customer_email
      ?? (fresh.contactType === "email" ? fresh.customerContact : null)
      ?? fresh.userEmail;

    if (customerEmail) {
      await sendCustomerConfirmation(fresh, orderId, customerEmail, amountPaid);
    }

    await orderRef.update({ notifiedAt: Date.now() });
  } catch (err) {
    console.error("[stripe/webhook] Erro ao processar pedido:", err);
    // 500 faz o Stripe tentar de novo; as travas acima evitam efeito duplicado
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
