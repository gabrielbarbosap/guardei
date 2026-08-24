import type { LocationPhoto } from "@/types/location";

/**
 * Datas de memória.
 *
 * `createdAt` é quando a memória foi enviada; `memoryDate` é quando ela
 * aconteceu — e são coisas diferentes (dá para subir hoje uma foto de 2019).
 * Memórias criadas antes deste campo existir não têm `memoryDate`, então tudo
 * que lê data passa por aqui e cai no `createdAt` como aproximação.
 */
export function memoryDateOf(location: Pick<LocationPhoto, "memoryDate" | "createdAt">): number {
  return location.memoryDate ?? location.createdAt;
}

/**
 * Meio-dia local do dia escolhido.
 *
 * Guardar no meio-dia evita que fuso horário ou horário de verão empurrem a
 * data para o dia anterior/seguinte na hora de exibir ou comparar.
 */
export function startOfDayValue(year: number, month: number, day: number): number {
  return new Date(year, month, day, 12, 0, 0, 0).getTime();
}

/** `YYYY-MM-DD` (o formato do <input type="date">) a partir de um timestamp. */
export function toDateInputValue(timestamp: number): string {
  const d = new Date(timestamp);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** `YYYY-MM-DD` → timestamp no meio-dia local. Retorna null se inválido. */
export function fromDateInputValue(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y), month = Number(m) - 1, day = Number(d);
  const ts = startOfDayValue(year, month, day);
  const check = new Date(ts);
  // rejeita datas que não existem (ex.: 31/02 vira 03/03)
  if (check.getFullYear() !== year || check.getMonth() !== month || check.getDate() !== day) {
    return null;
  }
  return ts;
}

const FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function formatMemoryDate(timestamp: number): string {
  return FORMATTER.format(new Date(timestamp));
}

const SHORT_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatMemoryDateShort(timestamp: number): string {
  return SHORT_FORMATTER.format(new Date(timestamp));
}

// ── Filtro por data ────────────────────────────────────────────────────────────

export type DateFilter =
  | { kind: "all" }
  | { kind: "year"; year: number }
  | { kind: "range"; from: number | null; to: number | null };

export const ALL_MEMORIES: DateFilter = { kind: "all" };

/** Anos que realmente têm memórias, do mais recente para o mais antigo. */
export function yearsWithMemories(
  locations: LocationPhoto[],
): { year: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const loc of locations) {
    const year = new Date(memoryDateOf(loc)).getFullYear();
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);
}

export function applyDateFilter(
  locations: LocationPhoto[],
  filter: DateFilter,
): LocationPhoto[] {
  if (filter.kind === "all") return locations;

  if (filter.kind === "year") {
    return locations.filter(
      (loc) => new Date(memoryDateOf(loc)).getFullYear() === filter.year,
    );
  }

  // range: extremos abertos são permitidos ("de 2020 até hoje")
  return locations.filter((loc) => {
    const date = memoryDateOf(loc);
    if (filter.from !== null && date < filter.from) return false;
    if (filter.to !== null && date > filter.to) return false;
    return true;
  });
}

/** Fim do dia escolhido, para que "até 10/03" inclua o próprio dia 10. */
export function endOfDayValue(dateInput: string): number | null {
  const start = fromDateInputValue(dateInput);
  if (start === null) return null;
  const d = new Date(start);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
