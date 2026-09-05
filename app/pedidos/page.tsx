"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { Package, Truck, ExternalLink } from "lucide-react";
import MainNav from "@/app/components/MainNav";
import { auth } from "@/lib/auth";
import { getUserPosterOrders, ensureUsername, getLocations } from "@/lib/firestore";
import { FORMAT_DIMS, LEGACY_FORMAT_LABELS } from "@/lib/posterMap";
import { formatPrice } from "@/lib/posterPricing";
import { STATUS_LABEL, STATUS_HINT, orderRef } from "@/lib/posterStatus";
import type { PosterOrder } from "@/types/poster";

/**
 * As compras de quem esta logado.
 *
 * Espelha o painel do admin, mas so com os proprios pedidos e sem nada que
 * permita mexer neles: aqui a pessoa acompanha, nao administra.
 */

const dataDe = (ms: number) =>
  new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

function rotuloFormato(format: string) {
  return FORMAT_DIMS[format as keyof typeof FORMAT_DIMS]?.label
    ?? LEGACY_FORMAT_LABELS[format]
    ?? format;
}

export default function PedidosPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PosterOrder[]>([]);
  const [username, setUsername] = useState("");
  const [memorias, setMemorias] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) { router.replace("/"); return; }
      try {
        const [lista, nome, locs] = await Promise.all([
          getUserPosterOrders(nextUser.uid),
          ensureUsername(nextUser.uid, nextUser.displayName, nextUser.email),
          getLocations(nextUser.uid),
        ]);
        setOrders(lista);
        setUsername(nome);
        setMemorias(locs.length);
      } catch (err) {
        console.error("pedidos:", err);
        setErro("Não foi possível carregar suas compras.");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <main className="profile-loading"><span>carregando suas compras...</span></main>;
  }

  return (
    <main className="profile-page">
      <header className="map-header">
        <div className="map-header-inner">
          <div className="map-brand-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/logo.png" alt="guardei" style={{ height: 36, width: "auto" }} />
            <span className="brand" style={{ fontSize: 22 }}>guardei<span className="amp">,</span></span>
            <span className="map-page-title">minhas compras</span>
          </div>
          <MainNav username={username} memoriesCount={memorias} />
        </div>
      </header>

      <div className="profile-body">
        <h1 className="admin-title">Minhas compras</h1>
        {erro && <span className="of-error">{erro}</span>}

        {orders.length === 0 && !erro && (
          <section className="profile-card">
            <p className="profile-note">
              Você ainda não comprou nenhum pôster. Quando comprar, o pedido e o
              código de rastreio aparecem aqui.
            </p>
          </section>
        )}

        {orders.map((o) => (
          <section className="profile-card" key={o.id}>
            <div className="admin-head">
              <div>
                <strong className="admin-ref">#{orderRef(o.id ?? "")}</strong>
                <span className={`admin-status is-${o.status}`}>{STATUS_LABEL[o.status]}</span>
              </div>
              <span className="admin-valor">
                {o.amountPaid ? formatPrice(o.amountPaid) : "—"}
              </span>
            </div>

            <p className="pedido-hint">{STATUS_HINT[o.status]}</p>

            <dl className="profile-meta">
              <div><dt>Data</dt><dd>{dataDe(o.createdAt)}</dd></div>
              <div><dt>Formato</dt><dd>{rotuloFormato(o.format)}</dd></div>
              <div><dt>Fotos</dt><dd>{o.items.length}</dd></div>
              <div>
                <dt>Entrega</dt>
                <dd>{o.shipping ? `${o.shipping.carrier} ${o.shipping.name}` : "—"}</dd>
              </div>
              <div>
                <dt>Endereço</dt>
                <dd>
                  {o.shippingAddress
                    ? `${o.shippingAddress.street}, ${o.shippingAddress.number}${o.shippingAddress.complement ? ` — ${o.shippingAddress.complement}` : ""} · ${o.shippingAddress.district} · ${o.shippingAddress.city}/${o.shippingAddress.state} · CEP ${o.shippingAddress.cep}`
                    : "não informado"}
                </dd>
              </div>
            </dl>

            {o.status === "shipped" && o.trackingCode && (
              <div className="admin-enviado">
                <Truck size={14} strokeWidth={1.8} />
                <span>
                  código <strong>{o.trackingCode}</strong>
                </span>
                {o.trackingUrl && (
                  <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="pedido-rastreio">
                    acompanhar <ExternalLink size={12} strokeWidth={1.8} />
                  </a>
                )}
              </div>
            )}

            {o.posterImageUrl && (
              <a href={o.posterImageUrl} target="_blank" rel="noopener noreferrer" className="pedido-arte">
                <Package size={13} strokeWidth={1.8} /> ver a arte enviada para impressão
              </a>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
