"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FirebaseError } from "firebase/app";
import { onAuthStateChanged, type User } from "firebase/auth";
import MapView from "../components/MapView";
import UploadForm from "../components/UploadForm";
import QuickCapture from "../components/QuickCapture";
import { auth, signOutUser } from "@/lib/auth";
import { getLocations, deleteLocation } from "@/lib/firestore";
import type { LocationPhoto } from "@/types/location";

export default function MapPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<LocationPhoto[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

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
          ? "Sem permissão para ler os pontos."
          : "Não foi possível carregar os pontos.",
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) { router.replace("/"); return; }
      setUser(nextUser);
      await loadLocations(nextUser.uid);
      setLoading(false);
      // pede permissão de localização logo ao entrar, para o QuickCapture funcionar sem atraso
      navigator.geolocation?.getCurrentPosition(() => {}, () => {}, { maximumAge: Infinity });
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <main
        style={{
          position: "fixed", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--paper-100)",
        }}
      >
        <span style={{ fontFamily: "var(--font-hand)", fontSize: "var(--text-xl)", color: "var(--ink-500)", animation: "bob 1.8s ease-in-out infinite" }}>
          carregando mapa…
        </span>
      </main>
    );
  }

  const displayName = user?.displayName ?? user?.email ?? "viajante";

  return (
    /* full-screen container — position:fixed beats any body/html layout */
    <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>

      {/* ── MAP fills everything ── */}
      <div style={{ position: "absolute", inset: 0 }}>
        <MapView
          locations={locations}
          pickLocationEnabled
          selectedLocation={selectedLocation}
          onPickLocation={setSelectedLocation}
          onDelete={handleDelete}
        />
      </div>

      {/* ── HEADER floats on top ── */}
      <header
        style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 50,
          background: "rgba(245, 239, 224, 0.82)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--paper-300)",
        }}
      >
        <div style={{
          padding: "12px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span className="brand" style={{ fontSize: 24 }}>
              guardei<span className="amp">,</span>
            </span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "var(--ink-500)", paddingLeft: 14,
              borderLeft: "1px solid var(--paper-400)",
            }}>
              mapa de memórias
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              color: "var(--ink-600)", letterSpacing: "0.1em",
              maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {displayName}
            </span>
            <button
              onClick={() => signOutUser()}
              style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: "var(--ink-600)", background: "none",
                border: "1px dashed var(--paper-400)",
                borderRadius: "var(--radius-sm)", padding: "6px 14px", cursor: "pointer",
                transition: "all var(--duration) var(--ease-soft)",
              }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = "var(--accent-tomato)"; (e.target as HTMLButtonElement).style.borderColor = "var(--accent-tomato)"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = "var(--ink-600)"; (e.target as HTMLButtonElement).style.borderColor = "var(--paper-400)"; }}
            >
              sair
            </button>
          </div>
        </div>
      </header>

      {/* ── QUICK CAPTURE ── */}
      {!selectedLocation && (
        <QuickCapture userId={user!.uid} onCaptured={handleUploaded} />
      )}

      {/* ── UPLOAD PANEL floats top-left ── */}
      {selectedLocation && (
        <UploadForm
          userId={user!.uid}
          onUploaded={handleUploaded}
          selectedLocation={selectedLocation}
          onCancel={() => setSelectedLocation(null)}
        />
      )}

      {/* ── ONBOARDING ── */}
      {!loading && locations.length === 0 && !onboardingDismissed && !selectedLocation && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 55,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            pointerEvents: "all",
            background: "var(--paper-50)",
            border: "1px solid var(--paper-300)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 40px rgba(42,31,20,0.18), 0 2px 8px rgba(42,31,20,0.10)",
            padding: "36px 40px 32px",
            maxWidth: 400, width: "calc(100vw - 48px)",
            position: "relative",
            transform: "rotate(-1deg)",
          }}>
            {/* tape */}
            <div style={{
              position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
              width: 64, height: 20,
              background: "rgba(212,190,148,0.55)",
              borderRadius: 2,
            }} />

            {/* close */}
            <button
              onClick={() => setOnboardingDismissed(true)}
              aria-label="Fechar"
              style={{
                position: "absolute", top: 14, right: 16,
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--font-mono)", fontSize: 13,
                color: "var(--ink-400)", lineHeight: 1,
                padding: 4,
              }}
            >✕</button>

            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 10,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "var(--ink-500)", marginBottom: 14,
            }}>primeira memória</div>

            <div style={{
              fontFamily: "var(--font-display)", fontSize: "var(--text-xl)",
              color: "var(--ink-900)", lineHeight: "var(--leading-snug)",
              marginBottom: 14,
            }}>
              Seu mapa ainda<br />está em branco.
            </div>

            <p style={{
              fontFamily: "var(--font-body)", fontSize: "var(--text-sm)",
              color: "var(--ink-600)", lineHeight: "var(--leading-body)",
              marginBottom: 20,
            }}>
              Clique em qualquer lugar do mapa para marcar onde uma memória aconteceu. Depois é só escolher uma foto e escrever o que você sentiu.
            </p>

            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px",
              background: "var(--paper-100)",
              borderRadius: "var(--radius-sm)",
              border: "1px dashed var(--paper-400)",
            }}>
              <span style={{ fontSize: 18 }}>📍</span>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: "var(--ink-600)", letterSpacing: "0.05em",
              }}>
                toque no mapa → escolha a foto → guarde
              </span>
            </div>

            <div style={{
              marginTop: 24,
              fontFamily: "var(--font-hand)", fontSize: "var(--text-md)",
              color: "var(--ink-400)", textAlign: "right",
            }}>
              — guardei.
            </div>
          </div>
        </div>
      )}

      {/* ── ERROR TOAST ── */}
      {error && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 60, background: "var(--paper-50)",
          border: "1px solid var(--danger)", borderRadius: "var(--radius)",
          padding: "10px 20px", fontFamily: "var(--font-mono)",
          fontSize: 12, letterSpacing: "0.1em", color: "var(--danger)",
          boxShadow: "var(--shadow-md)",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
