import admin from "firebase-admin";

/**
 * Inicialização preguiçosa: o build não tem as credenciais, e tocar nelas em
 * tempo de módulo quebraria a compilação das rotas.
 */
function ensureApp(): admin.app.App {
  if (admin.apps.length && admin.apps[0]) return admin.apps[0];

  const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  /* O painel da Vercel guarda a chave como ela sai do JSON do Firebase: com
     \n de dois caracteres, nao com quebra de linha de verdade. O padrao
     aqui era /\n/g, que troca quebra real por quebra real e portanto nao
     fazia nada: a chave chegava numa linha so, o cert falhava, e como todo
     chamador engolia o erro isso virava "e-mail nao sai em producao". */
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

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

const ADMIN_VARS = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
] as const;

/* Toda rota que verifica quem chama também manda e-mail. Sem a chave do Resend
   o envio falhava calado, exatamente como acontecia com o Firebase antes. */
const EMAIL_VARS = ["RESEND_API_KEY"] as const;

/** Quais credenciais faltam. Nomes de variável não são segredo; os valores sim. */
export function missingAdminVars(): string[] {
  return ADMIN_VARS.filter((v) => !process.env[v]?.trim());
}

export function missingServerVars(): string[] {
  return [...ADMIN_VARS, ...EMAIL_VARS].filter((v) => !process.env[v]?.trim());
}

/** Diz se as credenciais do Admin existem, sem tentar inicializar. */
export function adminConfigured(): boolean {
  return missingAdminVars().length === 0;
}

/**
 * Confere o token do Firebase enviado no cabeçalho.
 *
 * As rotas não podem confiar num uid vindo no corpo da requisição: qualquer um
 * mandaria o uid alheio. O token é assinado pelo Firebase e verificado aqui.
 */
export async function verifyCaller(req: Request): Promise<CallerResult> {
  if (missingServerVars().length > 0) {
    console.error("[firebaseAdmin] credenciais ausentes:", missingServerVars().join(", "));
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
  const faltando = missingServerVars();
  console.error("[firebaseAdmin] variáveis ausentes:", faltando.join(", "));
  return Response.json(
    {
      error: "Serviço indisponível: credenciais do servidor não configuradas.",
      // só os nomes: saber que falta uma variável não expõe o valor dela,
      // e sem isso descobrir qual exige acesso ao log do servidor
      missing: faltando,
    },
    { status: 503 },
  );
}

export function isAdmin(caller: Caller | null): boolean {
  return Boolean(caller?.email && ADMIN_EMAILS.includes(caller.email));
}
