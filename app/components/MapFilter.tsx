"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { LocationPhoto } from "@/types/location";
import {
  ALL_MEMORIES,
  endOfDayValue,
  fromDateInputValue,
  toDateInputValue,
  yearsWithMemories,
  type DateFilter,
} from "@/lib/memoryDate";

type Props = {
  locations: LocationPhoto[];
  filter: DateFilter;
  onChange: (filter: DateFilter) => void;
  visibleCount: number;
};

export default function MapFilter({ locations, filter, onChange, visibleCount }: Props) {
  const [rangeOpen, setRangeOpen] = useState(filter.kind === "range");
  // avaliado uma vez na montagem: ler o relógio no render quebra a pureza
  const [todayValue] = useState(() => toDateInputValue(Date.now()));
  const years = yearsWithMemories(locations);
  const total = locations.length;

  if (total === 0) return null;

  const rangeFrom = filter.kind === "range" && filter.from !== null ? toDateInputValue(filter.from) : "";
  const rangeTo = filter.kind === "range" && filter.to !== null ? toDateInputValue(filter.to) : "";

  function updateRange(part: "from" | "to", value: string) {
    const current = filter.kind === "range" ? filter : { kind: "range" as const, from: null, to: null };
    const parsed = value === "" ? null : (part === "from" ? fromDateInputValue(value) : endOfDayValue(value));
    const next: DateFilter = { ...current, [part]: parsed };
    onChange(next);
  }

  function clearRange() {
    setRangeOpen(false);
    onChange(ALL_MEMORIES);
  }

  return (
    <div className="map-filter">
      <div className="map-filter-chips">
        <button
          className={`filter-chip${filter.kind === "all" ? " is-active" : ""}`}
          onClick={() => { setRangeOpen(false); onChange(ALL_MEMORIES); }}
        >
          todas <span className="chip-count">{total}</span>
        </button>

        {years.map(({ year, count }) => (
          <button
            key={year}
            className={`filter-chip${filter.kind === "year" && filter.year === year ? " is-active" : ""}`}
            onClick={() => { setRangeOpen(false); onChange({ kind: "year", year }); }}
          >
            {year} <span className="chip-count">{count}</span>
          </button>
        ))}

        <button
          className={`filter-chip is-range${rangeOpen || filter.kind === "range" ? " is-active" : ""}`}
          onClick={() => {
            const opening = !rangeOpen;
            setRangeOpen(opening);
            if (opening) onChange({ kind: "range", from: null, to: null });
            else onChange(ALL_MEMORIES);
          }}
          aria-expanded={rangeOpen}
        >
          <SlidersHorizontal size={12} strokeWidth={1.8} />
          período
        </button>
      </div>

      {rangeOpen && (
        <div className="map-filter-range">
          <label>
            <span>de</span>
            <input
              type="date"
              className="date-input"
              value={rangeFrom}
              max={todayValue}
              onChange={(e) => updateRange("from", e.target.value)}
            />
          </label>
          <label>
            <span>até</span>
            <input
              type="date"
              className="date-input"
              value={rangeTo}
              max={todayValue}
              onChange={(e) => updateRange("to", e.target.value)}
            />
          </label>
          <button className="range-clear" onClick={clearRange} aria-label="Limpar período">
            <X size={13} strokeWidth={1.8} />
          </button>
        </div>
      )}

      {filter.kind !== "all" && (
        <div className="map-filter-summary">
          {visibleCount === 0
            ? "nenhuma memória nesse período"
            : `mostrando ${visibleCount} de ${total}`}
        </div>
      )}
    </div>
  );
}
