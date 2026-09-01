import { NextResponse, type NextRequest } from "next/server";
import { adminConfigured, getAdminAuth, misconfiguredResponse } from "@/lib/firebaseAdmin";
import { sendPasswordReset } from "@/lib/emails";

/**
 * Redefinição de senha com e-mail próprio.
 *
 * O link é gerado pelo Firebase — ele continua dono do token e da validade, que
 * é o que garante a segurança. Só a mensagem é nossa, para não destoar do resto
 * da marca.
 */
export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = await req.json() as { email?: unknown };
    if (typeof body.email !== "string" || !body.email.includes("@")) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }
    email = body.email.trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  /* Credencial ausente é problema nosso, não da pessoa: devolver "ok" aqui
     esconderia uma falha de configuração atrás do silêncio que existe para
     proteger a privacidade de quem tem conta. */
  if (!adminConfigured()) return misconfiguredResponse();

  try {
    const site = process.env.NEXT_PUBLIC_BASE_URL ?? "https://guardei.art";
    const link = await getAdminAuth().generatePasswordResetLink(email, { url: `${site}/` });
    await sendPasswordReset(email, link);
  } catch (err) {
    /* Conta inexistente cai aqui. A resposta é a mesma dos casos de sucesso de
       propósito: dizer "esse e-mail não existe" entregaria a estranhos quem tem
       conta no site. O erro fica no log, não na resposta. */
    console.error("[auth/reset]", err);
  }

  return NextResponse.json({ ok: true });
}
