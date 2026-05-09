"use client";

import { useState } from "react";

type Props = {
  onSubmit: (customerName: string, customerContact: string, contactType: "email" | "whatsapp") => Promise<void>;
  onBack: () => void;
  submitting: boolean;
  submitStep?: string;
  submitError?: string;
};

export default function Step4Order({ onSubmit, onBack, submitting, submitStep, submitError }: Props) {
  const [name, setName] = useState("");
  const [contactType, setContactType] = useState<"whatsapp" | "email">("whatsapp");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");

  function validate(): string {
    if (!name.trim()) return "Informe seu nome.";
    if (!contact.trim()) return `Informe seu ${contactType === "whatsapp" ? "WhatsApp" : "email"}.`;
    if (contactType === "email" && !contact.includes("@")) return "Email inválido.";
    if (contactType === "whatsapp" && contact.replace(/\D/g, "").length < 10) return "WhatsApp inválido.";
    return "";
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    await onSubmit(name.trim(), contact.trim(), contactType);
  }

  const inputStyle = {
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    padding: "10px 14px",
    border: "1px solid var(--paper-300)",
    borderRadius: "var(--radius-sm)",
    background: "var(--paper-50)",
    color: "var(--ink-900)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-600)", margin: 0 }}>
        Confirme seus dados. Após gerar o poster você será direcionado ao pagamento seguro.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-500)" }}>
          Seu nome
        </label>
        <input
          type="text"
          placeholder="Nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-500)" }}>
          Como prefere ser contatado?
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {(["whatsapp", "email"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setContactType(t)}
              style={{
                flex: 1,
                padding: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: `1.5px solid ${contactType === t ? "#b8860b" : "var(--paper-300)"}`,
                borderRadius: "var(--radius-sm)",
                background: contactType === t ? "rgba(184,134,11,0.08)" : "var(--paper-50)",
                color: contactType === t ? "#b8860b" : "var(--ink-600)",
                cursor: "pointer",
              }}
            >
              {t === "whatsapp" ? "📱 WhatsApp" : "✉️ Email"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-500)" }}>
          {contactType === "whatsapp" ? "WhatsApp (com DDD)" : "Endereço de email"}
        </label>
        <input
          type={contactType === "email" ? "email" : "tel"}
          placeholder={contactType === "whatsapp" ? "(81) 99999-9999" : "seu@email.com"}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          style={inputStyle}
        />
      </div>

      {(error || submitError) && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--danger)" }}>{error || submitError}</span>
      )}

      <div style={{ padding: "12px 14px", background: "var(--paper-100)", borderRadius: "var(--radius-sm)", border: "1px dashed var(--paper-400)" }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-600)", margin: 0, lineHeight: 1.6 }}>
          🔒 Pagamento seguro via Stripe. Após o pagamento entraremos em contato pelo canal escolhido para combinar o endereço de entrega.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onBack}
          disabled={submitting}
          style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", padding: "10px", background: "none", color: "var(--ink-600)", border: "1px dashed var(--paper-400)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
        >
          ← voltar
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ flex: 2, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", padding: "10px 18px", background: submitting ? "var(--paper-300)" : "var(--ink-900)", color: submitting ? "var(--ink-500)" : "var(--paper-50)", border: "none", borderRadius: "var(--radius-sm)", cursor: submitting ? "wait" : "pointer" }}
        >
          {submitting ? (submitStep || "processando...") : "ir para pagamento →"}
        </button>
      </div>
    </div>
  );
}
