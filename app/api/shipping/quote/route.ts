import { NextResponse, type NextRequest } from "next/server";
import { quoteFreight } from "@/lib/shipping/quote";
import { FreightError } from "@/lib/shipping/types";
import type { PosterFormat } from "@/types/poster";
import { POSTER_PRICES } from "@/lib/posterPricing";

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
    return NextResponse.json({ options });
  } catch (err) {
    if (err instanceof FreightError) {
      // mensagem já é adequada para mostrar a quem está comprando
      console.error("[shipping/quote]", err.message, err.cause ?? "");
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("[shipping/quote] erro inesperado:", err);
    return NextResponse.json({ error: "Erro ao calcular o frete." }, { status: 500 });
  }
}
