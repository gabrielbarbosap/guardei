"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import Map, {
  Layer,
  Marker,
  Popup,
  Source,
  type MapRef,
  type LayerProps,
  type MapMouseEvent,
  type ViewStateChangeEvent,
} from "react-map-gl/mapbox";
import type { FeatureCollection, Point } from "geojson";
import { getPublicLocationsByUsername, getUserByUsername } from "@/lib/firestore";
import type { LocationPhoto } from "@/types/location";

const PHOTO_PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30">
  <path d="M12 0C5.925 0 1 4.925 1 11c0 8.75 11 19 11 19S23 19.75 23 11C23 4.925 18.075 0 12 0z" fill="#0369a1"/>
  <path d="M12 1.5C6.7 1.5 2.5 5.7 2.5 11c0 7.9 9.5 17.2 9.5 17.2S21.5 18.9 21.5 11C21.5 5.7 17.3 1.5 12 1.5z" fill="#00e5ff"/>
  <rect x="6.5" y="4.5" width="11" height="12" rx="1.5" fill="#fafaf9"/>
  <rect x="7.5" y="5.5" width="9" height="8" rx="0.5" fill="#67e8f9"/>
</svg>`;

const PHOTO_PIN_CLUSTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
  <path d="M16 0C7.9 0 1 6.9 1 15c0 11.75 15 25 15 25S31 26.75 31 15C31 6.9 24.1 0 16 0z" fill="#0369a1"/>
  <path d="M16 2C8.95 2 3 7.95 3 15c0 10.5 13 23 13 23S29 25.5 29 15C29 7.95 23.05 2 16 2z" fill="#00e5ff"/>
</svg>`;

const clusterLayer: LayerProps = {
  id: "clusters",
  type: "symbol",
  slot: "top",
  source: "locations",
  filter: ["has", "point_count"],
  layout: {
    "icon-image": "photo-pin-cluster",
    "icon-size": ["step", ["get", "point_count"], 1.4, 10, 1.6, 50, 1.8] as unknown as number,
    "icon-allow-overlap": true,
    "icon-anchor": "bottom",
    "text-field": "{point_count_abbreviated}",
    "text-size": 12,
    "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
    "text-anchor": "center",
    "text-offset": [0, -2.1],
    "text-allow-overlap": true,
  },
  paint: { "text-color": "#fafaf9" },
};

const farPointHintLayer: LayerProps = {
  id: "points-hint",
  type: "symbol",
  slot: "top",
  source: "locations",
  filter: ["!", ["has", "point_count"]],
  maxzoom: 4,
  layout: {
    "icon-image": "photo-pin",
    "icon-size": 1.4,
    "icon-allow-overlap": true,
    "icon-anchor": "bottom",
  },
};

function tiltDeg(id: string) {
  return (id.charCodeAt(0) % 5) - 2;
}

type Status = "loading" | "not-found" | "ready";

export default function PublicProfile({ username }: { username: string }) {
  const mapRef = useRef<MapRef>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [locations, setLocations] = useState<LocationPhoto[]>([]);
  const [selected, setSelected] = useState<LocationPhoto | null>(null);
  const [zoom, setZoom] = useState(1.8);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const uid = await getUserByUsername(username);
        if (!uid) {
          if (!cancelled) setStatus("not-found");
          return;
        }
        const locs = await getPublicLocationsByUsername(username);
        if (!cancelled) {
          setLocations(locs);
          setStatus("ready");
        }
      } catch (err) {
        console.error("[perfil público] erro ao carregar:", err);
        if (!cancelled) setStatus("not-found");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [username]);

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (!map.hasImage("photo-pin")) {
      const img = new window.Image(24, 30);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PHOTO_PIN_SVG)}`;
      img.onload = () => map.addImage("photo-pin", img);
    }
    if (!map.hasImage("photo-pin-cluster")) {
      const img = new window.Image(32, 40);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PHOTO_PIN_CLUSTER_SVG)}`;
      img.onload = () => map.addImage("photo-pin-cluster", img);
    }
    map.setConfigProperty("basemap", "lightPreset", "dusk");
    map.setConfigProperty("basemap", "colorTheme", "faded");
    map.setConfigProperty("basemap", "fontFamily", "Spectral");
    map.setConfigProperty("basemap", "show3dObjects", true);
  }, []);

  const geojson: FeatureCollection<Point, LocationPhoto> = useMemo(
    () => ({
      type: "FeatureCollection",
      features: locations.map((loc) => ({
        type: "Feature",
        properties: loc,
        geometry: { type: "Point", coordinates: [loc.lng, loc.lat] },
      })),
    }),
    [locations],
  );

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <main style={{
        position: "fixed", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--paper-100)",
      }}>
        <span style={{ fontFamily: "var(--font-hand)", fontSize: "var(--text-xl)", color: "var(--ink-500)" }}>
          carregando mapa…
        </span>
      </main>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (status === "not-found") {
    return (
      <main style={{
        position: "fixed", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--paper-100)",
      }}>
        <div style={{
          background: "var(--paper-50)",
          border: "1px solid var(--paper-300)",
          borderRadius: "var(--radius-md)",
          padding: "40px 48px",
          textAlign: "center",
          maxWidth: 380,
          transform: "rotate(-1deg)",
          boxShadow: "0 8px 40px rgba(42,31,20,0.12)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🗺️</div>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: "var(--text-xl)",
            color: "var(--ink-900)", marginBottom: 10,
          }}>
            Perfil não encontrado
          </div>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: "var(--text-sm)",
            color: "var(--ink-600)", marginBottom: 24,
          }}>
            O usuário <strong style={{ fontFamily: "var(--font-mono)" }}>@{username}</strong> não existe ou ainda não criou memórias públicas.
          </p>
          <a
            href="/"
            style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: "var(--ink-600)",
              border: "1px dashed var(--paper-400)",
              borderRadius: "var(--radius-sm)", padding: "8px 16px",
              textDecoration: "none", display: "inline-block",
            }}
          >
            ← guardei.art
          </a>
        </div>
      </main>
    );
  }

  // ── Ready ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>

      {/* MAP */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{ latitude: 0, longitude: 0, zoom: 1.8 }}
          mapStyle="mapbox://styles/mapbox/standard"
          style={{ width: "100%", height: "100%" }}
          onMove={(e: ViewStateChangeEvent) => setZoom(e.viewState.zoom)}
          onClick={(e: MapMouseEvent) => { if (selected) { e.originalEvent.stopPropagation(); setSelected(null); } }}
          onLoad={onMapLoad}
        >
          <Source
            id="locations"
            type="geojson"
            data={geojson}
            cluster
            clusterMaxZoom={14}
            clusterRadius={50}
          >
            <Layer {...clusterLayer} />
            <Layer {...farPointHintLayer} />
          </Source>

          {zoom >= 4 &&
            locations.map((location) => (
              <Marker
                key={location.id}
                longitude={location.lng}
                latitude={location.lat}
                anchor="center"
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelected(location); }}
                  aria-label={`Ver memória: ${location.description}`}
                  style={{
                    width: 48, height: 48,
                    borderRadius: "50%",
                    border: "2.5px solid var(--paper-50)",
                    boxShadow: "0 2px 12px rgba(0,229,255,0.45), var(--shadow-sm)",
                    overflow: "hidden", cursor: "pointer", padding: 0,
                    background: "var(--paper-300)",
                  }}
                >
                  <Image
                    src={location.imageUrl}
                    alt={location.description}
                    width={48} height={48}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    unoptimized
                  />
                </button>
              </Marker>
            ))}

          {selected && (
            <Popup
              closeOnClick={false}
              closeButton={false}
              offset={12}
              longitude={selected.lng}
              latitude={selected.lat}
              onClose={() => setSelected(null)}
              className="polaroid-popup"
              maxWidth="none"
            >
              <div
                onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
                style={{
                  position: "relative",
                  width: 288,
                  background: "var(--paper-50)",
                  padding: "18px 18px 56px",
                  boxShadow: "var(--shadow-polaroid)",
                  border: "1px solid rgba(61,46,31,0.08)",
                  rotate: `${tiltDeg(selected.id)}deg`,
                }}
              >
                {/* tape strip */}
                <div style={{
                  position: "absolute", top: -10, left: "50%",
                  transform: "translateX(-50%) rotate(-2deg)",
                  width: 72, height: 18,
                  background: "rgba(244,196,48,0.6)",
                  mixBlendMode: "multiply",
                  borderLeft: "1px dashed rgba(138,111,68,0.3)",
                  borderRight: "1px dashed rgba(138,111,68,0.3)",
                }} />

                {/* close button */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelected(null); }}
                  aria-label="Fechar"
                  style={{
                    position: "absolute", right: 10, top: 10, zIndex: 10,
                    width: 30, height: 30, borderRadius: "50%",
                    background: "rgba(245,239,224,0.85)", border: "1px solid var(--paper-300)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", boxShadow: "var(--shadow-xs)", color: "var(--ink-600)",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M2 2l10 10M12 2L2 12" />
                  </svg>
                </button>

                {/* photo */}
                <div style={{ position: "relative", aspectRatio: "1", width: "100%", overflow: "hidden" }}>
                  <Image
                    src={selected.imageUrl}
                    alt={selected.description}
                    fill style={{ objectFit: "cover" }}
                    unoptimized
                  />
                </div>

                {/* caption */}
                <p style={{
                  marginTop: 10, textAlign: "center",
                  fontFamily: "var(--font-over-the-rainbow)",
                  fontSize: 17, lineHeight: 1.3, color: "var(--ink-700)",
                }}>
                  {selected.description}
                </p>
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/photos/logo.svg" alt="" style={{ height: 20, width: "auto", opacity: 0.5 }} />
                  <p style={{
                    margin: 0,
                    fontFamily: "var(--font-cinzel-decorative)",
                    fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase",
                    color: "var(--ink-400)",
                  }}>guardei</p>
                </div>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* HEADER — read-only, no auth actions */}
      <header style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(245, 239, 224, 0.82)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--paper-300)",
      }}>
        <div style={{
          padding: "12px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photos/logo.svg" alt="guardei" style={{ height: 36, width: "auto" }} />
            <span className="brand" style={{ fontSize: 22 }}>guardei<span className="amp">,</span></span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "var(--ink-500)", paddingLeft: 14,
              borderLeft: "1px solid var(--paper-400)",
            }}>
              @{username}
            </span>
          </div>

          <a
            href="/"
            style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: "var(--ink-600)",
              border: "1px dashed var(--paper-400)",
              borderRadius: "var(--radius-sm)", padding: "6px 14px",
              textDecoration: "none",
              transition: "all var(--duration) var(--ease-soft)",
            }}
          >
            criar conta
          </a>
        </div>
      </header>

      {/* empty state */}
      {locations.length === 0 && (
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
            padding: "36px 40px",
            maxWidth: 360, textAlign: "center",
            transform: "rotate(-1deg)",
            boxShadow: "0 8px 40px rgba(42,31,20,0.12)",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🌐</div>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: "var(--text-xl)",
              color: "var(--ink-900)", marginBottom: 8,
            }}>
              Nenhuma memória pública
            </div>
            <p style={{
              fontFamily: "var(--font-body)", fontSize: "var(--text-sm)",
              color: "var(--ink-600)",
            }}>
              <strong style={{ fontFamily: "var(--font-mono)" }}>@{username}</strong> ainda não compartilhou nenhuma memória.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
