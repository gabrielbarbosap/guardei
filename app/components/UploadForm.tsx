"use client";

import { useState } from "react";
import { uploadPhoto } from "@/lib/upload";

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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const lat = selectedLocation?.lat.toFixed(5) ?? "";
  const lng = selectedLocation?.lng.toFixed(5) ?? "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!file) { setError("Selecione uma imagem."); return; }
    if (!selectedLocation) { setError("Clique no mapa para escolher o ponto."); return; }

    setIsSaving(true);
    try {
      await uploadPhoto({
        file,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        description,
        userId,
      });
      setFile(null);
      setDescription("");
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
        ✕
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="14" rx="2"/>
              <circle cx="12" cy="13" r="3.5"/>
              <path d="M8 6l2-2h4l2 2"/>
            </svg>
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

        {error && <p className="upload-error">{error}</p>}

        <button type="submit" className="upload-submit" disabled={isSaving}>
          {isSaving ? "guardando…" : "guardar memória"}
        </button>
      </form>
    </div>
  );
}
