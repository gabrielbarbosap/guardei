"use client";

import { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from "react";

// ---- world silhouettes (low-res ink-sketch polygons) ----------------
const CONTINENTS: [number, number][][] = [
  [[-168,66],[-156,71],[-140,70],[-128,70],[-108,72],[-92,74],[-78,73],[-66,60],[-54,49],[-60,42],[-74,38],[-80,25],[-97,25],[-106,22],[-116,32],[-124,40],[-130,54],[-140,59],[-156,60],[-168,66]],
  [[-92,18],[-82,10],[-76,8],[-78,2],[-82,8],[-90,15],[-92,18]],
  [[-78,12],[-62,10],[-52,5],[-48,-2],[-38,-8],[-36,-22],[-44,-32],[-58,-38],[-66,-44],[-72,-52],[-70,-55],[-66,-50],[-62,-40],[-58,-32],[-66,-24],[-72,-16],[-78,-6],[-80,2],[-78,12]],
  [[-46,82],[-18,82],[-22,70],[-38,60],[-52,66],[-54,74],[-46,82]],
  [[-10,36],[2,44],[-4,54],[4,60],[10,58],[18,56],[28,58],[32,54],[40,50],[42,44],[32,38],[22,36],[10,38],[-2,36],[-10,36]],
  [[-16,16],[-16,28],[-6,36],[8,34],[20,32],[32,32],[36,22],[44,14],[50,10],[46,0],[40,-12],[34,-22],[20,-34],[14,-34],[8,-24],[8,-14],[2,-4],[-4,4],[-14,8],[-16,16]],
  [[34,32],[44,32],[54,24],[58,22],[50,12],[44,16],[36,22],[34,32]],
  [[32,54],[40,60],[58,66],[72,70],[88,72],[104,72],[126,72],[146,68],[158,62],[164,60],[170,68],[178,68],[178,60],[158,52],[142,48],[130,42],[122,38],[128,32],[120,22],[108,18],[100,12],[98,4],[108,-2],[118,-6],[126,-10],[134,-4],[130,4],[122,10],[118,18],[122,26],[112,24],[98,22],[88,22],[76,26],[72,36],[60,38],[54,42],[46,46],[40,50],[32,54]],
  [[68,24],[76,24],[82,16],[86,8],[80,6],[74,18],[68,24]],
  [[96,2],[106,-4],[118,-8],[130,-8],[140,-6],[132,2],[122,4],[110,4],[100,4],[96,2]],
  [[114,-22],[130,-14],[142,-12],[152,-24],[150,-36],[138,-38],[126,-34],[118,-34],[114,-22]],
  [[166,-40],[174,-36],[176,-44],[172,-46],[166,-40]],
  [[-180,-72],[-120,-78],[-60,-74],[0,-72],[60,-76],[120,-78],[180,-72],[180,-88],[-180,-88],[-180,-72]],
];

export interface GlobePin {
  id: string;
  lat: number;
  lon: number;
  title: string;
  place: string;
  mood: "tomato" | "ink" | "moss" | "rose" | "highlight";
  photo: string;
}

export const PINS: GlobePin[] = [
  { id: "paris",    lat: 48.86,  lon: 2.35,   title: "Primeira viagem juntos",  place: "Paris · 2019",      mood: "tomato",    photo: "paris" },
  { id: "tokyo",    lat: 35.68,  lon: 139.69, title: "Sozinha, finalmente",     place: "Tóquio · 2023",     mood: "rose",      photo: "tokyo" },
  { id: "saopaulo", lat: -23.55, lon: -46.63, title: "Formatura",               place: "São Paulo · 2022",  mood: "moss",      photo: "sp" },
  { id: "lisbon",   lat: 38.72,  lon: -9.14,  title: "Aquela manhã na Alfama", place: "Lisboa · 2024",     mood: "highlight", photo: "lisbon" },
  { id: "nyc",      lat: 40.71,  lon: -74.00, title: "Neve pela primeira vez", place: "Nova York · 2018",  mood: "ink",       photo: "nyc" },
  { id: "marrak",   lat: 31.63,  lon: -7.98,  title: "Cheiro de hortelã",      place: "Marrakech · 2021",  mood: "tomato",    photo: "mar" },
  { id: "rio",      lat: -22.90, lon: -43.17, title: "Virada do ano",          place: "Rio · 2020",        mood: "rose",      photo: "rio" },
  { id: "bali",     lat: -8.34,  lon: 115.09, title: "Ler na varanda",         place: "Ubud · 2023",       mood: "moss",      photo: "bali" },
  { id: "cape",     lat: -33.92, lon: 18.42,  title: "Vento do cabo",          place: "Cape Town · 2022",  mood: "ink",       photo: "cape" },
  { id: "iceland",  lat: 64.13,  lon: -21.94, title: "Aurora às 3h",           place: "Reykjavík · 2024",  mood: "highlight", photo: "ice" },
  { id: "kyoto",    lat: 35.01,  lon: 135.76, title: "Templo com a avó",       place: "Kyoto · 2019",      mood: "rose",      photo: "ky" },
];

const MOOD: Record<string, string> = {
  tomato: "var(--accent-tomato)",
  ink:    "var(--accent-ink)",
  moss:   "var(--accent-moss)",
  rose:   "var(--accent-rose)",
  highlight: "var(--accent-highlight)",
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

interface Projected { x: number; y: number; z: number; visible: boolean; }

function lonLatToXY(lon: number, lat: number, lonOffset: number, R: number, cx: number, cy: number): Projected {
  const l = ((lon + lonOffset + 540) % 360) - 180;
  const phi = (lat * Math.PI) / 180;
  const lam = (l * Math.PI) / 180;
  return {
    x: cx + R * Math.cos(phi) * Math.sin(lam),
    y: cy - R * Math.sin(phi),
    z: Math.cos(phi) * Math.cos(lam),
    visible: Math.cos(phi) * Math.cos(lam) > 0.02,
  };
}

function continentPath(poly: [number, number][], lonOffset: number, R: number, cx: number, cy: number): string {
  const segs: Projected[][] = [];
  let cur: Projected[] = [];
  for (const [lon, lat] of poly) {
    const p = lonLatToXY(lon, lat, lonOffset, R, cx, cy);
    if (p.visible) cur.push(p);
    else if (cur.length) { segs.push(cur); cur = []; }
  }
  if (cur.length) segs.push(cur);
  return segs.filter(s => s.length > 1).map(s => {
    let d = `M ${s[0].x.toFixed(1)} ${s[0].y.toFixed(1)}`;
    for (let i = 1; i < s.length; i++) d += ` L ${s[i].x.toFixed(1)} ${s[i].y.toFixed(1)}`;
    return d + " Z";
  }).join(" ");
}

function buildLine(pts: Projected[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  return d;
}

function Polaroid({ pin, size }: { pin: GlobePin & Projected; size: number }) {
  const cx = size / 2, cy = size / 2;
  const dx = pin.x - cx, dy = pin.y - cy;
  const len = Math.hypot(dx, dy) || 1;
  const outR = size / 2 + 40;
  const ox = cx + (dx / len) * outR;
  const oy = cy + (dy / len) * outR;
  const leftSide = ox < cx;
  const [g1, g2] = PHOTO_GRAD[pin.photo] ?? ["#8a6f44", "#d9b585"];

  return (
    <div
      className="polaroid-tooltip"
      style={{
        position: "absolute",
        left: ox,
        top: oy,
        transform: `translate(${leftSide ? "-100%" : "0"}, -50%) rotate(${leftSide ? -4 : 4}deg)`,
        width: 190,
        pointerEvents: "none",
        zIndex: 4,
      }}
    >
      <div className="pt-tape" />
      <div className="pt-photo" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
        <div className="pt-photo-grain" />
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
}

export default function InkGlobe({
  size = 560, autoRotate = true, speed = 0.12,
  cycleInterval = 4200, paused = false, onFocus,
}: InkGlobeProps) {
  const R = size / 2 - 18;
  const cx = size / 2, cy = size / 2;

  const [lonOffset, setLonOffset] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [focusId, setFocusId] = useState(PINS[0].id);
  const rafRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);
  const userInteractRef = useRef<number>(0);

  useEffect(() => {
    if (paused) return;
    lastTRef.current = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(64, t - lastTRef.current);
      lastTRef.current = t;
      if (autoRotate) {
        const active = hover !== null || Date.now() - userInteractRef.current < 900;
        setLonOffset(v => (v + speed * dt * 0.06 * (active ? 0.15 : 1)) % 360);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [autoRotate, speed, paused, hover]);

  // Keep a stable ref to onFocus so the interval never needs to re-register
  const onFocusRef = useRef(onFocus);
  useLayoutEffect(() => { onFocusRef.current = onFocus; });

  // auto-cycle — only updates focusId, never calls onFocus inside the updater
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setFocusId(cur => {
        const i = PINS.findIndex(p => p.id === cur);
        return PINS[(i + 1) % PINS.length].id;
      });
    }, cycleInterval);
    return () => clearInterval(id);
  }, [cycleInterval, paused]);

  // notify parent after focusId settles — safe, runs outside render
  useEffect(() => {
    const pin = PINS.find(p => p.id === focusId);
    if (pin) onFocusRef.current?.(pin);
  }, [focusId]);

  useEffect(() => {
    if (hover || paused) return;
    const pin = PINS.find(x => x.id === focusId);
    if (!pin) return;
    const target = -pin.lon;
    const start = performance.now();
    const dur = 1200;
    let startVal = 0;
    setLonOffset(v => { startVal = v; return v; });
    let raf: number;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const diff = ((target - startVal + 540) % 360) - 180;
      setLonOffset(((startVal + diff * (1 - Math.pow(1 - k, 3))) % 360 + 360) % 360);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const projected = useMemo(
    () => PINS.map(p => ({ ...p, ...lonLatToXY(p.lon, p.lat, lonOffset, R, cx, cy) })),
    [lonOffset, R, cx, cy],
  );
  const continents = useMemo(
    () => CONTINENTS.map(poly => continentPath(poly, lonOffset, R, cx, cy)),
    [lonOffset, R, cx, cy],
  );
  const meridians = useMemo(() => {
    const lines: string[] = [];
    for (let lon = -180; lon < 180; lon += 30) {
      let pts: Projected[] = [];
      for (let lat = -90; lat <= 90; lat += 6) {
        const p = lonLatToXY(lon, lat, lonOffset, R, cx, cy);
        if (p.visible) pts.push(p);
        else if (pts.length) { lines.push(buildLine(pts)); pts = []; }
      }
      if (pts.length > 1) lines.push(buildLine(pts));
    }
    return lines;
  }, [lonOffset, R, cx, cy]);
  const parallels = useMemo(() => {
    const lines: string[] = [];
    for (let lat = -60; lat <= 60; lat += 20) {
      let pts: Projected[] = [];
      for (let lon2 = -180; lon2 <= 180; lon2 += 4) {
        const p = lonLatToXY(lon2, lat, lonOffset, R, cx, cy);
        if (p.visible) pts.push(p);
        else if (pts.length) { lines.push(buildLine(pts)); pts = []; }
      }
      if (pts.length > 1) lines.push(buildLine(pts));
    }
    return lines;
  }, [lonOffset, R, cx, cy]);

  const ticks = useMemo(() => Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    const r1 = R + 6, r2 = R + (i % 6 === 0 ? 14 : 10);
    return { x1: cx + Math.cos(a) * r1, y1: cy + Math.sin(a) * r1, x2: cx + Math.cos(a) * r2, y2: cy + Math.sin(a) * r2, major: i % 6 === 0 };
  }), [R, cx, cy]);

  const handleEnter = useCallback((id: string) => { setHover(id); userInteractRef.current = Date.now(); }, []);
  const handleLeave = useCallback(() => setHover(null), []);

  const focusPin = projected.find(p => p.id === focusId);
  const activePin = hover ? projected.find(p => p.id === hover) : focusPin;

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <radialGradient id="globeFill" cx="38%" cy="32%" r="75%">
            <stop offset="0%"   stopColor="var(--paper-50)" />
            <stop offset="60%"  stopColor="var(--paper-100)" />
            <stop offset="100%" stopColor="var(--paper-300)" />
          </radialGradient>
          <radialGradient id="globeLimb" cx="50%" cy="50%" r="50%">
            <stop offset="80%"  stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(61,46,31,0.22)" />
          </radialGradient>
          <filter id="igGrain" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
            <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.12  0 0 0 0 0.08  0 0 0 0.35 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          <filter id="igInky" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="2.2" />
          </filter>
          <clipPath id="igClip"><circle cx={cx} cy={cy} r={R} /></clipPath>
        </defs>

        <g opacity="0.6">
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="var(--ink-600)" strokeWidth={t.major ? 1.2 : 0.6} />
          ))}
        </g>
        <g fontFamily="var(--font-mono)" fontSize="10" fill="var(--ink-600)" textAnchor="middle">
          <text x={cx} y={12}>N</text>
          <text x={cx} y={size - 4}>S</text>
          <text x={8} y={cy + 4} textAnchor="start">W</text>
          <text x={size - 8} y={cy + 4} textAnchor="end">E</text>
        </g>

        <circle cx={cx} cy={cy} r={R} fill="url(#globeFill)" />

        <g clipPath="url(#igClip)">
          {parallels.map((d, i) => <path key={`p${i}`} d={d} fill="none" stroke="var(--sepia)" strokeOpacity="0.35" strokeWidth="0.6" />)}
          {meridians.map((d, i) => <path key={`m${i}`} d={d} fill="none" stroke="var(--sepia)" strokeOpacity="0.35" strokeWidth="0.6" />)}
          <g filter="url(#igInky)">
            {continents.map((d, i) => (
              <path key={`c${i}`} d={d} fill="var(--sepia-light)" fillOpacity="0.55" stroke="var(--ink-800)" strokeOpacity="0.7" strokeWidth="1.1" strokeLinejoin="round" />
            ))}
          </g>
          <rect x={cx - R} y={cy - R} width={R * 2} height={R * 2} filter="url(#igGrain)" opacity="0.35" />
          {projected.map(p => {
            if (!p.visible) return null;
            const big = hover === p.id || focusId === p.id;
            const color = MOOD[p.mood] ?? "var(--accent-tomato)";
            return (
              <g key={p.id} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`} style={{ cursor: "pointer" }}
                onMouseEnter={() => handleEnter(p.id)} onMouseLeave={handleLeave}
                onClick={() => { setFocusId(p.id); onFocus?.(p); }}>
                <circle r={big ? 14 : 10} fill={color} opacity={big ? 0.22 : 0.14}>
                  <animate attributeName="r" values={`${big?10:7};${big?18:12};${big?10:7}`} dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values={`${big?0.28:0.18};0.02;${big?0.28:0.18}`} dur="2.2s" repeatCount="indefinite" />
                </circle>
                <circle r={big ? 5.2 : 3.8} fill={color} stroke="var(--paper-50)" strokeWidth="1.2" />
                <circle r="14" fill="transparent" />
              </g>
            );
          })}
        </g>

        <circle cx={cx} cy={cy} r={R} fill="url(#globeLimb)" pointerEvents="none" />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--ink-800)" strokeOpacity="0.55" strokeWidth="1.2" />
      </svg>

      {activePin && activePin.visible && <Polaroid pin={activePin} size={size} />}

      <div className="globe-caption">
        <span>lat {activePin ? activePin.lat.toFixed(2) : "—"}°</span>
        <span>lon {activePin ? activePin.lon.toFixed(2) : "—"}°</span>
      </div>
    </div>
  );
}
