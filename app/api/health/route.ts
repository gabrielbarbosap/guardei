import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { missingServerVars } from "@/lib/firebaseAdmin";

/**
 * Diagnóstico de deploy.
 *
 * Existe porque as rotas de e-mail respondem "ok" de propósito — a de senha
 * esconde se a conta existe, e as outras disparam e esquecem. Isso torna
 * impossível saber, de fora, se o problema é credencial ausente ou se o código
 * publicado é antigo. Aqui as duas coisas aparecem direto.
 *
 * Só nomes de variável e o commit publicado: nada disso é segredo.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    env: process.env.VERCEL_ENV ?? "local",
    missing: missingServerVars(),
    // a chave pode existir e ser inválida; o prefixo mostra que veio inteira
    resendKeyPrefix: process.env.RESEND_API_KEY?.trim().slice(0, 3) ?? null,
    /* Impressao digital da chave, nao a chave. Serve para dizer se o painel
       guarda a mesma que funciona aqui: prefixo igual nao prova nada quando
       a chave antiga e a nova comecam do mesmo jeito. */
    resendKeyHash: createHash("sha256")
      .update(process.env.RESEND_API_KEY?.trim() ?? "")
      .digest("hex")
      .slice(0, 12),
    resendFrom: process.env.EMAIL_FROM ?? null,
    /* Quantas linhas a chave do Firebase tem depois de desescapada. Uma so
       significa que os \n literais nao viraram quebra de linha e o cert vai
       falhar — foi exatamente o que aconteceu aqui, e nada acusava. */
    adminKeyLines: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "")
      .replace(/\\n/g, "\n")
      .split("\n").length,
    /* Frete: nomes e formatos, nunca os valores. O CEP de origem e endereco
       residencial e o token e credencial — o que importa aqui e se chegaram
       inteiros, nao quanto valem. */
    shippingOriginCepOk: /^\d{8}$/.test((process.env.SHIPPING_ORIGIN_CEP ?? "").trim()),
    melhorEnvioTokenLen: (process.env.MELHOR_ENVIO_TOKEN ?? "").length,
    // diferenca entre bruto e aparado denuncia espaco ou quebra de linha colada
    melhorEnvioTokenSujo:
      (process.env.MELHOR_ENVIO_TOKEN ?? "") !== (process.env.MELHOR_ENVIO_TOKEN ?? "").trim(),
  });
}
