"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPinned, Frame, Link2, Check, UserRound } from "lucide-react";

/**
 * Navegação principal de quem está logado.
 *
 * É o mesmo componente no desktop e no celular: no desktop ele vive dentro do
 * cabeçalho, no celular o CSS o transforma em barra fixa embaixo. Existe um só
 * para as duas telas não divergirem conforme a navegação for crescendo.
 */

type Props = {
  /** Sem username o item de compartilhar não tem endereço para copiar. */
  username?: string;
  memoriesCount: number;
  /**
   * Quando presente, o pôster abre o assistente na própria tela.
   * Sem ela (fora do mapa), o item leva para o mapa já abrindo o assistente.
   */
  onOpenPoster?: () => void;
};

export default function MainNav({ username, memoriesCount, onOpenPoster }: Props) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  const noMemories = memoriesCount === 0;

  async function copyLink() {
    if (!username) return;
    const url = `https://guardei.art/u/${username}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const memoriesActive = pathname === "/map";
  const profileActive = pathname === "/perfil";

  const posterLabel = (
    <>
      <Frame size={14} strokeWidth={1.7} />
      <span className="btn-label">pôster</span>
      {memoriesCount > 0 && <span className="cta-count">{memoriesCount}</span>}
    </>
  );

  return (
    <nav className="map-actions map-tabbar" aria-label="Navegação principal">
      <Link
        href="/map"
        className={`map-btn is-memories${memoriesActive ? " is-active" : ""}`}
        aria-current={memoriesActive ? "page" : undefined}
      >
        <MapPinned size={14} strokeWidth={1.7} />
        <span className="btn-label">memórias</span>
      </Link>

      {onOpenPoster ? (
        <button
          className="map-cta-poster"
          onClick={onOpenPoster}
          disabled={noMemories}
          title={
            noMemories
              ? "Guarde uma memória primeiro para montar seu pôster"
              : "Monte um pôster com suas memórias"
          }
        >
          {posterLabel}
        </button>
      ) : (
        /* fora do mapa o item vira link: a tela de destino abre o assistente */
        <Link
          className={`map-cta-poster${noMemories ? " is-muted" : ""}`}
          href={noMemories ? "/map" : "/map?poster=1"}
          title="Monte um pôster com suas memórias"
        >
          {posterLabel}
        </Link>
      )}

      <button
        className={`map-btn is-share${copied ? " is-done" : ""}`}
        onClick={copyLink}
        disabled={!username}
        title={username ? `guardei.art/u/${username}` : "Endereço ainda sendo criado"}
      >
        {copied ? <Check size={14} strokeWidth={1.8} /> : <Link2 size={14} strokeWidth={1.7} />}
        <span className="btn-label">{copied ? "copiado!" : "compartilhar"}</span>
      </button>

      <Link
        href="/perfil"
        className={`map-btn is-profile${profileActive ? " is-active" : ""}`}
        aria-current={profileActive ? "page" : undefined}
      >
        <UserRound size={14} strokeWidth={1.7} />
        <span className="btn-label">perfil</span>
      </Link>
    </nav>
  );
}
