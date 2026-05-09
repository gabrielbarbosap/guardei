import { Resend } from "resend";
import type { PosterOrder } from "@/types/poster";

const OWNER_EMAIL = "gabriel@sistemap.com.br";
const OWNER_WHATSAPP = "5581997411297";

function formatScope(order: PosterOrder): string {
  if (order.scope.type === "world") return "Mundo inteiro";
  if (order.scope.type === "continent") return order.scope.label;
  return order.scope.countryName;
}

function buildEmailHtml(order: PosterOrder, orderId: string): string {
  const scope = formatScope(order);
  const formatLabels: Record<string, string> = {
    portrait_40x60: "Retrato 40×60 cm",
    square_50x50: "Quadrado 50×50 cm",
    landscape_60x40: "Paisagem 60×40 cm",
    a3: "A3 29.7×42 cm",
  };
  const contactLine =
    order.contactType === "whatsapp"
      ? `<a href="https://wa.me/55${order.customerContact.replace(/\D/g, "")}">WhatsApp: ${order.customerContact}</a>`
      : `Email: ${order.customerContact}`;

  return `
    <div style="font-family:sans-serif;max-width:520px;padding:24px;color:#2a1f14">
      <h2 style="color:#b8860b;margin-top:0">🖼️ Novo pedido de poster — Guardei</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#666;width:40%">ID do pedido</td><td style="font-weight:bold">${orderId}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Cliente</td><td>${order.customerName}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Contato</td><td>${contactLine}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Email da conta</td><td>${order.userEmail ?? "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Escopo do mapa</td><td>${scope}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Formato</td><td>${formatLabels[order.format] ?? order.format}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Fotos selecionadas</td><td>${order.items.length}</td></tr>
      </table>
      <p style="margin-top:20px;font-size:13px;color:#888">
        Acesse o Firebase Console → coleção <code>posterOrders</code> para ver o pedido completo.
      </p>
    </div>
  `;
}

export async function POST(req: Request) {
  const { order, orderId } = await req.json() as { order: PosterOrder; orderId: string };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[notify-order] RESEND_API_KEY not set. Order saved:", orderId);
    return Response.json({ ok: true, method: "firestore-only" });
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "Guardei <onboarding@resend.dev>",
      to: [OWNER_EMAIL],
      subject: `Novo pedido de poster — ${order.customerName}`,
      html: buildEmailHtml(order, orderId),
    });

    const waText = encodeURIComponent(
      `Novo pedido de poster no Guardei!\nCliente: ${order.customerName}\nContato: ${order.customerContact}\nEscopo: ${formatScope(order)}\nFormato: ${order.format}\nID: ${orderId}`,
    );
    console.log(`[notify-order] WhatsApp: https://wa.me/${OWNER_WHATSAPP}?text=${waText}`);

    return Response.json({ ok: true, method: "email" });
  } catch (err) {
    console.error("[notify-order] email failed:", err);
    return Response.json({ ok: true, method: "firestore-only" });
  }
}
