"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { Package, Check, Loader2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/firestore";
import type { PosterOrder } from "@/types/poster";
import { FORMAT_DIMS, LEGACY_FORMAT_LABELS } from "@/lib/posterMap";
import { STATUS_LABEL, orderRef } from "@/lib/posterStatus";

const ADMIN_EMAILS = ["gabriel@sistemap.com.br"];

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminPedidos() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<(PosterOrder & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [codigos, setCodigos] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) { router.replace("/"); return; }
      setUser(nextUser);
      // a tela só esconde o que a rota já protege pelo token
      if (!nextUser.email || !ADMIN_EMAILS.includes(nextUser.email)) {
        setLoading(false);
        return;
      }
      try {
        // pedidos sem pagamento não interessam aqui: só o que precisa despachar
        const q = query(
          collection(db, "posterOrders"),
          where("status", "in", ["paid", "processing", "shipped", "done"]),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(q);
        setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as PosterOrder) })));
      } catch (err) {
        console.error("[admin/pedidos]", err);
        setErro("Não foi possível carregar os pedidos.");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  async function marcarEnviado(orderId: string) {
    const code = (codigos[orderId] ?? "").trim();
    if (code.length < 5) { setErro("Informe o código de rastreio."); return; }
    setEnviando(orderId);
    setErro("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/orders/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, trackingCode: code }),
      });
      const data = await res.json() as { error?: string; trackingUrl?: string };
      if (!res.ok) { setErro(data.error ?? "Falha ao marcar como enviado."); return; }
      setOrders((prev) => prev.map((o) =>
        o.id === orderId
          ? { ...o, status: "shipped", trackingCode: code, trackingUrl: data.trackingUrl, shippedAt: Date.now() }
          : o));
    } catch (err) {
      console.error("[admin/pedidos] enviar:", err);
      setErro("Falha ao marcar como enviado.");
    } finally {
      setEnviando(null);
    }
  }

  if (loading) {
    return <main className="profile-loading"><span>carregando pedidos...</span></main>;
  }

  if (!user?.email || !ADMIN_EMAILS.includes(user.email)) {
    return (
      <main className="profile-loading">
        <span>esta página é restrita.</span>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <div className="profile-body">
        <h1 className="admin-title">Pedidos</h1>
        {erro && <span className="of-error">{erro}</span>}

        {orders.length === 0 && <p className="profile-note">Nenhum pedido pago ainda.</p>}

        {orders.map((o) => (
          <section className="profile-card" key={o.id}>
            <div className="admin-head">
              <div>
                <strong className="admin-ref">#{orderRef(o.id)}</strong>
                <span className={`admin-status is-${o.status}`}>{STATUS_LABEL[o.status]}</span>
              </div>
              <span className="admin-valor">{o.amountPaid ? brl(o.amountPaid) : "—"}</span>
            </div>

            <dl className="profile-meta">
              <div><dt>Cliente</dt><dd>{o.customerName}</dd></div>
              <div><dt>Contato</dt><dd>{o.customerContact}</dd></div>
              <div><dt>Formato</dt><dd>{FORMAT_DIMS[o.format]?.label ?? LEGACY_FORMAT_LABELS[o.format] ?? o.format}</dd></div>
              <div>
                <dt>Endereço</dt>
                <dd>
                  {o.shippingAddress
                    ? `${o.shippingAddress.street}, ${o.shippingAddress.number}${o.shippingAddress.complement ? ` — ${o.shippingAddress.complement}` : ""} · ${o.shippingAddress.district} · ${o.shippingAddress.city}/${o.shippingAddress.state} · CEP ${o.shippingAddress.cep}`
                    : "não informado"}
                </dd>
              </div>
              <div>
                <dt>Entrega</dt>
                <dd>{o.shipping ? `${o.shipping.carrier} ${o.shipping.name}` : "—"}</dd>
              </div>
            </dl>

            {o.status === "shipped" ? (
              <div className="admin-enviado">
                <Check size={14} strokeWidth={2.2} />
                enviado com o código <strong>{o.trackingCode}</strong>
              </div>
            ) : (
              <div className="admin-ship">
                <input
                  type="text"
                  placeholder="código de rastreio"
                  value={codigos[o.id] ?? ""}
                  onChange={(e) => setCodigos((p) => ({ ...p, [o.id]: e.target.value }))}
                />
                <button onClick={() => marcarEnviado(o.id)} disabled={enviando === o.id}>
                  {enviando === o.id
                    ? <Loader2 size={14} className="spin" />
                    : <Package size={14} strokeWidth={1.8} />}
                  marcar como enviado
                </button>
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
