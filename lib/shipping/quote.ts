import "server-only";
import type { PosterFormat } from "@/types/poster";
import { POSTER_PRICES } from "@/lib/posterPricing";
import { melhorEnvio } from "./melhorEnvio";
import { devStub } from "./devStub";
import { packageFor, validatePackage } from "./packaging";
import { FreightError, normalizeCep, type FreightOption } from "./types";
import { applyCarrierPolicy } from "./policy";

/**
 * Provedor ativo. Trocar aqui troca o frete do site inteiro.
 *
 * Sem token em desenvolvimento cai no simulador, para dar para rodar a compra
 * na máquina sem cadastro. Em produção nunca simula: se faltar credencial, o
 * adaptador real falha e a venda para — que é o comportamento certo, porque
 * cobrar frete inventado é pior do que não vender.
 */
function activeProvider() {
  const useStub =
    process.env.NODE_ENV !== "production" && !process.env.MELHOR_ENVIO_TOKEN;
  return useStub ? devStub : melhorEnvio;
}

/**
 * Cota o frete de um formato para um CEP.
 *
 * Só o servidor chama: o checkout, para registrar quanto a postagem vai nos
 * custar, e a rota de prazo, que devolve dias e nunca preço. O cliente não
 * escolhe nem paga transportadora, então nada disso passa pelo navegador.
 */
export async function quoteFreight(
  format: PosterFormat,
  destinationCepRaw: string,
): Promise<FreightOption[]> {
  const provider = activeProvider();
  // em desenvolvimento uma origem provisória evita travar o teste do fluxo
  const originFallback = provider === devStub ? "01001000" : "";
  const originCep = normalizeCep(process.env.SHIPPING_ORIGIN_CEP || originFallback);
  if (!originCep) {
    throw new FreightError("CEP de origem não configurado.");
  }

  const destinationCep = normalizeCep(destinationCepRaw);
  if (!destinationCep) {
    throw new FreightError("CEP inválido.");
  }

  const packageSpec = packageFor(format);
  const invalid = validatePackage(packageSpec);
  if (invalid) throw new FreightError(invalid);

  const options = await provider.quote({
    originCep,
    destinationCep,
    packageSpec,
    // segura o valor do produto: extravio devolve o preço do quadro de memórias
    declaredValueCents: POSTER_PRICES[format],
  });

  if (options.length === 0) {
    throw new FreightError("Nenhuma transportadora atende esse CEP.");
  }

  /* A politica entra antes de qualquer coisa ver a lista, inclusive o checkout:
     e o mesmo caminho que revalida o servico escolhido. */
  const permitidas = applyCarrierPolicy(options, destinationCep);
  if (permitidas.length === 0) {
    throw new FreightError("Nenhuma entrega disponivel para esse CEP.");
  }
  return permitidas;
}
