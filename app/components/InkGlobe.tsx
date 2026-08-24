"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { geoOrthographic, geoPath, geoGraticule, geoDistance, geoInterpolate } from "d3-geo";
import type { GeoProjection } from "d3-geo";
import { feature, mesh } from "topojson-client";

export interface GlobePin {
  id: string;
  lat: number;
  lon: number;
  title: string;
  place: string;
  mood: "tomato" | "ink" | "moss" | "rose" | "highlight";
  photo: string;
  photoSrc?: string;
}

export const PINS: GlobePin[] = [
  { id: "paris",    lat: 48.86,  lon: 2.35,   title: "Primeira viagem juntos",  place: "Paris · 2019",      mood: "tomato",    photo: "paris",  photoSrc: "/photos/blonde-woman-hat-white-dress-smiles-looks-boyfriend-holds-pink-camera.jpg" },
  { id: "tokyo",    lat: 35.68,  lon: 139.69, title: "Sozinha, finalmente",     place: "Tóquio · 2023",     mood: "rose",      photo: "tokyo",  photoSrc: "/photos/young-sportswoman-drinking-nature.jpg" },
  { id: "saopaulo", lat: -23.55, lon: -46.63, title: "Formatura",               place: "São Paulo · 2022",  mood: "moss",      photo: "sp",     photoSrc: "/photos/girls-hugging-graduation.jpg" },
  { id: "lisbon",   lat: 38.72,  lon: -9.14,  title: "Aquela manhã na Alfama", place: "Lisboa · 2024",     mood: "highlight", photo: "lisbon", photoSrc: "/photos/two-little-brothers-standing-with-skateboard-near-guardrail-against-background-seacoast-sunset.jpg" },
  { id: "nyc",      lat: 40.71,  lon: -74.00, title: "Neve pela primeira vez", place: "Nova York · 2018",  mood: "ink",       photo: "nyc" },
  { id: "marrak",   lat: 31.63,  lon: -7.98,  title: "Cheiro de hortelã",      place: "Marrakech · 2021",  mood: "tomato",    photo: "mar" },
  { id: "rio",      lat: -22.90, lon: -43.17, title: "Virada do ano",          place: "Rio · 2020",        mood: "rose",      photo: "rio",    photoSrc: "/photos/evening-summer-sun-makes-halo-around-beautiful-wedding-couple.jpg" },
  { id: "bali",     lat: -8.34,  lon: 115.09, title: "Ler na varanda",         place: "Ubud · 2023",       mood: "moss",      photo: "bali" },
  { id: "cape",     lat: -33.92, lon: 18.42,  title: "Vento do cabo",          place: "Cape Town · 2022",  mood: "ink",       photo: "cape" },
  { id: "iceland",  lat: 64.13,  lon: -21.94, title: "Aurora às 3h",           place: "Reykjavík · 2024",  mood: "highlight", photo: "ice" },
  { id: "kyoto",    lat: 35.01,  lon: 135.76, title: "Templo com a avó",       place: "Kyoto · 2019",      mood: "rose",      photo: "ky" },
];

const MOOD_VAR: Record<string, string> = {
  tomato: "--accent-tomato",
  ink: "--accent-ink",
  moss: "--accent-moss",
  rose: "--accent-rose",
  highlight: "--accent-highlight",
};

const PHOTO_GRAD: Record<string, [string, string]> = {
  paris:  ["#8a6f44","#d9b585"],
  tokyo:  ["#6b4a52","#c76c8a"],
  sp:     ["#4a5a3a","#9cb079"],
  lisbon: ["#b58a3e","#f4c478"],
  nyc:    ["#2a3a55","#6a8098"],
  mar:    ["#8a4a2a","#d9843e"],
  rio:    ["#4a5a6a","#a8c0d0"],
  bali:   ["#3a5a3a","#8cae6c"],
  cape:   ["#3a4a5a","#7a98b5"],
  ice:    ["#4a3a6a","#a084c8"],
  ky:     ["#6a3a3a","#c07878"],
};

/** Palette resolved from the CSS custom properties so canvas matches the design tokens. */
interface Palette {
  paper50: string; paper100: string; paper300: string;
  ink800: string; ink600: string;
  sepia: string; sepiaLight: string;
  moods: Record<string, string>;
}

function readPalette(el: HTMLElement): Palette {
  const cs = getComputedStyle(el);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    paper50:    v("--paper-50", "#faf6ec"),
    paper100:   v("--paper-100", "#f5efe0"),
    paper300:   v("--paper-300", "#e0d3b3"),
    ink800:     v("--ink-800", "#3d2e1f"),
    ink600:     v("--ink-600", "#7a6147"),
    sepia:      v("--sepia", "#b89968"),
    sepiaLight: v("--sepia-light", "#d9c9a8"),
    moods: Object.fromEntries(
      Object.entries(MOOD_VAR).map(([k, name]) => [k, v(name, "#d94e3b")]),
    ),
  };
}

function hexToRgba(color: string, alpha: number): string {
  const hex = color.replace("#", "");
  if (hex.length !== 3 && hex.length !== 6) return color;
  const full = hex.length === 3 ? hex.split("").map(c => c + c).join("") : hex;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** One-off paper grain tile, generated once and reused every frame. */
function makeGrain(sizePx: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = sizePx;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(sizePx, sizePx);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 200 + Math.random() * 55;
    img.data[i] = n * 0.42;
    img.data[i + 1] = n * 0.32;
    img.data[i + 2] = n * 0.2;
    img.data[i + 3] = Math.random() * 46;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Shortest signed delta between two angles, in degrees. */
function angleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/** Frame-rate independent exponential approach: fraction of the gap to close over dt. */
function approach(dt: number, halfLifeMs: number): number {
  return 1 - Math.pow(2, -dt / halfLifeMs);
}

type GeoFeatureCollection = { type: "FeatureCollection"; features: unknown[] };
type WorldShapes = { land: GeoFeatureCollection; borders: unknown };

let worldPromise: Promise<WorldShapes> | null = null;

function loadWorld(): Promise<WorldShapes> {
  if (!worldPromise) {
    worldPromise = fetch("/geo/countries-110m.json")
      .then(r => r.json())
      .then((topo) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const objects = (topo as any).objects;
        return {
          // merged landmass: one clean coastline, half the cost of stroking every country
          land: feature(topo as any, objects.land) as unknown as GeoFeatureCollection,
          borders: mesh(topo as any, objects.countries, (a: any, b: any) => a !== b),
        };
        /* eslint-enable @typescript-eslint/no-explicit-any */
      })
      .catch((err) => {
        worldPromise = null;
        throw err;
      });
  }
  return worldPromise;
}

function Polaroid({
  pin,
  innerRef,
}: {
  pin: GlobePin;
  innerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [g1, g2] = PHOTO_GRAD[pin.photo] ?? ["#8a6f44", "#d9b585"];
  return (
    <div ref={innerRef} className="polaroid-tooltip globe-polaroid">
      <div className="pt-tape" />
      <div className="pt-photo" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, position: "relative", overflow: "hidden" }}>
        {pin.photoSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pin.photoSrc}
            alt={pin.title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        <div className="pt-photo-grain" style={{ position: "relative", zIndex: 1 }} />
      </div>
      <div className="pt-caption">{pin.title}</div>
      <div className="pt-place">{pin.place}</div>
    </div>
  );
}

export interface InkGlobeProps {
  size?: number;
  autoRotate?: boolean;
  speed?: number;
  cycleInterval?: number;
  paused?: boolean;
  onFocus?: (pin: GlobePin) => void;
  onlyWithPhoto?: boolean;
}

export default function InkGlobe({
  size: maxSize = 560, autoRotate = true, speed = 0.12,
  cycleInterval = 4200, paused = false, onFocus, onlyWithPhoto = false,
}: InkGlobeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  /* O globo acompanha a largura disponível: `size` é o teto, não um valor fixo.
     Sem isso o canvas mantinha 560px e furava a viewport no celular. */
  const [measured, setMeasured] = useState<number | null>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setMeasured(Math.round(Math.min(maxSize, w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxSize]);

  const size = measured ?? maxSize;
  const R = size / 2 - 18;
  const cx = size / 2, cy = size / 2;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const polaroidRef = useRef<HTMLDivElement>(null);

  const activePins = onlyWithPhoto ? PINS.filter(p => p.photoSrc) : PINS;
  const pinsRef = useRef(activePins);

  const [focusId, setFocusId] = useState(activePins[0].id);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  /* Rotation lives in refs so the animation loop never re-renders React. */
  const rotRef = useRef({ lambda: -activePins[0].lon, phi: -activePins[0].lat * 0.55 });
  const targetRef = useRef({ lambda: -activePins[0].lon, phi: -activePins[0].lat * 0.55 });
  const modeRef = useRef<"settling" | "drifting" | "user">("settling");
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0, vx: 0, vy: 0, moved: false });
  const idleUntilRef = useRef(0);
  const focusIdRef = useRef(focusId);
  const hoverIdRef = useRef<string | null>(null);
  const visibleRef = useRef(true);

  const onFocusRef = useRef(onFocus);
  useLayoutEffect(() => { pinsRef.current = activePins; });
  useLayoutEffect(() => { onFocusRef.current = onFocus; });
  useLayoutEffect(() => { focusIdRef.current = focusId; });
  useLayoutEffect(() => { hoverIdRef.current = hoverId; });

  const activePin =
    activePins.find(p => p.id === (hoverId ?? focusId)) ?? activePins[0];

  /* ---- auto-cycle through memories ---- */
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      if (Date.now() < idleUntilRef.current || hoverIdRef.current) return;
      setFocusId(cur => {
        const list = pinsRef.current;
        const i = list.findIndex(p => p.id === cur);
        return list[(i + 1) % list.length].id;
      });
    }, cycleInterval);
    return () => clearInterval(id);
  }, [cycleInterval, paused]);

  /* ---- aim the globe at the focused memory ---- */
  useEffect(() => {
    const pin = pinsRef.current.find(p => p.id === focusId);
    if (!pin) return;
    onFocusRef.current?.(pin);
    targetRef.current = {
      lambda: -pin.lon,
      // partial latitude tilt: turns toward the pin without flipping the globe over
      phi: Math.max(-38, Math.min(38, -pin.lat * 0.55)),
    };
    if (modeRef.current !== "user") modeRef.current = "settling";
  }, [focusId]);

  /* ---- pause work while off-screen or on a hidden tab ---- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0 },
    );
    io.observe(el);
    const onVis = () => { visibleRef.current = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  /* ---- the render loop ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    /* O CSS manda no tamanho exibido (o contêiner é quadrado por aspect-ratio) e o
       bitmap acompanha `size`. Assim o globo nunca fura a viewport mesmo antes de
       o ResizeObserver medir — a medição só ajusta a resolução do desenho. */
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.scale(dpr, dpr);

    const palette = readPalette(wrap);
    const grain = makeGrain(220);
    const grainPattern = ctx.createPattern(grain, "repeat");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const projection: GeoProjection = geoOrthographic()
      .translate([cx, cy])
      .scale(R)
      .clipAngle(90)
      .precision(1.2);

    const path = geoPath(projection, ctx);
    const graticule = geoGraticule().step([20, 20])();

    let world: WorldShapes | null = null;
    let landFade = 0;
    loadWorld()
      .then((w) => { world = w; setReady(true); })
      .catch(() => setReady(true));

    /* Great-circle routes between consecutive memories — the travel-journal thread. */
    const routes = pinsRef.current.slice(0, -1).map((from, i) => {
      const to = pinsRef.current[i + 1];
      const interp = geoInterpolate([from.lon, from.lat], [to.lon, to.lat]);
      return {
        type: "LineString" as const,
        coordinates: Array.from({ length: 40 }, (_, k) => interp(k / 39)),
      };
    });

    // gradient for the ocean sphere, built once
    const ocean = ctx.createRadialGradient(
      cx - R * 0.24, cy - R * 0.3, R * 0.12,
      cx, cy, R * 1.02,
    );
    ocean.addColorStop(0, palette.paper50);
    ocean.addColorStop(0.6, palette.paper100);
    ocean.addColorStop(1, palette.paper300);

    // soft darkening toward the limb, so the sphere reads as a sphere
    const limb = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R);
    limb.addColorStop(0, "rgba(0,0,0,0)");
    limb.addColorStop(1, hexToRgba(palette.ink800, 0.24));

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;

      if (!visibleRef.current) { raf = requestAnimationFrame(draw); return; }

      /* ---------- motion ---------- */
      const rot = rotRef.current;
      const drag = dragRef.current;

      if (drag.active) {
        // rotation is applied directly in the pointer handler
      } else if (Math.abs(drag.vx) > 0.01 || Math.abs(drag.vy) > 0.01) {
        // momentum after release, with friction
        rot.lambda += drag.vx * dt;
        rot.phi = Math.max(-60, Math.min(60, rot.phi + drag.vy * dt));
        const friction = Math.pow(0.9975, dt);
        drag.vx *= friction;
        drag.vy *= friction;
      } else if (!paused && !reduceMotion) {
        if (modeRef.current === "settling") {
          const k = approach(dt, 260);
          const dl = angleDelta(rot.lambda, targetRef.current.lambda);
          const dp = targetRef.current.phi - rot.phi;
          rot.lambda += dl * k;
          rot.phi += dp * k;
          if (Math.abs(dl) < 0.35 && Math.abs(dp) < 0.35) modeRef.current = "drifting";
        } else if (modeRef.current === "drifting" && autoRotate) {
          const slow = hoverIdRef.current ? 0.18 : 1;
          rot.lambda += speed * 50 * (dt / 1000) * slow;
          // ease the tilt back toward the equator as it drifts
          rot.phi += (targetRef.current.phi - rot.phi) * approach(dt, 900);
        }
      }

      rot.lambda = ((rot.lambda % 360) + 540) % 360 - 180;
      // gamma keeps a hint of the planet's axial tilt
      projection.rotate([rot.lambda, rot.phi, -8]);

      /* ---------- paint ---------- */
      ctx.clearRect(0, 0, size, size);

      // ocean
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = ocean;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // graticule
      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = hexToRgba(palette.sepia, 0.34);
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // land
      if (world) {
        landFade = Math.min(1, landFade + dt / 700);
        ctx.globalAlpha = landFade;

        ctx.beginPath();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        path(world.land as any);
        ctx.fillStyle = hexToRgba(palette.sepiaLight, 0.62);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(palette.ink800, 0.68);
        ctx.lineWidth = 0.9;
        ctx.lineJoin = "round";
        ctx.stroke();

        // country borders, a whisper under the coastlines
        ctx.beginPath();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        path(world.borders as any);
        ctx.strokeStyle = hexToRgba(palette.ink600, 0.26);
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.globalAlpha = 1;
      }

      // travel routes, drawn as flowing ink dashes
      const dashPhase = (now / 55) % 14;
      ctx.setLineDash([5, 9]);
      ctx.lineDashOffset = -dashPhase;
      ctx.strokeStyle = hexToRgba(palette.ink600, 0.42);
      ctx.lineWidth = 1;
      for (const route of routes) {
        ctx.beginPath();
        path(route);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;

      // paper grain over the sphere
      if (grainPattern) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = grainPattern;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // limb shading + rim
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = limb;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(palette.ink800, 0.55);
      ctx.lineWidth = 1.2;
      ctx.stroke();

      /* ---------- pins ---------- */
      const center: [number, number] = [-rot.lambda, -rot.phi];
      const pulse = (Math.sin(now / 1100) + 1) / 2;
      let activeScreen: { x: number; y: number } | null = null;

      for (const pin of pinsRef.current) {
        const dist = geoDistance([pin.lon, pin.lat], center);
        if (dist > Math.PI / 2) continue;
        const xy = projection([pin.lon, pin.lat]);
        if (!xy) continue;

        // fade pins out as they approach the limb
        const edge = Math.min(1, (Math.PI / 2 - dist) / 0.28);
        const isActive = pin.id === (hoverIdRef.current ?? focusIdRef.current);
        const color = palette.moods[pin.mood] ?? palette.moods.tomato;

        const halo = (isActive ? 11 : 7.5) + pulse * (isActive ? 7 : 4);
        ctx.beginPath();
        ctx.arc(xy[0], xy[1], halo, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, (isActive ? 0.26 : 0.15) * (1 - pulse * 0.75) * edge);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(xy[0], xy[1], isActive ? 5.2 : 3.6, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, edge);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(palette.paper50, edge);
        ctx.lineWidth = 1.2;
        ctx.stroke();

        if (isActive) activeScreen = { x: xy[0], y: xy[1] };
      }

      /* ---------- polaroid follows its pin, without re-rendering React ---------- */
      const card = polaroidRef.current;
      if (card) {
        if (activeScreen) {
          const dx = activeScreen.x - cx, dy = activeScreen.y - cy;
          const len = Math.hypot(dx, dy) || 1;
          const outR = size / 2 + 40;
          const ox = cx + (dx / len) * outR;
          const oy = cy + (dy / len) * outR;
          const leftSide = ox < cx;
          card.style.left = `${ox}px`;
          card.style.top = `${oy}px`;
          card.style.transform = `translate(${leftSide ? "-100%" : "0"}, -50%) rotate(${leftSide ? -4 : 4}deg)`;
          card.style.opacity = "1";
        } else {
          card.style.opacity = "0";
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, R, cx, cy, speed, autoRotate, paused]);

  /* ---- pointer: hover a memory, or spin the globe by hand ---- */
  const pickPin = (clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * size;
    const py = ((clientY - rect.top) / rect.height) * size;
    const rot = rotRef.current;
    const projection = geoOrthographic()
      .translate([cx, cy]).scale(R).clipAngle(90)
      .rotate([rot.lambda, rot.phi, -8]);
    const center: [number, number] = [-rot.lambda, -rot.phi];

    let best: { id: string; d: number } | null = null;
    for (const pin of pinsRef.current) {
      if (geoDistance([pin.lon, pin.lat], center) > Math.PI / 2) continue;
      const xy = projection([pin.lon, pin.lat]);
      if (!xy) continue;
      const d = Math.hypot(xy[0] - px, xy[1] - py);
      if (d < 16 && (!best || d < best.d)) best = { id: pin.id, d };
    }
    return best?.id ?? null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    drag.active = true;
    drag.moved = false;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.vx = 0;
    drag.vy = 0;
    modeRef.current = "user";
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (drag.active) {
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) drag.moved = true;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;

      // degrees per pixel scales with the globe radius, so it tracks the cursor
      const perPx = 90 / R;
      const rot = rotRef.current;
      rot.lambda += dx * perPx;
      rot.phi = Math.max(-60, Math.min(60, rot.phi - dy * perPx));
      drag.vx = dx * perPx * 0.06;
      drag.vy = -dy * perPx * 0.06;
      idleUntilRef.current = Date.now() + 2600;
      return;
    }
    const id = pickPin(e.clientX, e.clientY);
    setHoverId(prev => (prev === id ? prev : id));
  };

  const endDrag = () => {
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    idleUntilRef.current = Date.now() + 2600;
    // hand back to the cycle once the momentum has bled off
    window.setTimeout(() => {
      if (!dragRef.current.active) modeRef.current = "settling";
    }, 2600);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current.moved) return;
    const id = pickPin(e.clientX, e.clientY);
    if (!id) return;
    modeRef.current = "settling";
    idleUntilRef.current = Date.now() + 2600;
    setFocusId(id);
  };

  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    const r1 = R + 6, r2 = R + (i % 6 === 0 ? 14 : 10);
    return {
      x1: cx + Math.cos(a) * r1, y1: cy + Math.sin(a) * r1,
      x2: cx + Math.cos(a) * r2, y2: cy + Math.sin(a) * r2,
      major: i % 6 === 0,
    };
  });

  return (
    <div
      ref={wrapRef}
      style={{ width: "100%", maxWidth: maxSize, aspectRatio: "1", position: "relative" }}
    >
      {/* static compass ring — never repaints */}
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", overflow: "visible", pointerEvents: "none" }}
        aria-hidden
      >
        <g opacity="0.6">
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke="var(--ink-600)" strokeWidth={t.major ? 1.2 : 0.6} />
          ))}
        </g>
        <g fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-600)" textAnchor="middle">
          <text x={cx} y={12}>N</text>
          <text x={cx} y={size - 4}>S</text>
          <text x={8} y={cy + 4} textAnchor="start">W</text>
          <text x={size - 8} y={cy + 4} textAnchor="end">E</text>
        </g>
      </svg>

      <canvas
        ref={canvasRef}
        className="globe-canvas"
        /* pan-y, não none: no celular o dedo deslizando para cima precisa rolar a
           página. O giro horizontal continua funcionando. */
        style={{ display: "block", position: "relative", maxWidth: "100%", touchAction: "pan-y", cursor: hoverId ? "pointer" : "grab", opacity: ready ? 1 : 0 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => { endDrag(); setHoverId(null); }}
        onClick={handleClick}
        role="img"
        aria-label="Globo com memórias guardadas pelo mundo"
      />

      {/* em tela estreita o CSS esconde este card: ele orbita para fora do globo e
          sairia da viewport. O log abaixo do globo já mostra a mesma memória. */}
      <Polaroid pin={activePin} innerRef={polaroidRef} />

      <div className="globe-caption">
        <span>lat {activePin.lat.toFixed(2)}°</span>
        <span>lon {activePin.lon.toFixed(2)}°</span>
      </div>
    </div>
  );
}
