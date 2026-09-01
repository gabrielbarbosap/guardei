"use client";

import { useState } from "react";
import { Truck, Loader2, Check } from "lucide-react";
import type { PosterFormat, ShippingAddress, ShippingChoice } from "@/types/poster";
import { POSTER_PRICES, formatPrice } from "@/lib/posterPricing";
import { formatCep, lookupCep } from "@/lib/cep";

type Props = {
  format: PosterFormat;
  onSubmit: (
    customerName: string,
    customerContact: string,
    contactType: "email" | "whatsapp",
    address: ShippingAddress,
    shipping: ShippingChoice,
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
  const [contactType, setContactType] = useState<"whatsapp" | "email">("whatsapp");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");

  const [options, setOptions] = useState<ShippingChoice[] | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [freightLoading, setFreightLoading] = useState(false);
  const [freightError, setFreightError] = useState("");

  const chosen = options?.find((o) => o.serviceId === chosenId) ?? null;
  const posterPrice = POSTER_PRICES[format];

  /** Ao completar o CEP: preenche o endereço e cota o frete de uma vez. */
  async function handleCepChange(raw: string) {
    const masked = formatCep(raw);
    setCep(masked);
    setFreightError("");
    // qualquer mudança de CEP invalida a cotação anterior
    setOptions(null);
    setChosenId(null);

    const digits = masked.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setFreightLoading(true);
    try {
      const [addr, quoteRes] = await Promise.all([
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

      const data = (await quoteRes.json()) as { options?: ShippingChoice[]; error?: string };
      if (!quoteRes.ok || !data.options?.length) {
        setFreightError(data.error ?? "Não foi possível calcular o frete.");
        return;
      }
      setOptions(data.options);
      setChosenId(data.options[0].serviceId); // a mais barata vem primeiro
    } catch {
      setFreightError("Não foi possível calcular o frete agora.");
    } finally {
      setFreightLoading(false);
    }
  }

  function validate(): string {
    if (!name.trim()) return "Informe seu nome.";
    if (!contact.trim()) return `Informe seu ${contactType === "whatsapp" ? "WhatsApp" : "email"}.`;
    if (contactType === "email" && !contact.includes("@")) return "Email inválido.";
    if (contactType === "whatsapp" && contact.replace(/\D/g, "").length < 10) return "WhatsApp inválido.";
    if (cep.replace(/\D/g, "").length !== 8) return "Informe o CEP de entrega.";
    if (!street.trim()) return "Informe a rua.";
    if (!number.trim()) return "Informe o número.";
    if (!city.trim() || !uf.trim()) return "Informe cidade e estado.";
    if (!chosen) return "Escolha uma opção de entrega.";
    return "";
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    if (!chosen) return;
    setError("");
    await onSubmit(
      name.trim(),
      contact.trim(),
      contactType,
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
      chosen,
    );
  }

  return (
    <div className="order-form">
      <p className="order-intro">
        Confirme seus dados e o endereço de entrega. O frete é calculado pelo seu CEP.
      </p>

      <label className="of-field">
        <span>Seu nome</span>
        <input type="text" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="of-field">
        <span>Como prefere ser contatado?</span>
        <div className="of-toggle">
          {(["whatsapp", "email"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`of-toggle-btn${contactType === t ? " is-active" : ""}`}
              onClick={() => setContactType(t)}
            >
              {t === "whatsapp" ? "WhatsApp" : "Email"}
            </button>
          ))}
        </div>
      </div>

      <label className="of-field">
        <span>{contactType === "whatsapp" ? "WhatsApp (com DDD)" : "Endereço de email"}</span>
        <input
          type={contactType === "email" ? "email" : "tel"}
          placeholder={contactType === "whatsapp" ? "(81) 99999-9999" : "seu@email.com"}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
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

      {freightLoading && (
        <div className="of-freight-loading">
          <Loader2 size={14} className="spin" /> calculando o frete…
        </div>
      )}
      {freightError && <span className="of-error">{freightError}</span>}

      {options && options.length > 0 && (
        <div className="of-freight">
          <span className="of-freight-label">Como prefere receber?</span>
          {options.map((o) => (
            <button
              key={o.serviceId}
              type="button"
              className={`freight-option${chosenId === o.serviceId ? " is-active" : ""}`}
              onClick={() => setChosenId(o.serviceId)}
            >
              <Truck size={15} strokeWidth={1.7} />
              <span className="fo-name">
                {o.carrier} {o.name}
                {o.deliveryDays ? <em>{o.deliveryDays} dia{o.deliveryDays > 1 ? "s" : ""} úteis</em> : null}
              </span>
              <span className="fo-price">{formatPrice(o.priceCents)}</span>
              {chosenId === o.serviceId && <Check size={14} strokeWidth={2.4} />}
            </button>
          ))}
        </div>
      )}

      {chosen && (
        <div className="of-total">
          <div><span>Pôster</span><span>{formatPrice(posterPrice)}</span></div>
          <div><span>Frete</span><span>{formatPrice(chosen.priceCents)}</span></div>
          <div className="of-total-sum">
            <span>Total</span><strong>{formatPrice(posterPrice + chosen.priceCents)}</strong>
          </div>
        </div>
      )}

      {(error || submitError) && <span className="of-error">{error || submitError}</span>}

      <p className="of-note">
        Pagamento seguro via Stripe. O pôster é enviado para o endereço acima.
      </p>

      <div className="of-actions">
        <button className="compose-back" onClick={onBack} disabled={submitting}>← voltar</button>
        <button className="compose-next" onClick={handleSubmit} disabled={submitting || !chosen}>
          {submitting ? (submitStep || "processando...") : "ir para pagamento →"}
        </button>
      </div>
    </div>
  );
}
