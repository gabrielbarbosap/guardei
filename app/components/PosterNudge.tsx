"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { X, ArrowRight, Sparkles } from "lucide-react";
import type { LocationPhoto } from "@/types/location";
import { POSTER_PRICES, formatPrice } from "@/lib/posterPricing";
import { POSTER_MIN_PHOTOS, POSTER_MAX_PHOTOS } from "@/lib/posterRules";

/**
 * Convite para o pôster impresso.
 *
 * Aparece por marcos de memórias guardadas em vez de toda sessão: quem dispensa
 * no primeiro marco só volta a ver no seguinte. A dispensa fica no localStorage,
 * então não reaparece a cada refresh.
 */
/* Começa em 5, e não em 3, por dois motivos: abaixo disso não dá para montar
   pôster, e aos 3 quem fala é o onboarding — dois convites na mesma tela. */
const MILESTONES = [5, 12, 25] as const;
const STORAGE_KEY = "guardei:poster-nudge-dismissed";

const EMPTY: number[] = [];

/* Store externo em cima do localStorage, com uma fonte de verdade em memória.
   Guardar o valor aqui resolve duas coisas: useSyncExternalStore compara
   snapshots por identidade (devolver um array novo a cada leitura entraria em
   loop de render), e se a escrita falhar — modo privado, storage cheio — o card
   ainda some nesta sessão em vez de ficar preso na tela. */
let current: number[] | null = null; // null = ainda não lido do storage
const listeners = new Set<() => void>();

function readStorage(): number[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : EMPTY;
  } catch {
    return EMPTY;
  }
}

function emit() {
  for (const notify of listeners) notify();
}

function getSnapshot(): number[] {
  if (current === null) current = readStorage();
  return current;
}

function getServerSnapshot(): number[] {
  return EMPTY;
}

/** Outra aba dispensou: recarrega e avisa. */
function handleStorageEvent() {
  current = readStorage();
  emit();
}

function dismissMilestone(milestone: number) {
  const next = [...getSnapshot(), milestone];
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* sem persistência: vale só para esta sessão */
  }
  emit();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", handleStorageEvent);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", handleStorageEvent);
  };
}

/** Maior marco já alcançado pela pessoa — null se ainda não chegou no primeiro. */
function reachedMilestone(count: number): number | null {
  let reached: number | null = null;
  for (const m of MILESTONES) if (count >= m) reached = m;
  return reached;
}

type Props = {
  locations: LocationPhoto[];
  onOpenPoster: () => void;
};

export default function PosterNudge({ locations, onOpenPoster }: Props) {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const milestone = reachedMilestone(locations.length);

  if (milestone === null || dismissed.includes(milestone)) return null;

  function dismiss() {
    if (milestone !== null) dismissMilestone(milestone);
  }

  const shots = locations.slice(0, 3);
  const count = locations.length;
  const primeiraVez = milestone === MILESTONES[0];

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

  /* ── Primeira vez: o pôster acabou de ficar possível ── */
  if (primeiraVez) {
    return (
      <div className="ob-stage">
        <section className="ob-card pn-modal" role="dialog" aria-label="Seu pôster está liberado">
          <span className="ob-tape" />
          <button className="ob-close" onClick={dismiss} aria-label="Fechar">
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

          <button className="ob-cta ob-cta-gold" onClick={onOpenPoster}>
            Ver o meu pôster <ArrowRight size={15} strokeWidth={1.8} />
          </button>
          <div className="pn-modal-price">
            a partir de {formatPrice(POSTER_PRICES.a4_portrait)} · frete grátis para todo o Brasil
          </div>
          <button className="ob-later" onClick={dismiss}>agora não</button>
        </section>
      </div>
    );
  }

  /* ── Marcos seguintes: lembrete de canto ── */
  return (
    <aside className="poster-nudge" aria-label="Transforme suas memórias em pôster">
      <div className="poster-nudge-tape" />
      <button className="poster-nudge-close" onClick={dismiss} aria-label="Dispensar">
        <X size={15} strokeWidth={1.8} />
      </button>

      <div className="poster-nudge-eyebrow">da tela para a parede</div>

      {pilha}

      <h3>Seu mapa cresceu de novo.</h3>
      <p>
        Já são <strong>{count} memórias</strong>. Dá para imprimir tudo isso num mapa
        com suas fotos de verdade — e pendurar onde você passa todo dia.
      </p>

      <button className="poster-nudge-cta" onClick={onOpenPoster}>
        Ver como fica
        <ArrowRight size={14} strokeWidth={1.8} />
      </button>
      <div className="poster-nudge-price">
        a partir de {formatPrice(POSTER_PRICES.a4_portrait)} · frete grátis
      </div>
    </aside>
  );
}
