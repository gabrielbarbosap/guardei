import { NextResponse } from "next/server";
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
    resendFrom: process.env.EMAIL_FROM ?? null,
  });
}
