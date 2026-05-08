"use client";

import Image from "next/image";
import type { LocationPhoto } from "@/types/location";
import { sharePolaroid } from "@/lib/share";

type Props = {
  memory: LocationPhoto;
  yearsAgo: number;
  onDismiss: () => void;
};

export default function OnThisDay({ memory, yearsAgo, onDismiss }: Props) {
  const truncatedDesc =
    memory.description.length > 80
      ? memory.description.slice(0, 80) + "…"
      : memory.description;

  function handleShare() {
    sharePolaroid(memory).catch(() => {});
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: 45,
        maxWidth: 300,
        width: "calc(100vw - 48px)",
        background: "var(--paper-50)",
        border: "1px solid var(--paper-300)",
        borderRadius: "var(--radius-md)",
        boxShadow:
          "0 8px 32px rgba(42,31,20,0.18), 0 2px 8px rgba(42,31,20,0.10)",
        overflow: "hidden",
        pointerEvents: "all",
      }}
    >
      {/* tape strip */}
      <div
        style={{
          position: "absolute",
          top: -8,
          left: "50%",
          transform: "translateX(-50%) rotate(-1deg)",
          width: 56,
          height: 16,
          background: "rgba(244,196,48,0.55)",
          mixBlendMode: "multiply",
          borderLeft: "1px dashed rgba(138,111,68,0.3)",
          borderRight: "1px dashed rgba(138,111,68,0.3)",
        }}
      />

      {/* dismiss button */}
      <button
        onClick={onDismiss}
        aria-label="Fechar"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          color: "var(--ink-400)",
          lineHeight: 1,
          padding: 4,
          zIndex: 2,
        }}
      >
        ✕
      </button>

      {/* header label */}
      <div
        style={{
          padding: "14px 16px 0",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "var(--ink-500)",
        }}
      >
        nesse dia · {yearsAgo} {yearsAgo === 1 ? "ano" : "anos"} atrás
      </div>

      {/* body: thumbnail + description + share */}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "10px 16px 16px",
          alignItems: "flex-start",
        }}
      >
        {/* photo thumbnail */}
        <div
          style={{
            flexShrink: 0,
            width: 72,
            height: 72,
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            border: "1px solid var(--paper-300)",
            background: "var(--paper-200)",
          }}
        >
          <Image
            src={memory.imageUrl}
            alt={memory.description}
            width={72}
            height={72}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            unoptimized
          />
        </div>

        {/* text + share button */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-hand)",
              fontSize: 14,
              color: "var(--ink-700)",
              lineHeight: 1.4,
            }}
          >
            {truncatedDesc}
          </p>

          {/* share button — only if memory is public */}
          {memory.isPublic !== false && (
            <button
              onClick={handleShare}
              style={{
                alignSelf: "flex-start",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-600)",
                background: "none",
                border: "1px dashed var(--paper-400)",
                borderRadius: "var(--radius-sm)",
                padding: "4px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ color: "#25d366", flexShrink: 0 }}
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              compartilhar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
