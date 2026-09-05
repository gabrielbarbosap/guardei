"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Loader2 } from "lucide-react";

/**
 * Aceite da política de privacidade, antes da primeira memória.
 *
 * Aparece no lugar do formulário de envio, e não por cima dele: a pessoa está
 * prestes a mandar uma foto e um texto pessoais para o nosso servidor, e o
 * consentimento precisa vir antes disso — não depois, nem como caixinha
 * pré-marcada no rodapé.
 *
 * A marcação começa desmarcada de propósito. Consentimento pré-marcado não é
 * consentimento: a LGPD pede manifestação livre e inequívoca.
 */

type Props = {
  onAccept: () => Promise<void>;
  onCancel: () => void;
};

export default function PrivacyGate({ onAccept, onCancel }: Props) {
  const [marcado, setMarcado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function aceitar() {
    if (!marcado || salvando) return;
    setSalvando(true);
    setErro("");
    try {
      await onAccept();
    } catch (err) {
      console.error("[privacidade] falha ao registrar aceite:", err);
      setErro("Não foi possível registrar agora. Tente de novo.");
      setSalvando(false);
    }
  }

  return (
    <div className="privacy-gate" role="dialog" aria-labelledby="privacy-gate-title">
      <span className="pg-icon" aria-hidden>
        <ShieldCheck size={20} strokeWidth={1.7} />
      </span>

      <h2 id="privacy-gate-title">Antes da sua primeira memória</h2>

      <p className="pg-text">
        Você está prestes a guardar uma foto, um texto e um lugar. Isso é coisa
        sua, e a gente trata como tal: <strong>toda memória nasce privada</strong> e
        só aparece para outra pessoa se você marcar como pública.
      </p>

      <ul className="pg-pontos">
        <li>guardamos sua foto, seu texto, a data e o ponto no mapa</li>
        <li>não vendemos seus dados nem usamos suas memórias para anúncio</li>
        <li>você apaga qualquer memória, ou a conta inteira, quando quiser</li>
      </ul>

      <label className="pg-check">
        <input
          type="checkbox"
          checked={marcado}
          onChange={(e) => setMarcado(e.target.checked)}
        />
        <span>
          Li e aceito a{" "}
          <Link href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>

      {erro && <span className="pg-erro">{erro}</span>}

      <div className="pg-acoes">
        <button className="pg-cancelar" onClick={onCancel} disabled={salvando}>
          agora não
        </button>
        <button className="pg-aceitar" onClick={aceitar} disabled={!marcado || salvando}>
          {salvando ? <Loader2 size={14} className="spin" /> : null}
          {salvando ? "registrando..." : "aceitar e continuar"}
        </button>
      </div>
    </div>
  );
}
