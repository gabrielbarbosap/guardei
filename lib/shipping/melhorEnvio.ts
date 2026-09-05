import "server-only";
import {
  FreightError,
  type FreightOption,
  type FreightProvider,
  type FreightQuoteInput,
} from "./types";

/**
 * Adaptador do Melhor Envio.
 *
 * Cotar é gratuito e não exige contrato com os Correios — paga-se só a etiqueta
 * na hora de despachar. A resposta traz as transportadoras reais (PAC, SEDEX e
 * outras), então o cliente vê as mesmas opções de sempre.
 *
 * O token é secreto e nunca pode ir para o navegador: este módulo é server-only.
 */

const PROD_HOST = "https://melhorenvio.com.br";
const SANDBOX_HOST = "https://sandbox.melhorenvio.com.br";

type ApiQuote = {
  id: number | string;
  name?: string;
  price?: string | number;
  custom_price?: string | number;
  currency?: string;
  delivery_time?: number | null;
  custom_delivery_time?: number | null;
  company?: { name?: string };
  error?: string;
};

function host(): string {
  return process.env.MELHOR_ENVIO_SANDBOX === "true" ? SANDBOX_HOST : PROD_HOST;
}

/** "37.79" | 37.79 → 3779 centavos. Evita float no dinheiro. */
function toCents(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null;
  const normalized = typeof value === "number" ? value.toFixed(2) : value.trim().replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

export const melhorEnvio: FreightProvider = {
  id: "melhor_envio",

  async quote(input: FreightQuoteInput): Promise<FreightOption[]> {
    /* O painel de deploy guarda o valor exatamente como foi colado, e um
       token de 800 caracteres costuma vir com quebra de linha no fim. Um
       header Authorization com \n faz o fetch estourar antes de sair da
       maquina, e o erro que sobe e um generico "nao foi possivel falar com
       a transportadora" — sem nenhuma pista de que a causa era um espaco. */
    const token = process.env.MELHOR_ENVIO_TOKEN?.trim();
    if (!token) {
      throw new FreightError("Integração de frete não configurada.");
    }

    const { packageSpec: pkg } = input;
    const body = {
      from: { postal_code: input.originCep },
      to: { postal_code: input.destinationCep },
      products: [
        {
          id: "poster",
          width: pkg.widthCm,
          height: pkg.heightCm,
          length: pkg.lengthCm,
          weight: pkg.weightKg,
          insurance_value: input.declaredValueCents / 100,
          quantity: 1,
        },
      ],
      options: { receipt: false, own_hand: false },
    };

    let res: Response;
    try {
      res = await fetch(`${host()}/api/v2/me/shipment/calculate`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          // a API exige identificação da aplicação com contato técnico
          "User-Agent": process.env.MELHOR_ENVIO_USER_AGENT?.trim() || "Guardei (contato@guardei.art)",
        },
        body: JSON.stringify(body),
        // cotação é interativa: não deixa o cliente esperando indefinidamente
        signal: AbortSignal.timeout(12_000),
        cache: "no-store",
      });
    } catch (err) {
      // a causa vai junto: sem ela o log nao distingue timeout de header invalido
      const motivo = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error("[melhorEnvio] falha na chamada:", motivo);
      throw new FreightError("Não foi possível falar com a transportadora.", motivo);
    }

    if (!res.ok) {
      throw new FreightError(
        res.status === 401 || res.status === 403
          ? "Credencial de frete inválida."
          : "A transportadora recusou a consulta.",
        `HTTP ${res.status}`,
      );
    }

    let payload: unknown;
    try {
      payload = await res.json();
    } catch (err) {
      throw new FreightError("Resposta inválida da transportadora.", err);
    }
    if (!Array.isArray(payload)) {
      throw new FreightError("Resposta inesperada da transportadora.");
    }

    const options: FreightOption[] = [];
    for (const raw of payload as ApiQuote[]) {
      // serviços indisponíveis para o trecho voltam com `error` preenchido
      if (raw?.error) continue;
      // custom_price reflete as regras configuradas no painel; price é o cheio
      const priceCents = toCents(raw.custom_price) ?? toCents(raw.price);
      if (priceCents === null || priceCents <= 0) continue;

      const days = raw.custom_delivery_time ?? raw.delivery_time ?? null;
      options.push({
        serviceId: String(raw.id),
        name: raw.name?.trim() || "Entrega",
        carrier: raw.company?.name?.trim() || "Transportadora",
        priceCents,
        deliveryDays: typeof days === "number" && days > 0 ? days : null,
      });
    }

    return options.sort((a, b) => a.priceCents - b.priceCents);
  },
};
