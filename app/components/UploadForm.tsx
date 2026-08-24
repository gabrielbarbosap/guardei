"use client";

import { useState } from "react";
import { X, Camera, Globe } from "lucide-react";
import { uploadPhoto } from "@/lib/upload";
import { fromDateInputValue, toDateInputValue } from "@/lib/memoryDate";

type SelectedLocation = { lat: number; lng: number };

type UploadFormProps = {
  userId: string;
  onUploaded: () => Promise<void>;
  selectedLocation: SelectedLocation | null;
  onCancel: () => void;
};

export default function UploadForm({
  userId,
  onUploaded,
  selectedLocation,
  onCancel,
}: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [dateMode, setDateMode] = useState<"today" | "custom">("today");
  const [customDate, setCustomDate] = useState("");

  const lat = selectedLocation?.lat.toFixed(5) ?? "";
  const lng = selectedLocation?.lng.toFixed(5) ?? "";
  // avaliado uma vez na montagem: ler o relógio no render quebra a pureza
  const [todayValue] = useState(() => toDateInputValue(Date.now()));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!file) { setError("Selecione uma imagem."); return; }
    if (!selectedLocation) { setError("Clique no mapa para escolher o ponto."); return; }

    let memoryDate = Date.now();
    if (dateMode === "custom") {
      const parsed = customDate ? fromDateInputValue(customDate) : null;
      if (parsed === null) { setError("Escolha uma data válida."); return; }
      if (parsed > Date.now()) { setError("A data não pode ser no futuro."); return; }
      memoryDate = parsed;
    }

    setIsSaving(true);
    try {
      await uploadPhoto({
        file,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        description,
        userId,
        isPublic,
        memoryDate,
      });
      setFile(null);
      setDescription("");
      setIsPublic(false);
      setDateMode("today");
      setCustomDate("");
      await onUploaded();
    } catch {
      setError("Falha ao enviar a foto.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="upload-panel">
      {/* tape decoration */}
      <div className="upload-panel-tape" />

      {/* close */}
      <button
        type="button"
        className="upload-panel-close"
        onClick={onCancel}
        aria-label="Fechar"
      >
        <X size={16} strokeWidth={1.8} />
      </button>

      <div className="upload-panel-title">Nova memória</div>
      <div className="upload-panel-coords">
        {lat}° N &nbsp;·&nbsp; {lng}° E
      </div>

      <form onSubmit={onSubmit}>
        {/* photo picker */}
        <div className="upload-field">
          <label>foto</label>
          <label className={`upload-file-label${file ? " has-file" : ""}`}>
            <Camera size={16} strokeWidth={1.8} />
            {file ? file.name.slice(0, 22) + (file.name.length > 22 ? "…" : "") : "escolher imagem"}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const selected = e.target.files?.[0] ?? null;
                if (selected && selected.size > 10 * 1024 * 1024) {
                  setError("Máximo 10 MB por foto.");
                  e.target.value = "";
                  return;
                }
                setError("");
                setFile(selected);
              }}
            />
          </label>
        </div>

        {/* description */}
        <div className="upload-field">
          <label>o que foi esse momento?</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="uma linha basta…"
          />
        </div>

        {/* quando aconteceu */}
        <div className="upload-field">
          <label>quando foi?</label>
          <div className="date-choice">
            <button
              type="button"
              className={`date-choice-btn${dateMode === "today" ? " is-active" : ""}`}
              onClick={() => setDateMode("today")}
            >
              hoje
            </button>
            <button
              type="button"
              className={`date-choice-btn${dateMode === "custom" ? " is-active" : ""}`}
              onClick={() => setDateMode("custom")}
            >
              outra data
            </button>
          </div>
          {dateMode === "custom" && (
            <input
              type="date"
              className="date-input"
              value={customDate}
              max={todayValue}
              onChange={(e) => { setCustomDate(e.target.value); setError(""); }}
              aria-label="Data da memória"
            />
          )}
        </div>

        {/* public toggle */}
        <div className="upload-field">
          <label
            style={{
              display: "flex", alignItems: "center", gap: 10,
              cursor: "pointer", userSelect: "none",
            }}
          >
            <span
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(v => !v)}
              style={{
                display: "inline-flex", alignItems: "center",
                width: 36, height: 20, borderRadius: 10,
                background: isPublic ? "#00b4c8" : "var(--paper-300)",
                border: "1px solid var(--paper-400)",
                transition: "background 0.2s",
                cursor: "pointer", flexShrink: 0, position: "relative",
              }}
            >
              <span style={{
                position: "absolute",
                left: isPublic ? 18 : 2,
                width: 14, height: 14, borderRadius: "50%",
                background: "var(--paper-50)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: "left 0.2s",
              }} />
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", color: "var(--ink-600)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              tornar pública
              {isPublic && <Globe size={13} strokeWidth={1.7} style={{ color: "var(--accent-cyan)" }} />}
            </span>
          </label>
        </div>

        {error && <p className="upload-error">{error}</p>}

        <button type="submit" className="upload-submit" disabled={isSaving}>
          {isSaving ? "guardando…" : "guardar memória"}
        </button>
      </form>
    </div>
  );
}
