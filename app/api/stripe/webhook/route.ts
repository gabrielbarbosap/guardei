import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { markOrderPaid } from "@/lib/firestore";
import type Stripe from "stripe";

// Next.js App Router: desativa body parser para o Stripe poder verificar a assinatura
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

    if (orderId) {
      try {
        await markOrderPaid(orderId, stripeSessionId, amountPaid);
        await notifyAdmin(orderId, session);
      } catch (err) {
        console.error("[stripe/webhook] Erro ao marcar pedido como pago:", err);
        return NextResponse.json({ error: "Erro interno." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}

async function notifyAdmin(orderId: string, session: Stripe.Checkout.Session) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const format = session.metadata?.format ?? "";
  const customer = session.customer_email ?? session.metadata?.contact ?? "—";
  const amount = ((session.amount_total ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Guardei.art <pedidos@guardei.art>",
      to: ["gabriel@sistemap.com.br"],
      subject: `💳 Novo pedido pago — ${format} — ${amount}`,
      html: `
        <h2>Novo pedido pago no Guardei.art</h2>
        <p><strong>Pedido:</strong> #${orderId.slice(0, 8).toUpperCase()}</p>
        <p><strong>Formato:</strong> ${format}</p>
        <p><strong>Valor:</strong> ${amount}</p>
        <p><strong>Cliente:</strong> ${customer}</p>
        <p><strong>Sessão Stripe:</strong> ${session.id}</p>
        <p><a href="https://dashboard.stripe.com/payments/${session.payment_intent}">Ver no Stripe →</a></p>
      `,
    }),
  });
}
