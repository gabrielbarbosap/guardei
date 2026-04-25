"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import { auth, signInWithEmail, signInWithGoogle, signUpWithEmail } from "@/lib/auth";
import dynamic from "next/dynamic";
import type { GlobePin } from "./components/InkGlobe";
import { PINS } from "./components/InkGlobe";

const InkGlobe = dynamic(() => import("./components/InkGlobe"), { ssr: false });

// ---- icons ----------------------------------------------------------
function IconScribble({ name, color = "var(--ink-800)" }: { name: string; color?: string }) {
  const c = { fill: "none" as const, stroke: color, strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "pin":    return <svg width="28" height="28" viewBox="0 0 24 24" {...c}><path d="M12 2a7 7 0 0 0-7 7c0 5.5 7 13 7 13s7-7.5 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.4"/></svg>;
    case "book":   return <svg width="28" height="28" viewBox="0 0 24 24" {...c}><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H6a2 2 0 0 0-2 2V4.5z"/><path d="M4 20a2 2 0 0 1 2-2h13"/></svg>;
    case "map":    return <svg width="28" height="28" viewBox="0 0 24 24" {...c}><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14"/><path d="M15 6v14"/></svg>;
    case "heart":  return <svg width="28" height="28" viewBox="0 0 24 24" {...c}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/></svg>;
    case "camera": return <svg width="28" height="28" viewBox="0 0 24 24" {...c}><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.6"/><path d="M8 6l2-2h4l2 2"/></svg>;
    case "arrow":  return <svg width="20" height="20" viewBox="0 0 24 24" {...c}><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>;
    default: return null;
  }
}

// Google logo SVG
function GoogleLogo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ---- Auth Modal -----------------------------------------------------
function AuthModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setError(""); setLoading(true);
    try { await signInWithGoogle(); }
    catch { setError("Não foi possível entrar com Google."); setLoading(false); }
  }
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try { await signInWithEmail(email, password); }
    catch { setError("Email ou senha inválidos."); setLoading(false); }
  }
  async function handleSignUp() {
    setError(""); setLoading(true);
    try { await signUpWithEmail(email, password); }
    catch { setError("Não foi possível criar a conta."); setLoading(false); }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        <h2>Bem-vindo</h2>
        <p className="subtitle">Entre ou crie seu caderno de memórias.</p>

        <button className="google-btn" onClick={handleGoogle} disabled={loading}>
          <GoogleLogo /> Continuar com Google
        </button>

        <div className="divider"><span>ou com email</span></div>

        <form onSubmit={handleSignIn}>
          <div className="field">
            <label>email</label>
            <input type="email" placeholder="voce@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>senha</label>
            <input type="password" placeholder="••••••" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <div className="auth-actions">
            <button type="submit" className="btn-primary" disabled={loading}>Entrar</button>
            <button type="button" className="btn-ghost" onClick={handleSignUp} disabled={loading}>Criar conta</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Landing sections -----------------------------------------------
function Header({ onLogin }: { onLogin: () => void }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/photos/logo.svg" alt="guardei" style={{ height: 44, width: "auto" }} />
        </div>
        <nav className="nav">
          <a href="#como">Como funciona</a>
          <a href="#memorias">Memórias</a>
        </nav>
        <div className="nav-cta">
          <button className="link-ghost" onClick={onLogin}>Entrar</button>
          <button className="btn-stamp" onClick={onLogin}>
            <IconScribble name="arrow" color="var(--paper-50)" />
            Criar caderno
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero({ onLogin }: { onLogin: () => void }) {
  const [currentPin, setCurrentPin] = useState<GlobePin>(PINS[0]);

  return (
    <section className="hero">
      <div className="scrap scrap-stamp">
        <div>POSTED</div><div className="big">AIR MAIL</div><div>★ vol. 01 ★</div>
      </div>
      <div className="scrap scrap-ticket" aria-hidden>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>boarding</span>
        <strong>GRU → CDG</strong>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>03 · abr</span>
      </div>

      <div className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow"><span className="dot" /> um caderno de memórias. só seu.</div>
          <h1 className="hero-headline">
            Sua vida é feita<br />de <em>momentos</em>.<br />Guarde os que<br />valem <span className="hl">lembrar</span>.
          </h1>
          <p className="hero-sub">
            As pessoas, as ruas, os cheiros — tudo vive em algum lugar do mundo.
            Guardei é onde você devolve cada lembrança ao lugar onde ela aconteceu.
          </p>
          <div className="cta-row">
            <button className="btn-primary" onClick={onLogin}>Criar meu caderno</button>
            <button className="btn-ghost" onClick={onLogin}>ver uma demo <IconScribble name="arrow" /></button>
          </div>
          <div className="hero-meta">
            <span><strong>12.483</strong> memórias guardadas</span>
            <span className="sep">·</span>
            <span><strong>94</strong> países visitados</span>
            <span className="sep">·</span>
            <span><strong>privado</strong> por padrão</span>
          </div>
        </div>

        <div className="hero-globe">
          <div className="globe-frame">
            <InkGlobe size={560} autoRotate speed={0.12} cycleInterval={4200} onFocus={setCurrentPin} onlyWithPhoto />
          </div>
          <div className="globe-log">
            <span className="label">agora guardando</span>
            <div className="log-title">{currentPin.title}</div>
            <div className="log-place">{currentPin.place}</div>
          </div>
        </div>
      </div>

      <div className="hero-whisper">
        <span>role para baixo</span>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>
        </svg>
      </div>
    </section>
  );
}

const VALUES = [
  { icon: "camera", title: "Guarde sem pensar",      body: "Uma foto, três linhas, o nome da rua. Depois você se diverte organizando — ou nunca mais precisa." },
  { icon: "map",    title: "Sua vida num mapa",      body: "Cada lembrança tem um lugar. Quando você se afasta, vê o mundo todo feito de você." },
  { icon: "book",   title: "Volta quando quiser",    body: "Um dia qualquer, você sente falta daquela manhã. Está tudo aqui, do jeito que você deixou." },
  { icon: "heart",  title: "Compartilha, se quiser", body: "Alguns cadernos só seus. Outros, você abre para quem estava lá com você — nunca para o resto do mundo." },
] as const;

function ValueSection() {
  return (
    <section id="como" className="values">
      <div className="section-head">
        <div className="eyebrow">por que guardei</div>
        <h2>Um lugar onde a <em>saudade</em><br />não se perde.</h2>
      </div>
      <div className="values-grid">
        {VALUES.map((v, i) => (
          <article className="value-card" key={v.title}>
            <div className="vc-tape" />
            <div className="vc-num">{String(i + 1).padStart(2, "0")}</div>
            <div className="vc-icon"><IconScribble name={v.icon} /></div>
            <h3>{v.title}</h3>
            <p>{v.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const MEMORIES = [
  { author: "Marina · 31", place: "Porto, Portugal", photo: "/photos/two-little-brothers-standing-with-skateboard-near-guardrail-against-background-seacoast-sunset.jpg", body: "Guardei o som da padaria da esquina. Achei que ia esquecer em uma semana. Era ontem.", rot: -2, mood: "tomato" },
  { author: "Tomás · 27",  place: "Salvador",        photo: "/photos/blonde-woman-hat-white-dress-smiles-looks-boyfriend-holds-pink-camera.jpg",                          body: "Meu avô morreu em março. Ainda entro na pasta \"Itapuã 98\" só pra ouvir a voz dele.", rot: 3,  mood: "ink" },
  { author: "Yuki · 29",   place: "Quioto",          photo: "/photos/young-sportswoman-drinking-nature.jpg",                                                               body: "Vim sozinha e escrevi todo dia. Voltei com um caderno. Caderno virou livro.", rot: -3, mood: "rose" },
  { author: "Pedro · 34",  place: "Chapada",         photo: "/photos/evening-summer-sun-makes-halo-around-beautiful-wedding-couple.jpg",                                   body: "A gente esquece o nome das trilhas. Aqui tá tudo escrito — e ainda cheira a eucalipto.", rot: 2,  mood: "moss" },
  { author: "Ana · 26",    place: "São Paulo",       photo: "/photos/girls-hugging-graduation.jpg",                                                                        body: "Doze anos depois, a gente se formou junto. Essa foto vale mais que o diploma.", rot: -1, mood: "highlight" },
];

function MemoryWall() {
  return (
    <section id="memorias" className="memories">
      <div className="section-head">
        <div className="eyebrow">cadernos reais · trechos compartilhados pelos autores</div>
        <h2>As pessoas estão<br />guardando coisas <em>pequenas</em>.</h2>
        <p className="sh-lead">Nada de momentos épicos. A padaria, o beco, a mão. Isso é o que a gente volta pra ler.</p>
      </div>
      <div className="memories-grid">
        {MEMORIES.map((m, i) => (
          <article key={m.author} className="memo-card" style={{ transform: `rotate(${m.rot}deg)` }}>
            {i % 2 === 0 ? <div className="memo-tape" /> : <div className="memo-tape alt" />}
            <div className="memo-photo">
              <Image src={m.photo} alt={m.place} fill style={{ objectFit: "cover" }} sizes="320px" />
              <div className="memo-stamp" style={{ color: `var(--accent-${m.mood})` }}>★</div>
              <div className="memo-photo-grain" />
            </div>
            <blockquote>
              <p>&ldquo;{m.body}&rdquo;</p>
              <footer>
                <span className="memo-author">{m.author}</span>
                <span className="memo-place">{m.place}</span>
              </footer>
            </blockquote>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinalCTA({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="signup" className="final-cta">
      <div className="postcard">
        <div className="pc-stamp">
          <div>GUARDEI</div><div className="big">★</div><div>2026</div>
        </div>
        <div className="pc-body">
          <div className="eyebrow">um último bilhete</div>
          <h2>Você não vai se<br />lembrar de <em>hoje</em>.<br />A menos que guarde.</h2>
          <p>Abra um caderno agora. Escreve três linhas. A gente cuida do resto — o lugar no mapa, a data, o cheiro dessa quinta-feira.</p>
          <div className="cta-row">
            <button className="btn-primary" onClick={onLogin}>Criar meu caderno</button>
          </div>
          <div className="pc-fine">grátis · sem cartão · privado por padrão</div>
        </div>
        <div className="pc-sig">— com saudade, <br />guardei.</div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="sf-inner">
        <div className="sf-brand">
          <div className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/logo.svg" alt="guardei" style={{ height: 40, width: "auto" }} />
          </div>
          <p className="mono">um caderno de viagens que nunca se perde.</p>
        </div>
        <div className="sf-cols">
          <div>
            <div className="sf-title">produto</div>
            <a href="#">Como funciona</a>
            <a href="#">Privacidade</a>
            <a href="#">Exportar meu caderno</a>
          </div>
          <div>
            <div className="sf-title">empresa</div>
            <a href="#">Manifesto</a>
            <a href="#">Imprensa</a>
            <a href="#">Contato</a>
          </div>
          <div>
            <div className="sf-title">canais</div>
            <a href="#">Instagram</a>
            <a href="#">Newsletter quinzenal</a>
          </div>
        </div>
      </div>
      <div className="sf-bottom">
        <span>guardei · 2026</span>
        <span>feito com saudade em são paulo · lisboa · tóquio</span>
      </div>
    </footer>
  );
}

// ---- Main page ------------------------------------------------------
export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/map");
      } else {
        setChecking(false);
        document.body.dataset.palette = "paper";
        document.body.dataset.grain = "on";
      }
    });
    return () => {
      unsubscribe();
      delete document.body.dataset.palette;
      delete document.body.dataset.grain;
    };
  }, [router]);

  if (checking) {
    return <main className="flex min-h-screen items-center justify-center" style={{ background: "var(--paper-100)" }} />;
  }

  return (
    <>
      <div className="page">
        <Header onLogin={() => setShowAuth(true)} />
        <Hero onLogin={() => setShowAuth(true)} />
        <ValueSection />
        <MemoryWall />
        <FinalCTA onLogin={() => setShowAuth(true)} />
        <SiteFooter />
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
