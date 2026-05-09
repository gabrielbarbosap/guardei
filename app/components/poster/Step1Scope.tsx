"use client";

import { useState } from "react";
import type { ContinentKey, PosterScope } from "@/types/poster";
import { CONTINENT_LABELS, getCountryBbox } from "@/lib/posterMap";

type Props = {
  onNext: (scope: PosterScope) => void;
};

const CONTINENTS = Object.entries(CONTINENT_LABELS) as [ContinentKey, string][];

const CONTINENT_EMOJI: Record<ContinentKey, string> = {
  south_america: "🌎",
  north_america: "🌎",
  europe: "🌍",
  africa: "🌍",
  asia: "🌏",
  oceania: "🌏",
};

export default function Step1Scope({ onNext }: Props) {
  const [mode, setMode] = useState<"world" | "continent" | "country" | null>(null);
  const [countryQuery, setCountryQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  async function handleCountrySearch() {
    if (!countryQuery.trim()) return;
    setSearching(true);
    setError("");
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
    const result = await getCountryBbox(countryQuery.trim(), token);
    setSearching(false);
    if (!result) {
      setError("País não encontrado. Tente outro nome.");
      return;
    }
    onNext({ type: "country", countryCode: result.countryCode, countryName: countryQuery.trim(), bbox: result.bbox });
  }

  const btn = (active: boolean) => ({
    cursor: "pointer",
    border: `1.5px solid ${active ? "var(--accent-gold, #b8860b)" : "var(--paper-300)"}`,
    borderRadius: "var(--radius-sm)",
    background: active ? "rgba(184,134,11,0.08)" : "var(--paper-50)",
    padding: "14px 18px",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: active ? "var(--accent-gold, #b8860b)" : "var(--ink-700)",
    transition: "all 0.15s ease",
    textAlign: "left" as const,
    display: "flex",
    alignItems: "center",
    gap: 10,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-600)", margin: 0 }}>
        Escolha a área do mapa que aparecerá no seu poster.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button style={btn(mode === "world")} onClick={() => { setMode("world"); onNext({ type: "world" }); }}>
          <span style={{ fontSize: 18 }}>🌐</span>
          <span>Mundo inteiro</span>
        </button>
        <button style={btn(mode === "continent")} onClick={() => setMode("continent")}>
          <span style={{ fontSize: 18 }}>🗺️</span>
          <span>Um continente</span>
        </button>
        <button style={btn(mode === "country")} onClick={() => setMode("country")}>
          <span style={{ fontSize: 18 }}>📍</span>
          <span>Um país específico</span>
        </button>
      </div>

      {mode === "continent" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
          {CONTINENTS.map(([key, label]) => (
            <button
              key={key}
              style={btn(false)}
              onClick={() => onNext({ type: "continent", continent: key, label })}
            >
              <span style={{ fontSize: 16 }}>{CONTINENT_EMOJI[key]}</span>
              <span style={{ fontSize: 11 }}>{label}</span>
            </button>
          ))}
        </div>
      )}

      {mode === "country" && (
        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="text"
            placeholder="Digite o nome do país..."
            value={countryQuery}
            onChange={(e) => setCountryQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCountrySearch()}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              padding: "10px 14px",
              border: "1px solid var(--paper-300)",
              borderRadius: "var(--radius-sm)",
              background: "var(--paper-50)",
              color: "var(--ink-900)",
              outline: "none",
            }}
          />
          {error && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--danger)" }}>{error}</span>
          )}
          <button
            onClick={handleCountrySearch}
            disabled={searching || !countryQuery.trim()}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "10px 18px",
              background: "var(--ink-900)",
              color: "var(--paper-50)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: searching ? "wait" : "pointer",
              opacity: !countryQuery.trim() ? 0.5 : 1,
            }}
          >
            {searching ? "buscando..." : "confirmar país →"}
          </button>
        </div>
      )}
    </div>
  );
}
