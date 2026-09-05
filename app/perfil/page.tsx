"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import Link from "next/link";
import {
  Check, Link2, LogOut, MapPinned, Globe, Layers, CalendarRange, Loader2,
  Receipt, ClipboardList, ChevronRight,
} from "lucide-react";
import MainNav from "@/app/components/MainNav";
import { auth, signOutUser } from "@/lib/auth";
import { getLocations, getUserProfile, saveUserProfile, ensureUsername } from "@/lib/firestore";
import { computeProfileStats, flagFor } from "@/lib/profileStats";
import { formatMemoryDate } from "@/lib/memoryDate";
import { PROFILE_LIMITS, type UserProfile } from "@/types/user";
import { ADMIN_EMAILS } from "@/lib/adminEmails";
import type { LocationPhoto } from "@/types/location";

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<LocationPhoto[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [publicEnabled, setPublicEnabled] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const stats = useMemo(() => computeProfileStats(locations), [locations]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) { router.replace("/"); return; }
      setUser(nextUser);
      try {
        const [locs, username] = await Promise.all([
          getLocations(nextUser.uid),
          ensureUsername(nextUser.uid, nextUser.displayName, nextUser.email),
        ]);
        setLocations(locs);
        const prof = (await getUserProfile(nextUser.uid)) ?? { username };
        setProfile(prof);
        setDisplayName(prof.displayName ?? nextUser.displayName ?? "");
        setBio(prof.bio ?? "");
        setCity(prof.city ?? "");
        setPublicEnabled(prof.publicProfileEnabled !== false);
      } catch (err) {
        console.error("perfil:", err);
        setError("Não foi possível carregar seu perfil.");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      await saveUserProfile(user.uid, {
        displayName, bio, city, publicProfileEnabled: publicEnabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      console.error("perfil salvar:", err);
      setError("Não foi possível salvar. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!profile?.username) return;
    const url = `https://guardei.art/u/${profile.username}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <main className="profile-loading">
        <span>carregando seu perfil...</span>
      </main>
    );
  }

  const maxYear = Math.max(1, ...stats.byYear.map((y) => y.count));
  const avatar = user?.photoURL ?? null;
  const initial = (displayName || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <main className="profile-page">
      <header className="map-header">
        <div className="map-header-inner">
          <div className="map-brand-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/logo.png" alt="guardei" style={{ height: 36, width: "auto" }} />
            <span className="brand" style={{ fontSize: 22 }}>guardei<span className="amp">,</span></span>
            <span className="map-page-title">seu perfil</span>
          </div>
          <MainNav username={profile?.username} memoriesCount={locations.length} />
        </div>
      </header>

      <div className="profile-body">
        {/* ── identidade ── */}
        <section className="profile-card profile-identity">
          <span className="vc-tape" />
          <div className="pi-avatar">
            {avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatar} alt="" referrerPolicy="no-referrer" />
              : <span>{initial}</span>}
          </div>
          <div className="pi-info">
            <h1>{displayName || "sem nome"}</h1>
            <p className="pi-handle">@{profile?.username}</p>
            <p className="pi-email">{user?.email}</p>
          </div>
          <button className={`map-btn${copied ? " is-done" : ""}`} onClick={copyLink}>
            {copied ? <Check size={14} strokeWidth={1.8} /> : <Link2 size={14} strokeWidth={1.7} />}
            <span className="btn-label">{copied ? "copiado!" : "copiar link"}</span>
          </button>
        </section>

        {/* ── números ── */}
        <section className="profile-stats">
          <article className="stat-card">
            <MapPinned size={17} strokeWidth={1.6} />
            <strong>{stats.memories}</strong>
            <span>{stats.memories === 1 ? "memória" : "memórias"}</span>
          </article>
          <article className="stat-card">
            <Globe size={17} strokeWidth={1.6} />
            <strong>{stats.countries}</strong>
            <span>{stats.countries === 1 ? "país" : "países"}</span>
          </article>
          <article className="stat-card">
            <CalendarRange size={17} strokeWidth={1.6} />
            <strong>{stats.yearsCovered}</strong>
            <span>{stats.yearsCovered === 1 ? "ano" : "anos"}</span>
          </article>
          <article className="stat-card">
            <Layers size={17} strokeWidth={1.6} />
            <strong>{stats.publicMemories}</strong>
            <span>públicas</span>
          </article>
        </section>

        {/* ── linha do tempo ── */}
        {stats.byYear.length > 0 && (
          <section className="profile-card">
            <h2 className="profile-h2">Sua linha do tempo</h2>
            <div className="timeline">
              {stats.byYear.map(({ year, count }) => (
                <div className="tl-col" key={year} title={`${count} em ${year}`}>
                  <span className="tl-count">{count}</span>
                  <div className="tl-bar" style={{ height: `${Math.round((count / maxYear) * 100)}%` }} />
                  <span className="tl-year">{year}</span>
                </div>
              ))}
            </div>
            {stats.firstAt && stats.lastAt && (
              <p className="profile-note">
                De {formatMemoryDate(stats.firstAt)} a {formatMemoryDate(stats.lastAt)}.
              </p>
            )}
          </section>
        )}

        {/* ── países ── */}
        {stats.countryCodes.length > 0 && (
          <section className="profile-card">
            <h2 className="profile-h2">Onde você esteve</h2>
            <div className="country-list">
              {stats.countryCodes.map((code) => (
                <span className="country-chip" key={code}>
                  <span aria-hidden>{flagFor(code)}</span> {code}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── dados editáveis ── */}
        <section className="profile-card">
          <h2 className="profile-h2">Seus dados</h2>

          <label className="of-field">
            <span>Nome</span>
            <input
              type="text" value={displayName} maxLength={PROFILE_LIMITS.displayName}
              onChange={(e) => setDisplayName(e.target.value)} placeholder="Como você quer ser chamado"
            />
          </label>

          <label className="of-field">
            <span>Sobre você</span>
            <input
              type="text" value={bio} maxLength={PROFILE_LIMITS.bio}
              onChange={(e) => setBio(e.target.value)} placeholder="uma linha que aparece no seu mapa público"
            />
            <small className="field-counter">{bio.length}/{PROFILE_LIMITS.bio}</small>
          </label>

          <label className="of-field">
            <span>Onde você mora</span>
            <input
              type="text" value={city} maxLength={PROFILE_LIMITS.city}
              onChange={(e) => setCity(e.target.value)} placeholder="cidade"
            />
          </label>

          <label className="profile-toggle">
            <span
              role="switch" aria-checked={publicEnabled}
              onClick={() => setPublicEnabled((v) => !v)}
              className={`pt-switch${publicEnabled ? " is-on" : ""}`}
            >
              <span className="pt-knob" />
            </span>
            <span className="pt-text">
              <strong>Mapa público ligado</strong>
              <small>
                Quem tiver o link vê as memórias que você marcou como públicas.
                Desligar esconde a página inteira sem apagar nada.
              </small>
            </span>
          </label>

          {error && <span className="of-error">{error}</span>}

          <button className="profile-save" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="spin" /> : saved ? <Check size={14} strokeWidth={2.2} /> : null}
            {saving ? "salvando..." : saved ? "salvo" : "salvar alterações"}
          </button>
        </section>

        {/* ── compras ──
            Fica no perfil, e nao na barra de navegacao, porque a barra tem
            quatro itens fixos por decisao de layout no celular. */}
        <section className="profile-card">
          <h2 className="profile-h2">Compras</h2>
          <Link href="/pedidos" className="profile-link">
            <Receipt size={15} strokeWidth={1.7} />
            <span>meus pedidos e rastreio</span>
            <ChevronRight size={15} strokeWidth={1.7} />
          </Link>
          {user?.email && ADMIN_EMAILS.includes(user.email) && (
            <Link href="/admin/pedidos" className="profile-link is-admin">
              <ClipboardList size={15} strokeWidth={1.7} />
              <span>painel de pedidos</span>
              <ChevronRight size={15} strokeWidth={1.7} />
            </Link>
          )}
        </section>

        {/* ── conta ── */}
        <section className="profile-card">
          <h2 className="profile-h2">Conta</h2>
          <dl className="profile-meta">
            <div><dt>E-mail</dt><dd>{user?.email ?? "—"}</dd></div>
            <div><dt>Endereço público</dt><dd>guardei.art/u/{profile?.username}</dd></div>
          </dl>
          <button className="profile-signout" onClick={() => signOutUser()}>
            <LogOut size={14} strokeWidth={1.7} />
            sair da conta
          </button>
        </section>
      </div>
    </main>
  );
}
