"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { X, ArrowRight, Sparkles, Frame } from "lucide-react";
import type { LocationPhoto } from "@/types/location";
import { POSTER_PRICES, formatPrice } from "@/lib/posterPricing";
import { POSTER_MIN_PHOTOS, POSTER_MAX_PHOTOS } from "@/lib/posterRules";

/**
 * Convite para o pôster impresso.
 *
 * Duas formas, uma vez cada coisa. Na primeira vez que a pessoa cruza o mínimo
 * de memórias, um modal: chegar ali custou esforço e é o instante em que passa
 * a ser verdade que dá para imprimir. Depois disso, um lembrete de canto que
 * fica — enquanto houver memórias suficientes, o caminho para o pôster continua
 * à vista.
 *
 * A versão anterior tinha marcos (5, 12, 25) e sumia de vez ao ser dispensada.
 * Quem dispensasse uma vez não via mais nada até a décima segunda memória, e
 * quem dispensasse os três marcos nunca mais via nada — justamente a pessoa
 * mais próxima de comprar.
 */

const MODAL_KEY = "guardei:poster-modal-visto";

type Estado = {
  /** O modal de estreia já foi mostrado. Persiste: ele é de uma vez só. */
  modalVisto: boolean;
  /** Dispensa do lembrete de canto — só desta carga da página. */
  cantoOculto: boolean;
};

/* Fonte de verdade em memória: useSyncExternalStore compara snapshots por
   identidade, e devolver um objeto novo a cada leitura entraria em loop. */
let atual: Estado | null = null;
const listeners = new Set<() => void>();

function ler(): Estado {
  let modalVisto = false;
  try {
    modalVisto = window.localStorage.getItem(MODAL_KEY) === "1";
  } catch {
    /* modo privado: o modal aparece de novo, o que é melhor que não aparecer */
  }
  return { modalVisto, cantoOculto: false };
}

function snapshot(): Estado {
  if (atual === null) atual = ler();
  return atual;
}

function snapshotServidor(): Estado {
  return { modalVisto: false, cantoOculto: false };
}

function emitir() {
  for (const avisar of listeners) avisar();
}

function marcarModalVisto() {
  atual = { ...snapshot(), modalVisto: true };
  try {
    window.localStorage.setItem(MODAL_KEY, "1");
  } catch {
    /* sem persistência vale só para esta sessão */
  }
  emitir();
}

function ocultarCanto() {
  atual = { ...snapshot(), cantoOculto: true };
  emitir();
}

function aoMudarStorage() {
  atual = ler();
  emitir();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", aoMudarStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", aoMudarStorage);
  };
}

type Props = {
  locations: LocationPhoto[];
  onOpenPoster: () => void;
};

export default function PosterNudge({ locations, onOpenPoster }: Props) {
  const estado = useSyncExternalStore(subscribe, snapshot, snapshotServidor);

  const count = locations.length;
  if (count < POSTER_MIN_PHOTOS) return null;

  const shots = locations.slice(0, 3);

  const pilha = (
    <div className="nudge-stack" aria-hidden>
      {shots.map((loc) => (
        <figure key={loc.id} className="nudge-shot">
          <div className="ns-img">
            <Image
              src={loc.imageUrl}
              alt=""
              fill
              sizes="70px"
              style={{ objectFit: "cover" }}
              unoptimized
            />
          </div>
        </figure>
      ))}
    </div>
  );

  /* ── Estreia: o pôster acabou de ficar possível ── */
  if (!estado.modalVisto) {
    return (
      <div className="ob-stage">
        <section className="ob-card pn-modal" role="dialog" aria-label="Seu pôster está liberado">
          <span className="ob-tape" />
          <button className="ob-close" onClick={marcarModalVisto} aria-label="Fechar">
            <X size={15} strokeWidth={1.8} />
          </button>

          <div className="ob-seal" aria-hidden>
            <span className="ob-seal-ring" />
            <Sparkles size={26} strokeWidth={1.5} />
          </div>

          <div className="ob-eyebrow ob-eyebrow-gold">seu pôster está liberado</div>
          <h2 className="ob-title">
            {count} memórias.<br />Já dá um pôster.
          </h2>

          {pilha}

          <p className="ob-text">
            A partir de agora o seu mapa cabe numa moldura: as suas fotos de verdade,
            sobre os lugares onde elas aconteceram. Monte com{" "}
            <strong>{POSTER_MIN_PHOTOS} a {POSTER_MAX_PHOTOS} memórias</strong> e escolha
            onde ele vai ficar pendurado.
          </p>

          <button
            className="ob-cta ob-cta-gold"
            onClick={() => { marcarModalVisto(); onOpenPoster(); }}
          >
            Ver o meu pôster <ArrowRight size={15} strokeWidth={1.8} />
          </button>
          <div className="pn-modal-price">
            a partir de {formatPrice(POSTER_PRICES.a4_portrait)} · frete grátis para todo o Brasil
          </div>
          <button className="ob-later" onClick={marcarModalVisto}>agora não</button>
        </section>
      </div>
    );
  }

  /* ── Depois: lembrete que fica ──
     Volta a cada acesso de propósito. Fechar aqui é "não agora", não "nunca
     mais": enquanto houver memórias suficientes, o pôster continua disponível e
     esconder isso para sempre seria esconder o produto de quem mais o quer. */
  if (estado.cantoOculto) return null;

  return (
    <aside className="poster-ready" aria-label="Seu pôster está pronto para montar">
      <button className="poster-ready-close" onClick={ocultarCanto} aria-label="Fechar por agora">
        <X size={13} strokeWidth={2} />
      </button>

      <span className="pr-icon" aria-hidden>
        <Frame size={16} strokeWidth={1.8} />
      </span>

      <div className="pr-body">
        <strong>Seu pôster está pronto para montar</strong>
        <span>
          {count} memórias guardadas · a partir de {formatPrice(POSTER_PRICES.a4_portrait)} com
          frete grátis
        </span>
      </div>

      <button className="pr-cta" onClick={onOpenPoster}>
        montar <ArrowRight size={13} strokeWidth={2} />
      </button>
    </aside>
  );
}
