"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FirebaseError } from "firebase/app";
import { onAuthStateChanged, type User } from "firebase/auth";
import MapView from "../components/MapView";
import OnThisDay from "../components/OnThisDay";
import UploadForm from "../components/UploadForm";
import PrivacyGate from "../components/PrivacyGate";
import MainNav from "../components/MainNav";
import PosterNudge from "../components/PosterNudge";
import OnboardingGuide, { useOnboardingVisible } from "../components/onboarding/OnboardingGuide";
import PosterWizard from "../components/poster/PosterWizard";
import MapFilter from "../components/MapFilter";
import { ALL_MEMORIES, applyDateFilter, memoryDateOf, type DateFilter } from "@/lib/memoryDate";
import { auth } from "@/lib/auth";
import { notifyWelcome } from "@/lib/notify";
import {
  getLocations, deleteLocation, ensureUsername, setLocationVisibility,
  getUserProfile, acceptPrivacyPolicy,
} from "@/lib/firestore";
import type { LocationPhoto } from "@/types/location";

export default function MapPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [locations, setLocations] = useState<LocationPhoto[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onThisDayDismissed, setOnThisDayDismissed] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [posterOpen, setPosterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>(ALL_MEMORIES);
  /* null enquanto o perfil não chegou: sem saber, não dá para decidir se pede
     o aceite, e mostrar o formulário antes seria pular o consentimento. */
  const [privacidadeAceita, setPrivacidadeAceita] = useState<boolean | null>(null);

  const visibleLocations = useMemo(
    () => applyDateFilter(locations, dateFilter),
    [locations, dateFilter],
  );

  // o convite do quadro de memórias se cala enquanto o guia de primeiros passos está na tela
  const onboardingVisible = useOnboardingVisible(user?.uid ?? "");

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

  async function handleToggleVisibility(locationId: string, isPublic: boolean) {
    await setLocationVisibility(user!.uid, locationId, isPublic);
    await loadLocations(user!.uid);
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
      // a rota decide se é a primeira vez; aqui só avisamos que houve sessão
      notifyWelcome();
      ensureUsername(nextUser.uid, nextUser.displayName, nextUser.email)
        .then(setUsername)
        .catch(console.error);
      getUserProfile(nextUser.uid)
        .then((perfil) => setPrivacidadeAceita(Boolean(perfil?.privacyAcceptedAt)))
        // sem resposta a gente pede o aceite: errar pedindo é melhor que errar guardando
        .catch(() => setPrivacidadeAceita(false));
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
          onToggleVisibility={handleToggleVisibility}
        />
      </div>

      <header className="map-header">
        <div className="map-header-inner">
          <div className="map-brand-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/logo.png" alt="guardei" style={{ height: 36, width: "auto" }} />
            <span className="brand" style={{ fontSize: 22 }}>guardei<span className="amp">,</span></span>
            <span className="map-page-title">mapa de memórias</span>
          </div>

          <MainNav
            username={username}
            memoriesCount={locations.length}
            onOpenPoster={() => setPosterOpen(true)}
          />
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

      {/* O aceite vem antes do formulário, não depois: a pessoa está prestes a
          mandar foto e texto pessoais, e consentimento colhido depois do envio
          não é consentimento. */}
      {selectedLocation && privacidadeAceita === false && (
        <div className="upload-panel">
          <PrivacyGate
            onAccept={async () => {
              await acceptPrivacyPolicy(user!.uid);
              setPrivacidadeAceita(true);
            }}
            onCancel={() => setSelectedLocation(null)}
          />
        </div>
      )}

      {selectedLocation && privacidadeAceita === true && (
        <UploadForm
          userId={user!.uid}
          onUploaded={handleUploaded}
          selectedLocation={selectedLocation}
          onCancel={() => setSelectedLocation(null)}
        />
      )}

      {onThisDayMemory && !onThisDayDismissed && (
        <OnThisDay
          memory={onThisDayMemory}
          yearsAgo={onThisDayYearsAgo}
          onDismiss={() => setOnThisDayDismissed(true)}
        />
      )}

      {/* Guia de primeiros passos: leva da primeira memória até o quadro de memórias. */}
      {user && (
        <OnboardingGuide
          userId={user.uid}
          locations={locations}
          onOpenPoster={() => setPosterOpen(true)}
          hidden={Boolean(selectedLocation) || posterOpen || showOnThisDay}
        />
      )}

      {/* um convite de cada vez: o guia e o "há um ano" têm prioridade */}
      {!posterOpen && !selectedLocation && !showOnThisDay && !onboardingVisible && (
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
