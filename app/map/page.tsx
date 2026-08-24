"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FirebaseError } from "firebase/app";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Frame, Link2, Check, LogOut, MapPin, X } from "lucide-react";
import MapView from "../components/MapView";
import OnThisDay from "../components/OnThisDay";
import UploadForm from "../components/UploadForm";
import PosterNudge from "../components/PosterNudge";
import PosterWizard from "../components/poster/PosterWizard";
import MapFilter from "../components/MapFilter";
import { ALL_MEMORIES, applyDateFilter, memoryDateOf, type DateFilter } from "@/lib/memoryDate";
import { auth, signOutUser } from "@/lib/auth";
import { getLocations, deleteLocation, ensureUsername } from "@/lib/firestore";
import type { LocationPhoto } from "@/types/location";

export default function MapPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<LocationPhoto[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [onThisDayDismissed, setOnThisDayDismissed] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>(ALL_MEMORIES);

  const visibleLocations = useMemo(
    () => applyDateFilter(locations, dateFilter),
    [locations, dateFilter],
  );

  const onThisDayMemory = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();
    const matches = locations.filter((m) => {
      // usa quando a memória aconteceu, não quando foi enviada
      const d = new Date(memoryDateOf(m));
      return (
        d.getMonth() === todayMonth &&
        d.getDate() === todayDate &&
        d.getFullYear() < currentYear
      );
    });
    return matches[0] ?? null;
  }, [locations]);

  const onThisDayYearsAgo = useMemo(() => {
    if (!onThisDayMemory) return 0;
    return (
      new Date().getFullYear() -
      new Date(memoryDateOf(onThisDayMemory)).getFullYear()
    );
  }, [onThisDayMemory]);

  async function loadLocations(uid: string) {
    try {
      const data = await getLocations(uid);
      setLocations(data);
      setError("");
    } catch (err) {
      const firebaseError = err as FirebaseError;
      console.error("loadLocations error:", firebaseError.code, firebaseError.message);
      setError(
        firebaseError.code === "permission-denied"
          ? "Sem permissao para ler os pontos."
          : "Nao foi possivel carregar os pontos.",
      );
      setLocations([]);
    }
  }

  async function handleUploaded() {
    await loadLocations(user!.uid);
    setSelectedLocation(null);
    // sem isso, uma memória com data fora do filtro atual sumiria assim que salva
    setDateFilter(ALL_MEMORIES);
  }

  async function handleDelete(locationId: string) {
    await deleteLocation(user!.uid, locationId);
    await loadLocations(user!.uid);
  }

  async function handleShareProfile() {
    const url = `https://guardei.art/u/${username}`;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) { router.replace("/"); return; }
      setUser(nextUser);
      await loadLocations(nextUser.uid);
      ensureUsername(nextUser.uid, nextUser.displayName, nextUser.email)
        .then(setUsername)
        .catch(console.error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <main style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper-100)" }}>
        <span style={{ fontFamily: "var(--font-hand)", fontSize: "var(--text-xl)", color: "var(--ink-500)", animation: "bob 1.8s ease-in-out infinite" }}>
          carregando mapa...
        </span>
      </main>
    );
  }

  const displayName = user?.displayName ?? user?.email ?? "viajante";
  const showOnThisDay = Boolean(onThisDayMemory) && !onThisDayDismissed;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <MapView
          locations={visibleLocations}
          pickLocationEnabled
          selectedLocation={selectedLocation}
          onPickLocation={setSelectedLocation}
          onDelete={handleDelete}
        />
      </div>

      <header className="map-header">
        <div className="map-header-inner">
          <div className="map-brand-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/logo.svg" alt="guardei" style={{ height: 36, width: "auto" }} />
            <span className="brand" style={{ fontSize: 22 }}>guardei<span className="amp">,</span></span>
            <span className="map-page-title">mapa de memórias</span>
          </div>

          <div className="map-actions">
            <span className="map-user-name">{displayName}</span>

            <button
              className="map-cta-poster"
              onClick={() => setPosterOpen(true)}
              disabled={locations.length === 0}
              title={
                locations.length === 0
                  ? "Guarde uma memória primeiro para montar seu pôster"
                  : "Monte um pôster com suas memórias"
              }
            >
              <Frame size={14} strokeWidth={1.7} />
              pôster
              {locations.length > 0 && <span className="cta-count">{locations.length}</span>}
            </button>

            {username && (
              <button
                className={`map-btn${copied ? " is-done" : ""}`}
                onClick={handleShareProfile}
                title={`guardei.art/u/${username}`}
              >
                {copied ? <Check size={14} strokeWidth={1.8} /> : <Link2 size={14} strokeWidth={1.7} />}
                <span className="btn-label">{copied ? "copiado!" : "compartilhar"}</span>
              </button>
            )}

            <button className="map-btn is-danger" onClick={() => signOutUser()} title="Sair da conta">
              <LogOut size={14} strokeWidth={1.7} />
              <span className="btn-label">sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* o painel de nova memória ocupa o mesmo canto: um de cada vez */}
      {!selectedLocation && (
        <MapFilter
          locations={locations}
          filter={dateFilter}
          onChange={setDateFilter}
          visibleCount={visibleLocations.length}
        />
      )}

      {selectedLocation && (
        <UploadForm
          userId={user!.uid}
          onUploaded={handleUploaded}
          selectedLocation={selectedLocation}
          onCancel={() => setSelectedLocation(null)}
        />
      )}

      {showOnThisDay && (
        <OnThisDay
          memory={onThisDayMemory}
          yearsAgo={onThisDayYearsAgo}
          onDismiss={() => setOnThisDayDismissed(true)}
        />
      )}

      {!loading && locations.length === 0 && !onboardingDismissed && !selectedLocation && (
        <div style={{ position: "fixed", inset: 0, zIndex: 55, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "all", background: "var(--paper-50)", border: "1px solid var(--paper-300)", borderRadius: "var(--radius-md)", boxShadow: "0 8px 40px rgba(42,31,20,0.18), 0 2px 8px rgba(42,31,20,0.10)", padding: "36px 40px 32px", maxWidth: 400, width: "calc(100vw - 48px)", position: "relative", transform: "rotate(-1deg)" }}>
            <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", width: 64, height: 20, background: "rgba(212,190,148,0.55)", borderRadius: 2 }} />
            <button onClick={() => setOnboardingDismissed(true)} aria-label="Fechar" style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--ink-400)", lineHeight: 1, padding: 4, display: "flex" }}><X size={15} strokeWidth={1.8} /></button>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-500)", marginBottom: 14 }}>primeira memória</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", color: "var(--ink-900)", lineHeight: "var(--leading-snug)", marginBottom: 14 }}>
              Seu mapa ainda<br />está em branco.
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--ink-600)", lineHeight: "var(--leading-body)", marginBottom: 20 }}>
              Clique em qualquer lugar do mapa para marcar onde uma memória aconteceu.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--paper-100)", borderRadius: "var(--radius-sm)", border: "1px dashed var(--paper-400)" }}>
              <MapPin size={17} strokeWidth={1.6} style={{ color: "var(--accent-tomato)", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-600)", letterSpacing: "0.05em" }}>toque no mapa, escolha a foto, guarde</span>
            </div>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px dashed var(--paper-400)", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--ink-500)", lineHeight: 1.55 }}>
              Depois de algumas memórias, dá para imprimir tudo num pôster e pendurar na parede.
            </div>
            <div style={{ marginTop: 24, fontFamily: "var(--font-hand)", fontSize: "var(--text-md)", color: "var(--ink-400)", textAlign: "right" }}>guardei.</div>
          </div>
        </div>
      )}

      {/* um convite de cada vez: o "há um ano" tem prioridade sobre o pôster */}
      {!loading && !posterOpen && !selectedLocation && !showOnThisDay && (
        <PosterNudge locations={locations} onOpenPoster={() => setPosterOpen(true)} />
      )}

      {posterOpen && user && (
        <PosterWizard
          user={user}
          locations={locations}
          onClose={() => setPosterOpen(false)}
        />
      )}

      {error && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: "var(--paper-50)", border: "1px solid var(--danger)", borderRadius: "var(--radius)", padding: "10px 20px", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.1em", color: "var(--danger)", boxShadow: "var(--shadow-md)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
