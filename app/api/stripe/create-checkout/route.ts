import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { STRIPE_PRICE_IDS } from "@/lib/posterPricing";
import type { PosterFormat } from "@/types/poster";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      orderId: string;
      format: PosterFormat;
      customerEmail?: string;
    };

    const { orderId, format, customerEmail } = body;

    if (!orderId || !format) {
      return NextResponse.json({ error: "Parâmetros obrigatórios ausentes." }, { status: 400 });
    }

    const priceId = STRIPE_PRICE_IDS[format];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      customer_email: customerEmail,
      metadata: {
        orderId,
        format,
      },
      success_url: `${baseUrl}/poster/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}?poster=cancelado`,
      payment_intent_data: {
        metadata: { orderId, format },
      },
      locale: "pt-BR",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/create-checkout]", err);
    return NextResponse.json({ error: "Erro ao criar sessão de pagamento." }, { status: 500 });
  }
}
