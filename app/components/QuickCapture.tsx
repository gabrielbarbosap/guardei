"use client";

import { useRef, useState } from "react";
import { uploadPhoto } from "@/lib/upload";

type Props = {
  userId: string;
  onCaptured: () => Promise<void>;
};

type Step = "idle" | "preview" | "saving";

export default function QuickCapture({ userId, onCaptured }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // abre só a câmera — GPS vem depois
  function handleButtonClick() {
    setErrorMsg("");
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!chosen) return;

    const url = URL.createObjectURL(chosen);
    setFile(chosen);
    setPreviewUrl(url);
    setCoords(null);
    setLocating(true);
    setStep("preview");

    // agora pede GPS, depois que a câmera já foi liberada
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setErrorMsg("Não foi possível obter a localização. Permita o acesso e tente de novo.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function handleSave() {
    if (!file) return;
    if (!coords) {
      setErrorMsg("Aguarde a localização ser detectada.");
      return;
    }
    setStep("saving");
    setErrorMsg("");
    try {
      await uploadPhoto({ file, lat: coords.lat, lng: coords.lng, description, userId });
      await onCaptured();
      reset();
    } catch {
      setErrorMsg("Falha ao salvar. Tente de novo.");
      setStep("preview");
    }
  }

  function reset() {
    setStep("idle");
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCoords(null);
    setLocating(false);
    setDescription("");
    setErrorMsg("");
  }

  return (
    <>
      {/* hidden camera input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* ── FAB ── */}
      {step === "idle" && (
        <button
          onClick={handleButtonClick}
          aria-label="Capturar momento agora"
          style={{
            position: "fixed", bottom: 32, right: 28, zIndex: 55,
            width: 60, height: 60, borderRadius: "50%",
            background: "var(--ink-900)",
            border: "2px solid var(--paper-300)",
            boxShadow: "0 4px 24px rgba(42,31,20,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--paper-50)",
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="15" rx="2"/>
            <circle cx="12" cy="13.5" r="3.5"/>
            <path d="M8 6l2-2h4l2 2"/>
          </svg>
        </button>
      )}

      {/* ── PREVIEW / SAVING panel ── */}
      {(step === "preview" || step === "saving") && previewUrl && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 60,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          background: "rgba(20,14,8,0.55)",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "var(--paper-50)",
            borderRadius: "var(--radius-md) var(--radius-md) 0 0",
            padding: "28px 24px 36px",
            width: "100%", maxWidth: 480,
            boxShadow: "0 -8px 40px rgba(42,31,20,0.25)",
            position: "relative",
          }}>
            {/* tape */}
            <div style={{
              position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
              width: 56, height: 18, background: "rgba(244,196,48,0.55)", borderRadius: 2,
            }} />

            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              {/* thumbnail */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="preview"
                style={{
                  width: 96, height: 96, objectFit: "cover",
                  borderRadius: "var(--radius-sm)", flexShrink: 0,
                  border: "1px solid var(--paper-300)",
                }}
              />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {/* localização */}
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 10,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: locating ? "var(--ink-400)" : "var(--ink-600)",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {locating ? (
                    <>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                        </path>
                      </svg>
                      obtendo localização…
                    </>
                  ) : coords ? (
                    <>📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</>
                  ) : (
                    <>📍 localização indisponível</>
                  )}
                </div>

                <textarea
                  autoFocus
                  rows={3}
                  placeholder="o que foi esse momento?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{
                    width: "100%", resize: "none",
                    fontFamily: "var(--font-body)", fontSize: 14,
                    color: "var(--ink-800)", background: "var(--paper-100)",
                    border: "1px solid var(--paper-300)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 10px", lineHeight: 1.5, outline: "none",
                  }}
                />
              </div>
            </div>

            {errorMsg && (
              <p style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: "var(--danger)", marginBottom: 12,
              }}>{errorMsg}</p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={reset}
                disabled={step === "saving"}
                style={{
                  flex: 1, padding: "12px",
                  fontFamily: "var(--font-mono)", fontSize: 12,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  background: "none", border: "1px dashed var(--paper-400)",
                  borderRadius: "var(--radius-sm)", cursor: "pointer",
                  color: "var(--ink-600)",
                }}
              >
                cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={step === "saving" || locating}
                style={{
                  flex: 2, padding: "12px",
                  fontFamily: "var(--font-mono)", fontSize: 12,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  background: locating ? "var(--ink-600)" : "var(--ink-900)",
                  border: "none", borderRadius: "var(--radius-sm)",
                  cursor: locating ? "default" : "pointer",
                  color: "var(--paper-50)",
                  transition: "background 0.2s",
                }}
              >
                {step === "saving" ? "guardando…" : locating ? "aguardando gps…" : "guardar aqui"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* error toast fora do preview */}
      {step === "idle" && errorMsg && (
        <div style={{
          position: "fixed", bottom: 104, right: 28, zIndex: 55,
          background: "var(--paper-50)", border: "1px solid var(--danger)",
          borderRadius: "var(--radius)", padding: "10px 16px",
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "var(--danger)", maxWidth: 260,
          boxShadow: "var(--shadow-md)",
        }}>
          {errorMsg}
        </div>
      )}
    </>
  );
}
