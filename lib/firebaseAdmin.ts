import admin from "firebase-admin";

/**
 * Inicialização preguiçosa: o build não tem as credenciais, e tocar nelas em
 * tempo de módulo quebraria a compilação das rotas.
 */
function ensureApp(): admin.app.App {
  if (admin.apps.length && admin.apps[0]) return admin.apps[0];

  const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // painéis de deploy costumam guardar a chave com \n literal
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Variáveis de ambiente do Firebase Admin ausentes.");
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export function getAdminDb(): admin.firestore.Firestore {
  return ensureApp().firestore();
}

export function getAdminAuth(): admin.auth.Auth {
  return ensureApp().auth();
}

/** Quem pode marcar pedidos como enviados. */
export const ADMIN_EMAILS = ["gabriel@sistemap.com.br"];

export type Caller = { uid: string; email: string | null };

/**
 * Resultado da verificação, separando os dois motivos de recusa.
 *
 * Antes os dois caíam em 401, o que escondia falta de credencial no servidor
 * atrás de "token inválido" — e como o cliente dispara e esquece, o e-mail
 * simplesmente não saía sem deixar rastro em lugar nenhum.
 */
export type CallerResult =
  | { ok: true; caller: Caller }
  | { ok: false; reason: "unauthenticated" | "misconfigured" };

/** Diz se as credenciais do Admin existem, sem tentar inicializar. */
export function adminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  );
}

/**
 * Confere o token do Firebase enviado no cabeçalho.
 *
 * As rotas não podem confiar num uid vindo no corpo da requisição: qualquer um
 * mandaria o uid alheio. O token é assinado pelo Firebase e verificado aqui.
 */
export async function verifyCaller(req: Request): Promise<CallerResult> {
  if (!adminConfigured()) {
    console.error("[firebaseAdmin] credenciais ausentes no ambiente");
    return { ok: false, reason: "misconfigured" };
  }
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return { ok: false, reason: "unauthenticated" };
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { ok: true, caller: { uid: decoded.uid, email: decoded.email ?? null } };
  } catch {
    return { ok: false, reason: "unauthenticated" };
  }
}

/** Resposta padrão para credencial ausente: 503 diferencia de token inválido. */
export function misconfiguredResponse() {
  return Response.json(
    { error: "Serviço indisponível: credenciais do servidor não configuradas." },
    { status: 503 },
  );
}

export function isAdmin(caller: Caller | null): boolean {
  return Boolean(caller?.email && ADMIN_EMAILS.includes(caller.email));
}
