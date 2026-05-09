import { Resend } from "resend";
import type { PosterOrder } from "@/types/poster";
import { FORMAT_DIMS } from "@/lib/posterMap";

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = "gabriel@sistemap.com.br";
const FROM = "Guardei.art <pedidos@guardei.art>";

function formatAmount(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatLabel(format: string) {
  return FORMAT_DIMS[format as keyof typeof FORMAT_DIMS]?.label ?? format;
}

/* ─────────────────────────────────────────────
   EMAIL PARA O ADMIN
───────────────────────────────────────────── */
export async function sendAdminNotification(
  order: PosterOrder,
  orderId: string,
  stripeSessionId: string,
  amountPaid: number,
  paymentIntentId?: string,
) {
  const contactLine =
    order.contactType === "whatsapp"
      ? `<a href="https://wa.me/55${order.customerContact.replace(/\D/g, "")}" style="color:#b8860b">📱 ${order.customerContact}</a>`
      : `<a href="mailto:${order.customerContact}" style="color:#b8860b">✉️ ${order.customerContact}</a>`;

  await resend.emails.send({
    from: FROM,
    to: [ADMIN_EMAIL],
    subject: `💳 Pedido pago — ${order.customerName} — ${formatAmount(amountPaid)}`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#2a1f14;background:#fdf8f2;padding:32px;border-radius:8px">
        <h2 style="margin:0 0 4px;color:#b8860b;font-size:20px">🖼️ Novo pedido pago</h2>
        <p style="margin:0 0 24px;color:#888;font-size:13px">Guardei.art · pedido #${orderId.slice(0, 8).toUpperCase()}</p>

        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr style="border-bottom:1px solid #e8ddd0">
            <td style="padding:10px 0;color:#888;width:38%">Cliente</td>
            <td style="padding:10px 0;font-weight:600">${order.customerName}</td>
          </tr>
          <tr style="border-bottom:1px solid #e8ddd0">
            <td style="padding:10px 0;color:#888">Contato</td>
            <td style="padding:10px 0">${contactLine}</td>
          </tr>
          <tr style="border-bottom:1px solid #e8ddd0">
            <td style="padding:10px 0;color:#888">Email da conta</td>
            <td style="padding:10px 0">${order.userEmail ?? "—"}</td>
          </tr>
          <tr style="border-bottom:1px solid #e8ddd0">
            <td style="padding:10px 0;color:#888">Formato</td>
            <td style="padding:10px 0">${formatLabel(order.format)}</td>
          </tr>
          <tr style="border-bottom:1px solid #e8ddd0">
            <td style="padding:10px 0;color:#888">Fotos</td>
            <td style="padding:10px 0">${order.items.length} localização(ões)</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888">Valor pago</td>
            <td style="padding:10px 0;font-weight:700;color:#b8860b;font-size:16px">${formatAmount(amountPaid)}</td>
          </tr>
        </table>

        <div style="margin-top:24px;display:flex;gap:12px">
          <a href="https://dashboard.stripe.com/payments/${paymentIntentId ?? stripeSessionId}"
            style="display:inline-block;background:#635bff;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:13px;font-weight:600">
            Ver no Stripe →
          </a>
        </div>

        <p style="margin-top:24px;font-size:11px;color:#aaa">
          Sessão: ${stripeSessionId}
        </p>
      </div>
    `,
  });
}

/* ─────────────────────────────────────────────
   EMAIL PARA O CLIENTE
───────────────────────────────────────────── */
export async function sendCustomerConfirmation(
  order: PosterOrder,
  orderId: string,
  customerEmail: string,
  amountPaid: number,
) {
  await resend.emails.send({
    from: FROM,
    to: [customerEmail],
    subject: `Seu poster está confirmado! 🖼️`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#2a1f14">

        <!-- Header -->
        <div style="background:#0a0a0a;padding:28px 32px;border-radius:8px 8px 0 0;text-align:center">
          <div style="font-size:32px;margin-bottom:8px">🖼️</div>
          <h1 style="margin:0;color:#f5f0e8;font-size:22px;font-weight:700;letter-spacing:-0.02em">
            Pedido confirmado!
          </h1>
          <p style="margin:8px 0 0;color:#888;font-size:13px">
            Guardei.art · pedido #${orderId.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <!-- Body -->
        <div style="background:#fdf8f2;padding:28px 32px;border:1px solid #e8ddd0;border-top:none">
          <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#2a1f14">
            Olá, <strong>${order.customerName}</strong>! Recebemos seu pagamento com sucesso.
            Seu poster personalizado já está na fila de produção. 🎉
          </p>

          <!-- Resumo -->
          <div style="background:#fff;border:1px solid #e8ddd0;border-radius:6px;padding:16px 20px;margin-bottom:20px">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr style="border-bottom:1px solid #f0e8dc">
                <td style="padding:8px 0;color:#888">Formato</td>
                <td style="padding:8px 0;text-align:right;font-weight:600">${formatLabel(order.format)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#888">Valor pago</td>
                <td style="padding:8px 0;text-align:right;font-weight:700;color:#b8860b">${formatAmount(amountPaid)}</td>
              </tr>
            </table>
          </div>

          <!-- Próximos passos -->
          <h3 style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#888">
            O que acontece agora?
          </h3>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${["Seu poster está sendo preparado com seus lugares favoritos.", "Entraremos em contato em breve para confirmar o endereço de entrega.", "Você receberá seu poster impresso e com moldura em casa."].map((step, i) => `
              <div style="display:flex;align-items:flex-start;gap:12px;font-size:14px;line-height:1.5">
                <div style="width:22px;height:22px;border-radius:50%;background:#b8860b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;margin-top:1px">${i + 1}</div>
                <span style="color:#2a1f14">${step}</span>
              </div>
            `).join("")}
          </div>

          <!-- Contato -->
          <div style="margin-top:24px;padding:14px 16px;background:#fff;border:1px dashed #e8ddd0;border-radius:6px;font-size:13px;color:#888;line-height:1.6">
            Dúvidas? Fale conosco em
            <a href="mailto:contato@guardei.art" style="color:#b8860b;text-decoration:none">contato@guardei.art</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:16px 32px;text-align:center;font-size:11px;color:#bbb">
          Guardei.art — Suas memórias, no mapa.
        </div>
      </div>
    `,
  });
}
