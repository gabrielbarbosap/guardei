export type LocationPhoto = {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  countryCode?: string;
  imageUrl: string;
  description: string;
  /** Quando a memória foi enviada. */
  createdAt: number;
  /**
   * Quando a memória aconteceu, escolhido por quem guardou.
   * Opcional: memórias anteriores a este campo caem no `createdAt`
   * (use `memoryDateOf` de `@/lib/memoryDate` em vez de ler direto).
   */
  memoryDate?: number;
  isPublic?: boolean;
};
