"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FirebaseError } from "firebase/app";
import { onAuthStateChanged, type User } from "firebase/auth";
import MapView from "../components/MapView";
import OnThisDay from "../components/OnThisDay";
import UploadForm from "../components/UploadForm";
import PosterWizard from "../components/poster/PosterWizard";
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

  const onThisDayMemory = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();
    const matches = locations.filter((m) => {
      const d = new Date(m.createdAt);
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
      new Date(onThisDayMemory.createdAt).getFullYear()
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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <MapView
          locations={locations}
          pickLocationEnabled
          selectedLocation={selectedLocation}
          onPickLocation={setSelectedLocation}
          onDelete={handleDelete}
        />
      </div>

      <header style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(245, 239, 224, 0.82)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderBottom: "1px solid var(--paper-300)" }}>
        <div style={{ padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/logo.svg" alt="guardei" style={{ height: 36, width: "auto" }} />
            <span className="brand" style={{ fontSize: 22 }}>guardei<span className="amp">,</span></span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-500)", paddingLeft: 14, borderLeft: "1px solid var(--paper-400)" }}>
              mapa de memorias
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-600)", letterSpacing: "0.1em", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName}
            </span>

            {locations.length > 0 && (
              <button
                onClick={() => setPosterOpen(true)}
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-600)", background: "none", border: "1px dashed var(--paper-400)", borderRadius: "var(--radius-sm)", padding: "6px 14px", cursor: "pointer", transition: "all var(--duration) var(--ease-soft)", display: "flex", alignItems: "center", gap: 6 }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = "#b8860b"; (e.target as HTMLButtonElement).style.borderColor = "#b8860b"; }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = "var(--ink-600)"; (e.target as HTMLButtonElement).style.borderColor = "var(--paper-400)"; }}
              >
                <span style={{ fontSize: 13 }}>🖼️</span>
                poster
              </button>
            )}

            {username && (
              <button
                onClick={handleShareProfile}
                title={`guardei.art/u/${username}`}
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: copied ? "#00b4c8" : "var(--ink-600)", background: "none", border: `1px dashed ${copied ? "#00b4c8" : "var(--paper-400)"}`, borderRadius: "var(--radius-sm)", padding: "6px 14px", cursor: "pointer", transition: "all var(--duration) var(--ease-soft)", display: "flex", alignItems: "center", gap: 6 }}
              >
                <span style={{ fontSize: 13 }}>{copied ? "✓" : "🔗"}</span>
                {copied ? "copiado!" : "compartilhar"}
              </button>
            )}

            <button
              onClick={() => signOutUser()}
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-600)", background: "none", border: "1px dashed var(--paper-400)", borderRadius: "var(--radius-sm)", padding: "6px 14px", cursor: "pointer", transition: "all var(--duration) var(--ease-soft)" }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = "var(--accent-tomato)"; (e.target as HTMLButtonElement).style.borderColor = "var(--accent-tomato)"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = "var(--ink-600)"; (e.target as HTMLButtonElement).style.borderColor = "var(--paper-400)"; }}
            >
              sair
            </button>
          </div>
        </div>
      </header>

      {selectedLocation && (
        <UploadForm
          userId={user!.uid}
          onUploaded={handleUploaded}
          selectedLocation={selectedLocation}
          onCancel={() => setSelectedLocation(null)}
        />
      )}

      {!loading && onThisDayMemory && !onThisDayDismissed && (
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
            <button onClick={() => setOnboardingDismissed(true)} aria-label="Fechar" style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-400)", lineHeight: 1, padding: 4 }}>{"✕"}</button>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-500)", marginBottom: 14 }}>primeira memoria</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", color: "var(--ink-900)", lineHeight: "var(--leading-snug)", marginBottom: 14 }}>
              Seu mapa ainda<br />esta em branco.
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-sm)", color: "var(--ink-600)", lineHeight: "var(--leading-body)", marginBottom: 20 }}>
              Clique em qualquer lugar do mapa para marcar onde uma memoria aconteceu.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--paper-100)", borderRadius: "var(--radius-sm)", border: "1px dashed var(--paper-400)" }}>
              <span style={{ fontSize: 18 }}>{"📍"}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-600)", letterSpacing: "0.05em" }}>toque no mapa, escolha a foto, guarde</span>
            </div>
            <div style={{ marginTop: 24, fontFamily: "var(--font-hand)", fontSize: "var(--text-md)", color: "var(--ink-400)", textAlign: "right" }}>guardei.</div>
          </div>
        </div>
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
