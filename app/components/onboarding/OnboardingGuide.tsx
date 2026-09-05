"use client";

import { useSyncExternalStore } from "react";
import { Sparkles, MapPin, X, ArrowRight } from "lucide-react";
import type { LocationPhoto } from "@/types/location";
import {
  ONBOARDING_MEMORIES_GOAL,
  POSTER_MIN_PHOTOS,
  POSTER_MAX_PHOTOS,
} from "@/lib/posterRules";

/**
 * Guia de primeiro acesso.
 *
 * O progresso é derivado das memórias que a pessoa realmente guardou, não de um
 * contador próprio: assim ele mostra o estado certo mesmo em outro aparelho, ou
 * se ela apagar uma memória. O localStorage guarda só o que não dá para deduzir
 * dos dados — se já começou e se já concluiu.
 */

/**
 * Perguntas que puxam a memória.
 *
 * Escritas para servir a quem nunca saiu da própria cidade: falam de pessoas,
 * de rotina e de afeto, não de viagem. Quem viajou responde igual.
 */
const PROMPTS = [
  "Em que lugar você foi mais feliz?",
  "Que lugar guarda uma história que você sempre conta?",
  "Qual canto da sua cidade é só seu?",
  "Onde você comeu algo que ainda sente o gosto?",
  "Que lugar te lembra de alguém que você ama?",
  "Onde você estava quando recebeu uma notícia boa?",
  "Qual foi o melhor dia comum da sua vida?",
  "Que lugar faz você respirar fundo?",
  "Onde você se sentiu em casa pela primeira vez?",
  "Para onde você voltaria agora, se pudesse?",
  "Que lugar você mostraria para quem ama?",
  "Onde você riu até doer a barriga?",
];

/*
 * A chave inclui o usuário de propósito.
 *
 * Com uma chave única, quem já tivesse dispensado o onboarding silenciava o de
 * qualquer outra conta que entrasse no mesmo navegador — uma conta recém-criada
 * não via nada.
 */
const STORAGE_PREFIX = "guardei:onboarding:";
const keyFor = (userId: string) => STORAGE_PREFIX + userId;

type State = {
  started: boolean;
  concluded: boolean;
  dismissed: boolean;
  /** Dispensa só desta carga da página — nunca vai para o localStorage. */
  sessionDismissed: boolean;
};
const EMPTY: State = {
  started: false,
  concluded: false,
  dismissed: false,
  sessionDismissed: false,
};

const cache = new Map<string, State>();
const listeners = new Set<() => void>();

function read(storageKey: string): State {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      started: Boolean(parsed.started),
      concluded: Boolean(parsed.concluded),
      dismissed: Boolean(parsed.dismissed),
      sessionDismissed: false,
    };
  } catch {
    return EMPTY;
  }
}

/* Devolve sempre o mesmo objeto por chave: useSyncExternalStore compara por
   identidade e um objeto novo a cada leitura entraria em loop de render. */
function snapshotFor(storageKey: string): State {
  let value = cache.get(storageKey);
  if (!value) {
    value = read(storageKey);
    cache.set(storageKey, value);
  }
  return value;
}

function getServerSnapshot(): State {
  return EMPTY;
}

function emit() {
  for (const notify of listeners) notify();
}

function patch(storageKey: string, next: Partial<State>) {
  const value = { ...snapshotFor(storageKey), ...next };
  cache.set(storageKey, value);
  try {
    // sessionDismissed fica de fora: existe só enquanto a página está aberta
    const { started, concluded, dismissed } = value;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ started, concluded, dismissed }),
    );
  } catch {
    /* modo privado: vale só para esta sessão */
  }
  emit();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const reload = () => { cache.clear(); emit(); };
  window.addEventListener("storage", reload);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", reload);
  };
}

/**
 * Diz se o guia está ocupando a tela.
 *
 * Existe para o convite do pôster poder se calar enquanto o onboarding fala —
 * os dois disparam a partir das mesmas memórias e apareceriam juntos para quem
 * já tem 5+ e abre o app num navegador novo.
 */
export function useOnboardingVisible(userId: string, count: number): boolean {
  const storageKey = keyFor(userId);
  const state = useSyncExternalStore(
    subscribe,
    () => snapshotFor(storageKey),
    getServerSnapshot,
  );
  if (count === 0) return !state.sessionDismissed;
  return !(state.dismissed || state.concluded);
}

type Props = {
  /** Escopo do progresso: cada conta tem o seu, mesmo no mesmo navegador. */
  userId: string;
  locations: LocationPhoto[];
  onOpenPoster: () => void;
  /** Some enquanto a pessoa está no meio de outra tarefa. */
  hidden?: boolean;
};

export default function OnboardingGuide({ userId, locations, onOpenPoster, hidden }: Props) {
  const storageKey = keyFor(userId);
  const state = useSyncExternalStore(
    subscribe,
    () => snapshotFor(storageKey),
    getServerSnapshot,
  );

  const count = locations.length;
  const noPhotos = count === 0;
  const reached = count >= ONBOARDING_MEMORIES_GOAL;
  const canPoster = count >= POSTER_MIN_PHOTOS;

  /* Sem nenhuma foto o guia volta a cada acesso: não há o que fazer no mapa sem
     memória guardada, e esconder o caminho não ajuda ninguém. A dispensa segue
     funcionando, mas só até recarregar a página. */
  const closed = noPhotos
    ? state.sessionDismissed
    : state.dismissed || state.concluded;

  if (closed || hidden) return null;

  const dismiss = () =>
    patch(storageKey, noPhotos ? { sessionDismissed: true } : { dismissed: true });
  const conclude = () => patch(storageKey, { concluded: true });

  /* ── 1. Boas-vindas ── */
  if (!state.started && noPhotos) {
    return (
      <div className="ob-stage">
        <section className="ob-card ob-welcome" role="dialog" aria-label="Bem-vindo ao guardei">
          <span className="ob-tape" />
          <button className="ob-close" onClick={dismiss} aria-label="Fechar">
            <X size={15} strokeWidth={1.8} />
          </button>

          <div className="ob-eyebrow">
            <Sparkles size={12} strokeWidth={1.8} /> seu mapa começa agora
          </div>
          <h2 className="ob-title">Todo mapa<br />começa vazio.</h2>
          <p className="ob-text">
            Comece marcando {ONBOARDING_MEMORIES_GOAL} lugares que significam alguma
            coisa para você. Depois é só ir somando — até virarem um pôster de papel.
          </p>

          <div className="ob-dots" aria-hidden>
            {Array.from({ length: ONBOARDING_MEMORIES_GOAL }, (_, i) => (
              <span key={i} className="ob-dot" style={{ animationDelay: `${i * 90}ms` }} />
            ))}
          </div>

          <button className="ob-cta" onClick={() => patch(storageKey, { started: true })}>
            Começar <ArrowRight size={15} strokeWidth={1.8} />
          </button>
        </section>
      </div>
    );
  }

  /* ── 3. Conquista ── */
  if (reached) {
    return (
      <div className="ob-stage">
        <section className="ob-card ob-achieved" role="dialog" aria-label="Primeiras memórias guardadas">
          <span className="ob-tape" />

          <div className="ob-seal" aria-hidden>
            <span className="ob-seal-ring" />
            <Sparkles size={26} strokeWidth={1.5} />
          </div>

          <div className="ob-eyebrow ob-eyebrow-gold">
            {canPoster ? "pronto para o pôster" : "seu mapa nasceu"}
          </div>
          <h2 className="ob-title">
            {count} memórias<br />guardadas.
          </h2>

          {canPoster ? (
            <p className="ob-text">
              Você chegou lá. O que estava solto no celular virou história — e agora
              vira papel: o seu pôster, impresso com as suas fotos de verdade,
              montado com <strong>{POSTER_MIN_PHOTOS} a {POSTER_MAX_PHOTOS} memórias</strong>,
              para a parede que você olha todo dia.
            </p>
          ) : (
            <p className="ob-text">
              Você começou. Daqui para frente é só somar: ao chegar em{" "}
              <strong>{POSTER_MIN_PHOTOS} a {POSTER_MAX_PHOTOS} memórias</strong>, elas viram
              o seu pôster — impresso com as suas fotos de verdade, para a parede
              que você olha todo dia.
            </p>
          )}

          <div className="ob-dots is-complete" aria-hidden>
            {Array.from({ length: ONBOARDING_MEMORIES_GOAL }, (_, i) => (
              <span key={i} className="ob-dot is-on" style={{ animationDelay: `${i * 110}ms` }} />
            ))}
          </div>

          {canPoster ? (
            <>
              <button
                className="ob-cta ob-cta-gold"
                onClick={() => { conclude(); onOpenPoster(); }}
              >
                Criar meu pôster <ArrowRight size={15} strokeWidth={1.8} />
              </button>
              <button className="ob-later" onClick={conclude}>agora não</button>
            </>
          ) : (
            <button className="ob-cta ob-cta-gold" onClick={conclude}>
              Guardar mais memórias <ArrowRight size={15} strokeWidth={1.8} />
            </button>
          )}
        </section>
      </div>
    );
  }

  /* ── 2. Coleta ── */
  const prompt = PROMPTS[Math.min(count, PROMPTS.length - 1)];
  const left = ONBOARDING_MEMORIES_GOAL - count;

  return (
    <aside className="ob-collect" aria-label="Progresso do seu mapa">
      <button className="ob-close" onClick={dismiss} aria-label="Fechar">
        <X size={14} strokeWidth={1.8} />
      </button>

      <div className="ob-dots" aria-hidden>
        {Array.from({ length: ONBOARDING_MEMORIES_GOAL }, (_, i) => (
          <span
            key={i}
            className={`ob-dot${i < count ? " is-on" : ""}${i === count - 1 ? " just-landed" : ""}`}
          />
        ))}
      </div>

      {/* a key faz a pergunta trocar com transição a cada memória guardada */}
      <p key={prompt} className="ob-prompt">{prompt}</p>

      <div className="ob-hint">
        <MapPin size={13} strokeWidth={1.7} />
        {count === 0
          ? "toque no mapa para marcar o lugar"
          : `${left === 1 ? "falta 1 memória" : `faltam ${left} memórias`} para começar`}
      </div>
    </aside>
  );
}
