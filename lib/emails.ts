import { Resend } from "resend";
import type { PosterOrder } from "@/types/poster";
import { FORMAT_DIMS, LEGACY_FORMAT_LABELS } from "@/lib/posterMap";

const resend = new Resend(process.env.RESEND_API_KEY);

type Envio = Parameters<typeof resend.emails.send>[0];

/**
 * Envia e transforma recusa em erro.
 *
 * O SDK do Resend nao lanca excecao quando a API recusa a mensagem: ele devolve
 * { data, error }. Como as chamadas so aguardavam o send, chave invalida,
 * dominio nao verificado ou remetente errado sumiam sem deixar rastro — o
 * servidor seguia em frente achando que tinha enviado. Aqui a recusa vira
 * excecao, que e o que as rotas ja sabem registrar.
 */
async function deliver(payload: Envio) {
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    console.error("[emails] Resend recusou:", error.name, error.message);
    throw new Error(`Resend: ${error.name} — ${error.message}`);
  }
  return data;
}

const ADMIN_EMAIL = "gabriel@sistemap.com.br";
const FROM = "Guardei.art <pedidos@guardei.art>";
const SITE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://guardei.art";

function formatAmount(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatLabel(format: string) {
  // pedidos anteriores a troca do A2 pelo A3 ainda chegam aqui para envio
  return FORMAT_DIMS[format as keyof typeof FORMAT_DIMS]?.label
    ?? LEGACY_FORMAT_LABELS[format]
    ?? format;
}

function orderRef(orderId: string) {
  return orderId.slice(0, 8).toUpperCase();
}

/**
 * Moldura comum a todos os e-mails.
 *
 * Um só lugar define cabeçalho, corpo e rodapé — antes cada mensagem repetia o
 * HTML inteiro, e bastava alguém mexer numa para as outras destoarem. E-mail
 * ainda exige estilo inline e tabelas: muitos clientes ignoram <style> e flex.
 */
function layout(opts: {
  emoji: string;
  title: string;
  subtitle?: string;
  body: string;
}): string {
  return `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;color:#2a1f14">
      <div style="background:#0a0a0a;padding:28px 32px;border-radius:8px 8px 0 0;text-align:center">
        <div style="font-size:32px;margin-bottom:8px">${opts.emoji}</div>
        <h1 style="margin:0;color:#f5f0e8;font-size:22px;font-weight:700;letter-spacing:-0.02em">
          ${opts.title}
        </h1>
        ${opts.subtitle ? `<p style="margin:8px 0 0;color:#888;font-size:13px">${opts.subtitle}</p>` : ""}
      </div>

      <div style="background:#fdf8f2;padding:28px 32px;border:1px solid #e8ddd0;border-top:none">
        ${opts.body}
      </div>

      <div style="padding:16px 32px;text-align:center;font-size:11px;color:#bbb">
        Guardei.art — Suas memórias, no mapa.
      </div>
    </div>
  `;
}

/** Lista numerada de próximos passos, no mesmo estilo em todos os e-mails. */
function steps(items: string[]): string {
  return items
    .map(
      (step, i) => `
      <div style="margin-bottom:10px;font-size:14px;line-height:1.5">
        <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background:#b8860b;color:#fff;text-align:center;line-height:22px;font-size:11px;font-weight:700;margin-right:8px">${i + 1}</span>
        <span style="color:#2a1f14">${step}</span>
      </div>`,
    )
    .join("");
}

function button(href: string, label: string): string {
  return `
    <a href="${href}" style="display:inline-block;background:#b8860b;color:#fff;text-decoration:none;
       padding:13px 26px;border-radius:6px;font-size:14px;font-weight:600">${label}</a>`;
}

function helpBox(): string {
  return `
    <div style="margin-top:24px;padding:14px 16px;background:#fff;border:1px dashed #e8ddd0;border-radius:6px;font-size:13px;color:#888;line-height:1.6">
      Dúvidas? Fale com a gente em
      <a href="mailto:contato@guardei.art" style="color:#b8860b;text-decoration:none">contato@guardei.art</a>
    </div>`;
}

/** Endereço em uma linha, pronto para copiar na etiqueta. */
function addressBlock(order: PosterOrder): string {
  const a = order.shippingAddress;
  if (!a) return `<em style="color:#b53d2b">não informado</em>`;
  const line2 = [a.district, `${a.city}/${a.state}`].filter(Boolean).join(" · ");
  const comp = a.complement ? `, ${a.complement}` : "";
  return [
    `${a.street}, ${a.number}${comp}`,
    line2,
    `CEP ${a.cep.replace(/^(\d{5})(\d{3})$/, "$1-$2")}`,
  ].join("<br>");
}

/** Serviço de entrega escolhido e quanto foi cobrado por ele. */
function shippingLine(order: PosterOrder): string {
  const s = order.shipping;
  if (!s) return "—";
  const prazo = s.deliveryDays ? ` · ${s.deliveryDays} dia(s) útil(eis)` : "";
  return `${s.carrier} ${s.name} — ${formatAmount(s.priceCents)}${prazo}`;
}

function shippingStep(order: PosterOrder): string {
  const s = order.shipping;
  const cidade = order.shippingAddress
    ? ` para ${order.shippingAddress.city}/${order.shippingAddress.state}`
    : "";
  if (!s) return `Enviamos${cidade} assim que a impressão ficar pronta.`;
  const prazo = s.deliveryDays
    ? ` com entrega estimada em ${s.deliveryDays} dia(s) útil(eis) após a postagem`
    : "";
  return `Envio por ${s.carrier} ${s.name}${cidade}${prazo}.`;
}

/* ─────────────────────────────────────────────
   1. CONTA CRIADA
───────────────────────────────────────────── */
export async function sendWelcome(to: string, name?: string | null) {
  const primeiroNome = name?.trim().split(/\s+/)[0];
  await deliver({
    from: FROM,
    to: [to],
    subject: "Seu mapa de memórias está pronto",
    html: layout({
      emoji: "📍",
      title: "Bem-vindo ao guardei",
      subtitle: "um mapa de memórias. só seu.",
      body: `
        <p style="margin:0 0 20px;font-size:15px;line-height:1.65">
          ${primeiroNome ? `Olá, <strong>${primeiroNome}</strong>! ` : ""}Seu mapa está criado e vazio —
          do jeito que todo mapa começa.
        </p>
        <h3 style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#888">
          Por onde começar
        </h3>
        ${steps([
          "Toque em qualquer lugar do mapa para marcar onde uma memória aconteceu.",
          "Escolha a foto, escreva uma linha e diga quando foi.",
          "Com algumas memórias guardadas, elas podem virar um pôster impresso.",
        ])}
        <div style="margin-top:24px;text-align:center">${button(`${SITE}/map`, "Abrir meu mapa")}</div>
        ${helpBox()}
      `,
    }),
  });
}

/* ─────────────────────────────────────────────
   2. RECUPERAR SENHA
───────────────────────────────────────────── */
export async function sendPasswordReset(to: string, link: string) {
  await deliver({
    from: FROM,
    to: [to],
    subject: "Redefinir sua senha do guardei",
    html: layout({
      emoji: "🔑",
      title: "Redefinir senha",
      body: `
        <p style="margin:0 0 20px;font-size:15px;line-height:1.65">
          Recebemos um pedido para trocar a senha da sua conta. Clique no botão abaixo
          para escolher uma nova.
        </p>
        <div style="margin:24px 0;text-align:center">${button(link, "Criar nova senha")}</div>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#888">
          O link vale por uma hora e só pode ser usado uma vez.
          <strong style="color:#2a1f14">Se não foi você quem pediu, ignore este e-mail</strong> —
          sua senha continua a mesma.
        </p>
        ${helpBox()}
      `,
    }),
  });
}

/* ─────────────────────────────────────────────
   3. PÔSTER CRIADO (aguardando pagamento)
───────────────────────────────────────────── */
export async function sendOrderCreated(order: PosterOrder, orderId: string, to: string) {
  const frete = order.shipping?.priceCents ?? 0;
  const total = order.shipping ? `${formatAmount(frete)} de frete` : "";
  await deliver({
    from: FROM,
    to: [to],
    subject: `Seu pôster está reservado — pedido #${orderRef(orderId)}`,
    html: layout({
      emoji: "🖼️",
      title: "Pedido registrado",
      subtitle: `Guardei.art · pedido #${orderRef(orderId)}`,
      body: `
        <p style="margin:0 0 20px;font-size:15px;line-height:1.65">
          Olá, <strong>${order.customerName}</strong>! Guardamos a arte do seu pôster.
          Ele entra em produção assim que o pagamento for confirmado.
        </p>

        <div style="background:#fff;border:1px solid #e8ddd0;border-radius:6px;padding:16px 20px;margin-bottom:20px">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr style="border-bottom:1px solid #f0e8dc">
              <td style="padding:8px 0;color:#888">Formato</td>
              <td style="padding:8px 0;text-align:right;font-weight:600">${formatLabel(order.format)}</td>
            </tr>
            <tr style="border-bottom:1px solid #f0e8dc">
              <td style="padding:8px 0;color:#888">Memórias</td>
              <td style="padding:8px 0;text-align:right">${order.items.length}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888">Entrega</td>
              <td style="padding:8px 0;text-align:right">${shippingLine(order)}</td>
            </tr>
          </table>
        </div>

        <p style="margin:0;font-size:13px;line-height:1.6;color:#888">
          Se você fechou a página antes de pagar, é só voltar ao mapa e montar de novo —
          nada foi cobrado${total ? ` (${total} incluído no total)` : ""}.
        </p>
        ${helpBox()}
      `,
    }),
  });
}

/* ─────────────────────────────────────────────
   4. PÔSTER PAGO
───────────────────────────────────────────── */
export async function sendCustomerConfirmation(
  order: PosterOrder,
  orderId: string,
  customerEmail: string,
  amountPaid: number,
) {
  await deliver({
    from: FROM,
    to: [customerEmail],
    subject: "Seu pôster está confirmado! 🖼️",
    html: layout({
      emoji: "🖼️",
      title: "Pedido confirmado!",
      subtitle: `Guardei.art · pedido #${orderRef(orderId)}`,
      body: `
        <p style="margin:0 0 20px;font-size:15px;line-height:1.65">
          Olá, <strong>${order.customerName}</strong>! Recebemos seu pagamento com sucesso.
          Seu pôster já está na fila de produção.
        </p>

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

        <h3 style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;color:#888">
          O que acontece agora?
        </h3>
        ${steps([
          "Seu pôster está sendo preparado com seus lugares favoritos.",
          shippingStep(order),
          "Avisamos assim que ele for postado, com o código de rastreio.",
        ])}
        ${helpBox()}
      `,
    }),
  });
}

/* ─────────────────────────────────────────────
   5. PÔSTER ENVIADO
───────────────────────────────────────────── */
export async function sendOrderShipped(
  order: PosterOrder,
  orderId: string,
  to: string,
  tracking: { code: string; url?: string },
) {
  const destino = order.shippingAddress
    ? `${order.shippingAddress.city}/${order.shippingAddress.state}`
    : "seu endereço";
  const prazo = order.shipping?.deliveryDays
    ? `A estimativa é de ${order.shipping.deliveryDays} dia(s) útil(eis) a partir da postagem.`
    : "";

  await deliver({
    from: FROM,
    to: [to],
    subject: `Seu pôster saiu para entrega 📦 — pedido #${orderRef(orderId)}`,
    html: layout({
      emoji: "📦",
      title: "Seu pôster está a caminho",
      subtitle: `Guardei.art · pedido #${orderRef(orderId)}`,
      body: `
        <p style="margin:0 0 20px;font-size:15px;line-height:1.65">
          Olá, <strong>${order.customerName}</strong>! Seu pôster foi postado e está indo
          para ${destino}. ${prazo}
        </p>

        <div style="background:#fff;border:1px solid #e8ddd0;border-radius:6px;padding:18px 20px;margin-bottom:20px;text-align:center">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:#888;margin-bottom:8px">
            código de rastreio
          </div>
          <div style="font-family:monospace;font-size:20px;font-weight:700;letter-spacing:0.08em;color:#2a1f14">
            ${tracking.code}
          </div>
          ${tracking.url ? `<div style="margin-top:16px">${button(tracking.url, "Acompanhar entrega")}</div>` : ""}
        </div>

        <div style="background:#fff;border:1px solid #e8ddd0;border-radius:6px;padding:16px 20px;margin-bottom:20px;font-size:14px;line-height:1.6">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:#888;margin-bottom:8px">
            endereço de entrega
          </div>
          ${addressBlock(order)}
        </div>

        <p style="margin:0;font-size:13px;line-height:1.6;color:#888">
          O rastreio pode levar algumas horas para aparecer no site da transportadora.
        </p>
        ${helpBox()}
      `,
    }),
  });
}

/* ─────────────────────────────────────────────
   AVISO PARA O ADMIN
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
      ? `<a href="https://wa.me/55${order.customerContact.replace(/\D/g, "")}" style="color:#b8860b">${order.customerContact}</a>`
      : `<a href="mailto:${order.customerContact}" style="color:#b8860b">${order.customerContact}</a>`;

  const linha = (rotulo: string, valor: string) => `
    <tr style="border-bottom:1px solid #e8ddd0">
      <td style="padding:10px 0;color:#888;width:38%;vertical-align:top">${rotulo}</td>
      <td style="padding:10px 0;line-height:1.6">${valor}</td>
    </tr>`;

  await deliver({
    from: FROM,
    to: [ADMIN_EMAIL],
    subject: `Pedido pago — ${order.customerName} — ${formatAmount(amountPaid)}`,
    html: layout({
      emoji: "💳",
      title: "Novo pedido pago",
      subtitle: `Guardei.art · pedido #${orderRef(orderId)}`,
      body: `
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${linha("Cliente", `<strong>${order.customerName}</strong>`)}
          ${linha("Contato", contactLine)}
          ${linha("Email da conta", order.userEmail ?? "—")}
          ${linha("Formato", formatLabel(order.format))}
          ${linha("Entrega", shippingLine(order))}
          ${linha("Endereço", addressBlock(order))}
          ${linha("Fotos", String(order.items.length))}
          ${linha(
            "Arte para impressão",
            order.posterImageUrl
              ? `<a href="${order.posterImageUrl}" style="color:#b8860b">abrir arquivo</a>`
              // o upload da arte acontece depois de criar o pedido: se falhou,
              // e melhor o aviso dizer isso do que a linha simplesmente sumir
              : "<span style=\"color:#c0392b\">não gerada — verificar antes de imprimir</span>",
          )}
          ${linha("Valor pago", `<strong style="color:#b8860b">${formatAmount(amountPaid)}</strong>`)}
          ${linha("Stripe", `${stripeSessionId}${paymentIntentId ? `<br>${paymentIntentId}` : ""}`)}
        </table>
        <div style="margin-top:24px;text-align:center">
          ${button(`${SITE}/admin/pedidos`, "Abrir painel de pedidos")}
        </div>
      `,
    }),
  });
}
