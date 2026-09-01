import { auth } from "./auth";

/**
 * Chama uma rota de e-mail em nome de quem está logado.
 *
 * O disparo mora no servidor porque a chave do Resend é secreta; o cliente só
 * avisa que o evento aconteceu, provando quem é com o token do Firebase.
 * Falhar aqui nunca pode atrapalhar o fluxo principal: e-mail que não sai é
 * problema para o log, não para quem está comprando.
 */
async function post(path: string, body?: Record<string, unknown>): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body ?? {}),
    });
  } catch (err) {
    console.error("[notify]", path, err);
  }
}

/** Boas-vindas — a rota ignora chamadas repetidas. */
export const notifyWelcome = () => post("/api/account/welcome");

/** Pedido registrado, antes do pagamento. */
export const notifyOrderCreated = (orderId: string) => post("/api/orders/created", { orderId });

/** Redefinição de senha: não exige login, então não manda token. */
export async function requestPasswordReset(email: string): Promise<void> {
  await fetch("/api/auth/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}
