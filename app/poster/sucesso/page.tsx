"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Frame } from "lucide-react";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper-100)",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "var(--paper-50)",
          border: "1px solid var(--paper-300)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 8px 40px rgba(42,31,20,0.12)",
          padding: "48px 40px",
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Frame size={50} strokeWidth={1.3} style={{ color: "var(--poster-gold)" }} />

        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            color: "var(--ink-900)",
            letterSpacing: "-0.02em",
          }}
        >
          Pedido confirmado!
        </div>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 15,
            color: "var(--ink-600)",
            lineHeight: 1.7,
            margin: 0,
            maxWidth: 360,
          }}
        >
          Recebemos seu pagamento com sucesso. Em breve entraremos em contato
          para combinar o endereço de entrega do seu poster.
        </p>

        {sessionId && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.15em",
              color: "var(--ink-400)",
              background: "var(--paper-100)",
              padding: "6px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--paper-300)",
            }}
          >
            ref. {sessionId.slice(-12).toUpperCase()}
          </div>
        )}

        <div
          style={{
            width: "100%",
            height: 1,
            background: "var(--paper-300)",
            margin: "8px 0",
          }}
        />

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "var(--ink-500)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Dúvidas? Fale conosco em{" "}
          <a
            href="mailto:contato@guardei.art"
            style={{ color: "#b8860b", textDecoration: "none" }}
          >
            contato@guardei.art
          </a>
        </p>

        <Link
          href="/"
          style={{
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "13px 28px",
            background: "var(--ink-900)",
            color: "var(--paper-50)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            textDecoration: "none",
            display: "inline-block",
            minHeight: 44,
          }}
        >
          voltar ao início
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
