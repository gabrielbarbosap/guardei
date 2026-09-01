"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { X, ArrowRight } from "lucide-react";
import type { LocationPhoto } from "@/types/location";
import { POSTER_PRICES, formatPrice } from "@/lib/posterPricing";

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

  return (
    <aside className="poster-nudge" aria-label="Transforme suas memórias em pôster">
      <div className="poster-nudge-tape" />
      <button className="poster-nudge-close" onClick={dismiss} aria-label="Dispensar">
        <X size={15} strokeWidth={1.8} />
      </button>

      <div className="poster-nudge-eyebrow">da tela para a parede</div>

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

      <h3>Seu mapa já dá um pôster.</h3>
      <p>
        Você guardou <strong>{count} {count === 1 ? "memória" : "memórias"}</strong>.
        Dá para imprimir tudo isso num mapa com suas fotos de verdade — e pendurar
        onde você passa todo dia.
      </p>

      <button className="poster-nudge-cta" onClick={onOpenPoster}>
        Ver como fica
        <ArrowRight size={14} strokeWidth={1.8} />
      </button>
      <div className="poster-nudge-price">
        a partir de {formatPrice(POSTER_PRICES.a5_portrait)} + frete
      </div>
    </aside>
  );
}
