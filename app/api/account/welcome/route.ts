import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb, misconfiguredResponse, verifyCaller } from "@/lib/firebaseAdmin";
import { sendWelcome } from "@/lib/emails";

/** Boas-vindas, uma única vez por conta. */
export async function POST(req: NextRequest) {
  const result = await verifyCaller(req);
  if (!result.ok) {
    return result.reason === "misconfigured"
      ? misconfiguredResponse()
      : NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const caller = result.caller;
  if (!caller.email) return NextResponse.json({ ok: true, skipped: "sem e-mail" });

  try {
    const ref = getAdminDb().collection("users").doc(caller.uid);
    const snap = await ref.get();

    /* A trava fica no documento, não no cliente: sem ela, cada login abrindo o
       app dispararia um "bem-vindo" de novo. */
    if (snap.exists && snap.data()?.welcomeSentAt) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const nome = snap.data()?.displayName as string | undefined;
    await sendWelcome(caller.email, nome ?? null);
    await ref.set({ welcomeSentAt: Date.now() }, { merge: true });

    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    console.error("[account/welcome]", err);
    return NextResponse.json({ error: "Falha ao enviar." }, { status: 500 });
  }
}
