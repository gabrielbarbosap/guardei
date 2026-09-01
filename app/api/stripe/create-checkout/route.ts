import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { STRIPE_PRICE_IDS, POSTER_PRICES, formatPrice } from "@/lib/posterPricing";
import { resolveChosenFreight } from "@/lib/shipping/quote";
import { FreightError } from "@/lib/shipping/types";
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
      shippingServiceId?: string;
      shippingPriceCents?: number;
    };

    const { orderId, customerEmail, customerName, shippingServiceId } = body;

    if (!orderId || !isPosterFormat(body.format)) {
      return NextResponse.json({ error: "Parâmetros obrigatórios ausentes." }, { status: 400 });
    }
    const format = body.format;

    if (!isAddress(body.shippingAddress) || !shippingServiceId) {
      return NextResponse.json({ error: "Endereço ou opção de entrega ausente." }, { status: 400 });
    }
    const address = body.shippingAddress;

    /* ── Frete ──
       Recotado no servidor de propósito: aceitar o valor vindo do navegador
       permitiria forjar um frete de centavos pelo console. */
    let freight;
    try {
      freight = await resolveChosenFreight(format, address.cep, shippingServiceId);
    } catch (err) {
      if (err instanceof FreightError) {
        console.error("[create-checkout] frete:", err.message, err.cause ?? "");
        return NextResponse.json({ error: err.message }, { status: 422 });
      }
      throw err;
    }
    if (!freight) {
      return NextResponse.json(
        { error: "Essa opção de entrega saiu do ar. Confira o CEP e escolha de novo." },
        { status: 409 },
      );
    }

    /* Se a transportadora mudou o preço entre a tela e o pagamento, não dá para
       simplesmente cobrar o novo valor: a pessoa aprovou outro. */
    const shown = body.shippingPriceCents;
    if (typeof shown === "number" && shown !== freight.priceCents) {
      return NextResponse.json(
        {
          error:
            "O frete mudou de " + formatPrice(shown) + " para " + formatPrice(freight.priceCents) +
            " enquanto você preenchia. Escolha a entrega de novo para confirmar.",
        },
        { status: 409 },
      );
    }

    /* ── Preço do pôster ──
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
    const shippingLabel = (freight.carrier + " " + freight.name).trim();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      customer_email: customerEmail,
      metadata: {
        orderId,
        format,
        shippingServiceId: freight.serviceId,
        shippingName: shippingLabel,
        shippingPriceCents: String(freight.priceCents),
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: shippingLabel,
            fixed_amount: { amount: freight.priceCents, currency: "brl" },
            ...(freight.deliveryDays
              ? {
                  delivery_estimate: {
                    minimum: { unit: "business_day" as const, value: freight.deliveryDays },
                    maximum: { unit: "business_day" as const, value: freight.deliveryDays },
                  },
                }
              : {}),
          },
        },
      ],
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
