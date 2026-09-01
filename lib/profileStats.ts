import type { LocationPhoto } from "@/types/location";
import { memoryDateOf } from "./memoryDate";

/** Resumo do caderno de uma pessoa, derivado das memórias — nada é contado à parte. */
export type ProfileStats = {
  memories: number;
  countries: number;
  publicMemories: number;
  /** Data da memória mais antiga e da mais recente (null se não houver nenhuma). */
  firstAt: number | null;
  lastAt: number | null;
  /** Quantos anos distintos aparecem no caderno. */
  yearsCovered: number;
  /** Memórias por ano, do mais antigo para o mais recente. */
  byYear: { year: number; count: number }[];
  /** Códigos de país, em ordem alfabética. */
  countryCodes: string[];
};

export function computeProfileStats(locations: LocationPhoto[]): ProfileStats {
  const countries = new Set<string>();
  const perYear = new Map<number, number>();
  let publicMemories = 0;
  let firstAt: number | null = null;
  let lastAt: number | null = null;

  for (const loc of locations) {
    const code = loc.countryCode?.toUpperCase();
    if (code) countries.add(code);
    if (loc.isPublic) publicMemories++;

    const at = memoryDateOf(loc);
    if (firstAt === null || at < firstAt) firstAt = at;
    if (lastAt === null || at > lastAt) lastAt = at;

    const year = new Date(at).getFullYear();
    perYear.set(year, (perYear.get(year) ?? 0) + 1);
  }

  return {
    memories: locations.length,
    countries: countries.size,
    publicMemories,
    firstAt,
    lastAt,
    yearsCovered: perYear.size,
    byYear: [...perYear.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year),
    countryCodes: [...countries].sort(),
  };
}

/** "BR" → bandeira, usando os símbolos regionais do Unicode. */
export function flagFor(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  const BASE = 0x1f1e6; // 🇦
  return String.fromCodePoint(
    BASE + (code.charCodeAt(0) - 65),
    BASE + (code.charCodeAt(1) - 65),
  );
}
