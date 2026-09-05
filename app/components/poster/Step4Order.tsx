"use client";

import { useState } from "react";
import { Truck, Loader2, PackageCheck, Sparkles } from "lucide-react";
import type { PosterFormat, ShippingAddress } from "@/types/poster";
import { POSTER_PRICES, formatPrice } from "@/lib/posterPricing";
import { formatCep, lookupCep } from "@/lib/cep";
import { PRODUCTION_DAYS } from "@/lib/shipping/policy";
import { FORMAT_DIMS } from "@/lib/posterMap";

type Props = {
  format: PosterFormat;
  onSubmit: (
    customerName: string,
    customerContact: string,
    contactType: "email" | "whatsapp",
    address: ShippingAddress,
  ) => Promise<void>;
  onBack: () => void;
  submitting: boolean;
  submitStep?: string;
  submitError?: string;
};

export default function Step4Order({
  format, onSubmit, onBack, submitting, submitStep, submitError,
}: Props) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");

  const [cepLoading, setCepLoading] = useState(false);
  /* Prazo real deste CEP. Fica nulo enquanto não sabemos: entre 2 e mais de
     20 dias úteis conforme o destino, um número fixo na tela seria mentira
     para quem mora longe. */
  const [prazo, setPrazo] = useState<number | null>(null);

  const posterPrice = POSTER_PRICES[format];

  /**
   * Ao completar o CEP: preenche o endereco.
   *
   * Antes isto tambem cotava o frete e montava uma lista de opcoes. Agora o
   * frete e nosso, entao a cotacao saiu daqui — ela acontece no servidor, na
   * hora do checkout, so para registrarmos o custo.
   */
  async function handleCepChange(raw: string) {
    const masked = formatCep(raw);
    setCep(masked);

    const digits = masked.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setCepLoading(true);
    setPrazo(null);
    try {
      const [addr, prazoRes] = await Promise.all([
        lookupCep(digits),
        fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format, cep: digits }),
        }),
      ]);
      if (addr) {
        setStreet(addr.street);
        setDistrict(addr.district);
        setCity(addr.city);
        setUf(addr.state);
      }
      const dados = (await prazoRes.json()) as { deliveryDays?: number | null };
      if (typeof dados.deliveryDays === "number") setPrazo(dados.deliveryDays);
    } catch {
      /* sem o preenchimento automatico a pessoa digita a mao; nao e bloqueio */
    } finally {
      setCepLoading(false);
    }
  }

  function validate(): string {
    if (!name.trim()) return "Informe seu nome.";
    if (!contact.trim()) return "Informe seu e-mail.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim())) return "E-mail inválido.";
    if (cep.replace(/\D/g, "").length !== 8) return "Informe o CEP de entrega.";
    if (!street.trim()) return "Informe a rua.";
    if (!number.trim()) return "Informe o número.";
    if (!city.trim() || !uf.trim()) return "Informe cidade e estado.";
    return "";
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    await onSubmit(
      name.trim(),
      contact.trim(),
      // sempre e-mail: é por onde a confirmação e o rastreio saem
      "email",
      {
        cep: cep.replace(/\D/g, ""),
        street: street.trim(),
        number: number.trim(),
        // a chave só existe quando preenchida: o Firestore recusa undefined
        ...(complement.trim() ? { complement: complement.trim() } : {}),
        district: district.trim(),
        city: city.trim(),
        state: uf.trim().toUpperCase(),
      },
    );
  }

  return (
    <div className="order-form">
      <p className="order-intro">
        Falta pouco. Confirme para onde mandamos o seu quadro.
      </p>

      <label className="of-field">
        <span>Seu nome</span>
        <input type="text" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className="of-field">
        <span>Seu e-mail</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
        <em className="of-ajuda">é para lá que vão a confirmação e o código de rastreio</em>
      </label>

      <div className="of-divider">entrega</div>

      <div className="of-row">
        <label className="of-field of-cep">
          <span>CEP</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="00000-000"
            value={cep}
            onChange={(e) => handleCepChange(e.target.value)}
          />
        </label>
        <label className="of-field" style={{ flex: 1 }}>
          <span>Cidade / UF</span>
          <input type="text" value={city && uf ? `${city} / ${uf}` : ""} readOnly placeholder="vem do CEP" />
        </label>
      </div>

      <div className="of-row">
        <label className="of-field" style={{ flex: 3 }}>
          <span>Rua</span>
          <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} />
        </label>
        <label className="of-field" style={{ flex: 1 }}>
          <span>Número</span>
          <input type="text" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} />
        </label>
      </div>

      <div className="of-row">
        <label className="of-field" style={{ flex: 1 }}>
          <span>Bairro</span>
          <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} />
        </label>
        <label className="of-field" style={{ flex: 1 }}>
          <span>Complemento</span>
          <input type="text" placeholder="opcional" value={complement} onChange={(e) => setComplement(e.target.value)} />
        </label>
      </div>

      {cepLoading && (
        <div className="of-freight-loading">
          <Loader2 size={14} className="spin" /> buscando seu endereço…
        </div>
      )}

      {/* O frete é real e sai do nosso bolso: dizer que a pessoa ganhou é
          verdade verificável, não promessa inventada. */}
      <div className="of-freegift">
        <PackageCheck size={18} strokeWidth={1.7} />
        <div>
          <strong>Você ganhou frete grátis</strong>
          <span>
            {prazo
              ? `chega em até ${prazo} dias úteis, já contando os ${PRODUCTION_DAYS} de produção do quadro`
              : "para todo o Brasil — informe o CEP para ver o prazo de entrega"}
          </span>
        </div>
      </div>

      <div className="of-total">
        <div>
          <span>Quadro {FORMAT_DIMS[format].size} emoldurado</span>
          <span>{formatPrice(posterPrice)}</span>
        </div>
        <div className="of-total-free">
          <span>
            <Truck size={13} strokeWidth={1.8} /> Frete para todo o Brasil
          </span>
          <span>
            <em>grátis</em>
          </span>
        </div>
        <div className="of-total-sum">
          <span>Total</span>
          <strong>{formatPrice(posterPrice)}</strong>
        </div>
        <div className="of-total-perk">
          <Sparkles size={12} strokeWidth={1.9} /> nada de taxa surpresa no fim
        </div>
      </div>

      {(error || submitError) && <span className="of-error">{error || submitError}</span>}

      <p className="of-note">
        Pagamento seguro via Stripe. Enviamos para o endereço acima, sem custo de frete.
      </p>

      <div className="of-actions">
        <button className="compose-back" onClick={onBack} disabled={submitting}>← voltar</button>
        <button className="compose-next" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (submitStep || "processando...") : "ir para pagamento →"}
        </button>
      </div>
    </div>
  );
}
