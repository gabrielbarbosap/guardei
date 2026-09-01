import type { ShippingAddress } from "@/types/poster";

/**
 * Busca de endereço por CEP.
 *
 * Usa o ViaCEP, que é público, gratuito e aceita CORS — dá para chamar direto
 * do navegador. (A consulta de CEP dos Correios virou exclusiva de contrato
 * junto com o cálculo de frete, em 2023.)
 */
export type CepLookup = Pick<ShippingAddress, "street" | "district" | "city" | "state">;

export async function lookupCep(cep: string): Promise<CepLookup | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      erro?: boolean | string;
      logradouro?: string; bairro?: string; localidade?: string; uf?: string;
    };
    // CEP inexistente volta 200 com { "erro": true }
    if (data.erro) return null;
    return {
      street: data.logradouro ?? "",
      district: data.bairro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
    };
  } catch {
    return null;
  }
}

/** 12345678 → 12345-678, para exibição enquanto digita. */
export function formatCep(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
