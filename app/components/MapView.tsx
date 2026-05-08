"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { LocationPhoto } from "@/types/location";
import { sharePolaroid } from "@/lib/share";
import { exportPolaroid } from "@/lib/export";

type MapViewProps = {
  locations: LocationPhoto[];
  pickLocationEnabled?: boolean;
  selectedLocation: { lat: number; lng: number } | null;
  onPickLocation: (coords: { lat: number; lng: number }) => void;
  onDelete: (id: string) => void;
};

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

const highlightedCountriesLayer = (countryCodes: string[]): LayerProps => ({
  id: "highlighted-countries",
  type: "fill",
  source: "country-boundaries",
  "source-layer": "country_boundaries",
  filter: ["in", ["get", "iso_3166_1"], ["literal", countryCodes]],
  paint: { "fill-color": "#39ff14", "fill-opacity": 0.45 },
});

export default function MapView({
  locations,
  pickLocationEnabled = false,
  selectedLocation,
  onPickLocation,
  onDelete,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const popupClickedRef = useRef(false);
  const [selected, setSelected] = useState<LocationPhoto | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [zoom, setZoom] = useState(1.8);

  // Track whether mousedown started inside the popup (native, fires before Mapbox click)
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Element;
      popupClickedRef.current = !!target.closest(".mapboxgl-popup");
    }
    document.addEventListener("mousedown", onDocMouseDown, true);
    return () => document.removeEventListener("mousedown", onDocMouseDown, true);
  }, []);

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

  const highlightedCountries = useMemo(
    () =>
      Array.from(
        new Set(
          locations
            .map((l) => l.countryCode?.toUpperCase())
            .filter((c): c is string => Boolean(c)),
        ),
      ),
    [locations],
  );

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

  function onMapMove(event: ViewStateChangeEvent) {
    setZoom(event.viewState.zoom);
  }

  function onMapClick(event: MapMouseEvent) {
    // If mousedown happened inside the popup, ignore this map click entirely
    if (popupClickedRef.current) {
      popupClickedRef.current = false;
      return;
    }
    if (selected) { setSelected(null); setMenuOpen(false); return; }
    if (!pickLocationEnabled) return;
    onPickLocation({ lat: event.lngLat.lat, lng: event.lngLat.lng });
  }

  // rotation offset for polaroid tilt (deterministic per location)
  function tiltDeg(id: string) {
    return (id.charCodeAt(0) % 5) - 2;
  }

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ latitude: 0, longitude: 0, zoom: 1.8 }}
        mapStyle="mapbox://styles/mapbox/standard"
        style={{ width: "100%", height: "100%" }}
        onMove={onMapMove}
        onClick={onMapClick}
        onLoad={onMapLoad}
      >
        {highlightedCountries.length > 0 && (
          <Source id="country-boundaries" type="vector" url="mapbox://mapbox.country-boundaries-v1">
            <Layer {...highlightedCountriesLayer(highlightedCountries)} />
          </Source>
        )}

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

        {/* individual photo markers at higher zoom */}
        {zoom >= 4 &&
          locations.map((location) => (
            <Marker
              key={location.id}
              longitude={location.lng}
              latitude={location.lat}
              anchor="center"
            >
              <div style={{ position: "relative", display: "inline-block" }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelected(location); }}
                  aria-label={`Abrir foto: ${location.description}`}
                  style={{
                    width: 48, height: 48,
                    borderRadius: "50%",
                    border: location.isPublic
                      ? "2.5px solid #00b4c8"
                      : "2.5px solid var(--paper-50)",
                    boxShadow: location.isPublic
                      ? "0 2px 12px rgba(0,180,200,0.55), var(--shadow-sm)"
                      : "0 2px 12px rgba(0,229,255,0.45), var(--shadow-sm)",
                    overflow: "hidden",
                    cursor: "pointer",
                    padding: 0,
                    background: "var(--paper-300)",
                  }}
                >
                  <Image
                    src={location.imageUrl}
                    alt={location.description}
                    width={48}
                    height={48}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    unoptimized
                  />
                </button>
                {location.isPublic && (
                  <span
                    aria-label="memória pública"
                    style={{
                      position: "absolute", bottom: -2, right: -2,
                      width: 18, height: 18, borderRadius: "50%",
                      background: "#00b4c8",
                      border: "1.5px solid var(--paper-50)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, lineHeight: 1,
                    }}
                  >🌐</span>
                )}
              </div>
            </Marker>
          ))}

        {/* new-point indicator */}
        {selectedLocation && (
          <Marker longitude={selectedLocation.lng} latitude={selectedLocation.lat} anchor="bottom">
            <div className="map-pin-new">novo ponto ↑</div>
          </Marker>
        )}

        {/* polaroid popup */}
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

              {/* action buttons */}
              <div style={{ position: "absolute", right: 10, top: 10, zIndex: 10, display: "flex", gap: 6 }}>
                {/* three-dots menu */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
                    aria-label="Mais opções"
                    style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: "rgba(245,239,224,0.85)", border: "1px solid var(--paper-300)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", boxShadow: "var(--shadow-xs)",
                      color: "var(--ink-600)",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                    </svg>
                  </button>
                  {menuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute", top: 36, right: 0,
                        background: "var(--paper-50)",
                        border: "1px solid var(--paper-300)",
                        borderRadius: "var(--radius)",
                        boxShadow: "var(--shadow-md)",
                        overflow: "hidden", minWidth: 160,
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); sharePolaroid(selected).catch(() => {}); }}
                        style={{
                          width: "100%", padding: "10px 16px",
                          background: "none", border: "none", borderBottom: "1px solid var(--paper-200)",
                          display: "flex", alignItems: "center", gap: 10,
                          cursor: "pointer", textAlign: "left",
                          fontFamily: "var(--font-mono)", fontSize: 11,
                          letterSpacing: "0.08em", color: "var(--ink-700)",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#25d366", flexShrink: 0 }}>
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        compartilhar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); exportPolaroid(selected).catch(() => {}); }}
                        style={{
                          width: "100%", padding: "10px 16px",
                          background: "none", border: "none", borderBottom: "1px solid var(--paper-200)",
                          display: "flex", alignItems: "center", gap: 10,
                          cursor: "pointer", textAlign: "left",
                          fontFamily: "var(--font-mono)", fontSize: 11,
                          letterSpacing: "0.08em", color: "var(--ink-700)",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        salvar imagem
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setSelected(null); onDelete(selected.id); }}
                        style={{
                          width: "100%", padding: "10px 16px",
                          background: "none", border: "none",
                          display: "flex", alignItems: "center", gap: 10,
                          cursor: "pointer", textAlign: "left",
                          fontFamily: "var(--font-mono)", fontSize: 11,
                          letterSpacing: "0.08em", color: "var(--accent-tomato)",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                        apagar
                      </button>
                    </div>
                  )}
                </div>
                {/* close */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelected(null); setMenuOpen(false); }}
                  aria-label="Fechar"
                  style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "rgba(245,239,224,0.85)", border: "1px solid var(--paper-300)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", boxShadow: "var(--shadow-xs)",
                    color: "var(--ink-600)",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M2 2l10 10M12 2L2 12" />
                  </svg>
                </button>
              </div>

              {/* photo */}
              <div style={{ position: "relative", aspectRatio: "1", width: "100%", overflow: "hidden" }}>
                <Image
                  src={selected.imageUrl}
                  alt={selected.description}
                  fill
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              </div>

              {/* caption */}
              <p style={{
                marginTop: 10, textAlign: "center",
                fontFamily: "var(--font-over-the-rainbow)",
                fontSize: 17, lineHeight: 1.3,
                color: "var(--ink-700)",
              }}>
                {selected.description}
              </p>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/photos/logo.svg" alt="" style={{ height: 20, width: "auto", opacity: 0.5 }} />
                <p style={{
                  margin: 0,
                  fontFamily: "var(--font-cinzel-decorative)",
                  fontSize: 9, letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "var(--ink-400)",
                }}>guardei</p>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
