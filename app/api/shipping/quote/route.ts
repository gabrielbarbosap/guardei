import { NextResponse, type NextRequest } from "next/server";
import { quoteFreight } from "@/lib/shipping/quote";
import { totalDeliveryDays } from "@/lib/shipping/policy";
import { FreightError } from "@/lib/shipping/types";
import type { PosterFormat } from "@/types/poster";
import { POSTER_PRICES } from "@/lib/posterPricing";

/**
 * Prazo de entrega para um CEP — sem preço.
 *
 * Antes esta rota devolvia as opções com valores, porque era o cliente quem
 * escolhia e pagava a transportadora. Agora o frete é nosso, e o que ele
 * paga não muda com o CEP: mandar os preços de volta para o navegador só
 * exporia nosso custo a qualquer um com o console aberto.
 *
 * O prazo continua valendo a viagem. Ele varia de 2 a mais de 20 dias úteis
 * conforme o destino, então prometer um número fixo na tela seria mentira para
 * quem mora longe.
 */
function isPosterFormat(value: unknown): value is PosterFormat {
  return typeof value === "string" && value in POSTER_PRICES;
}

export async function POST(req: NextRequest) {
  let body: { format?: unknown; cep?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!isPosterFormat(body.format) || typeof body.cep !== "string") {
    return NextResponse.json({ error: "Formato ou CEP ausente." }, { status: 400 });
  }

  try {
    const options = await quoteFreight(body.format, body.cep);
    // a mais barata é a que vamos despachar; o prazo dela é o que vale prometer
    const escolhida = options[0];
    return NextResponse.json({
      deliveryDays: totalDeliveryDays(escolhida?.deliveryDays ?? null),
    });
  } catch (err) {
    if (err instanceof FreightError) {
      console.error("[shipping/quote]", err.message, err.cause ?? "");
      /* Sem prazo a compra continua: o frete é grátis de qualquer jeito, e
         travar a venda porque a estimativa falhou seria desproporcional. */
      return NextResponse.json({ deliveryDays: null });
    }
    console.error("[shipping/quote] erro inesperado:", err);
    return NextResponse.json({ deliveryDays: null });
  }
}
