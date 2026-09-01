import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, misconfiguredResponse, missingServerVars } from "@/lib/firebaseAdmin";
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
  if (missingServerVars().length > 0) return misconfiguredResponse();

  const site = process.env.NEXT_PUBLIC_BASE_URL ?? "https://guardei.art";

  /* Duas falhas diferentes moram aqui e nao podem compartilhar resposta.
     Conta inexistente e silencio proposital: dizer "esse e-mail nao existe"
     entregaria a estranhos quem tem conta. Ja o envio que a Resend recusa e
     defeito nosso, e responder "ok" para isso foi justamente o que escondeu
     o problema em producao. */
  let link: string;
  try {
    link = await getAdminAuth().generatePasswordResetLink(email, { url: `${site}/` });
  } catch (err) {
    console.error("[auth/reset] conta nao encontrada ou Firebase recusou:", err);
    return NextResponse.json({ ok: true });
  }

  try {
    await sendPasswordReset(email, link);
  } catch (err) {
    console.error("[auth/reset] falha no envio:", err);
    return NextResponse.json(
      { error: "Nao foi possivel enviar o e-mail agora." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}