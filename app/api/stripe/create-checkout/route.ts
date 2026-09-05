import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { STRIPE_PRICE_IDS, POSTER_PRICES } from "@/lib/posterPricing";
import { quoteFreight } from "@/lib/shipping/quote";
import type { PosterFormat, ShippingAddress } from "@/types/poster";

function isPosterFormat(value: unknown): value is PosterFormat {
  return typeof value === "string" && value in POSTER_PRICES;
}

/** O endereço vem do navegador; só aceitamos com os campos que a etiqueta exige. */
function isAddress(value: unknown): value is ShippingAddress {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  return ["cep", "street", "number", "district", "city", "state"].every(
    (k) => typeof a[k] === "string" && (a[k] as string).trim().length > 0,
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      orderId?: string;
      format?: unknown;
      customerEmail?: string;
      customerName?: string;
      shippingAddress?: unknown;
    };

    const { orderId, customerEmail, customerName } = body;

    if (!orderId || !isPosterFormat(body.format)) {
      return NextResponse.json({ error: "Parâmetros obrigatórios ausentes." }, { status: 400 });
    }
    const format = body.format;

    if (!isAddress(body.shippingAddress)) {
      return NextResponse.json({ error: "Endereço de entrega ausente." }, { status: 400 });
    }
    const address = body.shippingAddress;

    /* ── Frete ──
       Quem paga somos nós, então a cotação aqui não cobra nada: serve para
       registrar no pedido quanto a postagem vai custar e por qual transportadora.

       Falha na cotação não impede a venda. Antes ela impedia, e fazia sentido
       quando o valor ia para a conta do cliente; agora barrar a compra por causa
       de um número que só nós usamos seria perder a venda à toa. */
    let freight = null;
    try {
      const opcoes = await quoteFreight(format, address.cep);
      // quoteFreight já devolve ordenado da mais barata
      freight = opcoes[0] ?? null;
    } catch (err) {
      console.error("[create-checkout] cotação interna falhou (venda segue):", err);
    }

    /* ── Preço do quadro de memórias ──
       POSTER_PRICES é o que a tela mostra e STRIPE_PRICE_IDS é o que cobra: se
       os dois divergirem, a pessoa veria um total e pagaria outro. */
    const priceId = STRIPE_PRICE_IDS[format];
    const price = await stripe.prices.retrieve(priceId);
    const expected = POSTER_PRICES[format];
    if (price.unit_amount !== expected) {
      console.error(
        "[create-checkout] preço divergente em " + format +
        ": Stripe=" + price.unit_amount + " tabela=" + expected,
      );
      return NextResponse.json(
        { error: "Preço indisponível no momento. Tente de novo em instantes." },
        { status: 409 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const line2 = [address.complement, address.district].filter(Boolean).join(" - ");
    const shippingLabel = freight ? (freight.carrier + " " + freight.name).trim() : "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      customer_email: customerEmail,
      /* O custo da postagem viaja em metadata, e não como shipping_options: o
         cliente não pode ver nem pagar por isso. O webhook grava no pedido para
         o painel saber por onde despachar e quanto custou. */
      metadata: {
        orderId,
        format,
        ...(freight
          ? {
              shippingServiceId: freight.serviceId,
              shippingName: shippingLabel,
              shippingCostCents: String(freight.priceCents),
              shippingDays: String(freight.deliveryDays ?? ""),
            }
          : {}),
      },
      payment_intent_data: {
        metadata: { orderId, format },
        /* O endereço fica junto do pagamento: aparece no painel do Stripe e é o
           que sustenta a defesa numa contestação de compra. */
        shipping: {
          name: customerName?.trim() || "Cliente",
          address: {
            line1: address.street + ", " + address.number,
            line2: line2 || undefined,
            postal_code: address.cep,
            city: address.city,
            state: address.state,
            country: "BR",
          },
        },
      },
      success_url: baseUrl + "/poster/sucesso?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: baseUrl + "?poster=cancelado",
      locale: "pt-BR",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/create-checkout]", err);
    return NextResponse.json({ error: "Erro ao criar sessão de pagamento." }, { status: 500 });
  }
}
