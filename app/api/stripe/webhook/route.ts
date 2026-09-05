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
      /* A entrega não é mais cobrada do cliente, então não há shipping_cost na
         sessão para conferir. O que interessa gravar é o plano de postagem que o
         servidor cotou na hora do checkout: por onde despachar e quanto vai nos
         custar. Vem em metadata justamente para o cliente não ver. */
      const custo = Number(session.metadata?.shippingCostCents);
      const dias = Number(session.metadata?.shippingDays);
      const planoDeEnvio = session.metadata?.shippingName
        ? {
            serviceId: session.metadata?.shippingServiceId ?? "",
            carrier: "",
            name: session.metadata.shippingName,
            priceCents: Number.isFinite(custo) ? custo : 0,
            deliveryDays: Number.isFinite(dias) && dias > 0 ? dias : null,
          }
        : existing.shipping;

      await orderRef.update({
        status: "paid",
        stripeSessionId,
        amountPaid,
        paidAt: Date.now(),
        ...(planoDeEnvio ? { shipping: planoDeEnvio } : {}),
      });
    }

    if (existing.notifiedAt) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // relê para que os e-mails mostrem os valores já reconciliados
    const fresh = (await orderRef.get()).data() as PosterOrder;

    const customerEmail = session.customer_email
      ?? (fresh.contactType === "email" ? fresh.customerContact : null)
      ?? fresh.userEmail;

    /* Os dois envios são independentes de propósito.
       Enquanto a recusa da Resend passava calada, tanto fazia a ordem; agora
       que ela vira exceção, deixar o aviso interno primeiro faria uma falha
       nossa impedir a confirmação de quem pagou. */
    let confirmacaoEnviada = true;
    if (customerEmail) {
      try {
        await sendCustomerConfirmation(fresh, orderId, customerEmail, amountPaid);
      } catch (err) {
        console.error("[stripe/webhook] confirmação do cliente falhou:", err);
        confirmacaoEnviada = false;
      }
    }

    try {
      await sendAdminNotification(fresh, orderId, stripeSessionId, amountPaid, paymentIntentId);
    } catch (err) {
      // aviso interno: dá para reenviar à mão, não segura o resto
      console.error("[stripe/webhook] aviso interno falhou:", err);
    }

    if (!confirmacaoEnviada) {
      /* Sem marcar notifiedAt: o 500 faz o Stripe tentar de novo, e o pedido
         já está pago, então a repetição só refaz o e-mail que faltou. */
      return NextResponse.json({ error: "Falha ao notificar." }, { status: 500 });
    }

    await orderRef.update({ notifiedAt: Date.now() });
  } catch (err) {
    console.error("[stripe/webhook] Erro ao processar pedido:", err);
    // 500 faz o Stripe tentar de novo; as travas acima evitam efeito duplicado
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
