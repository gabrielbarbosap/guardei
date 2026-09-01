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
  /* So a conta inexistente merece silencio: dizer que um e-mail nao tem conta
     entregaria a estranhos quem esta cadastrado. Qualquer outra falha do
     Firebase e defeito nosso, e responder ok para ela foi o que escondeu a
     credencial quebrada em producao por dias. */
  let link: string;
  try {
    link = await getAdminAuth().generatePasswordResetLink(email, { url: site + "/" });
  } catch (err) {
    const code = (err as { code?: string }).code ?? "";
    if (code === "auth/user-not-found" || code === "auth/email-not-found") {
      return NextResponse.json({ ok: true });
    }
    console.error("[auth/reset] Firebase recusou:", code, err);
    return NextResponse.json(
      { error: "Nao foi possivel gerar o link agora.", code },
      { status: 502 },
    );
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
