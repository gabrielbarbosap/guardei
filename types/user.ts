/**
 * Perfil da pessoa, guardado em users/{uid}.
 *
 * O `username` nasce automático no primeiro acesso e não é editável: ele já
 * pode ter sido compartilhado como link do caderno público, e trocá-lo quebraria
 * o endereço na mão de quem recebeu.
 */
export type UserProfile = {
  /** Gerado no primeiro acesso; é o endereço do caderno público. */
  username: string;
  /** Nome exibido no caderno público. Começa com o nome da conta. */
  displayName?: string;
  /** Uma linha sobre a pessoa, mostrada no caderno público. */
  bio?: string;
  /** Onde mora hoje — dá contexto ao mapa de quem visita. */
  city?: string;
  /** Desliga o caderno público sem apagar nada. */
  publicProfileEnabled?: boolean;
  /** Quando a conta apareceu pela primeira vez. */
  createdAt?: number;
  updatedAt?: number;
};

/** Limites dos campos livres, aplicados na tela e antes de gravar. */
export const PROFILE_LIMITS = {
  displayName: 60,
  bio: 160,
  city: 60,
} as const;
