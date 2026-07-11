"use client";

import { useMemo, useState } from "react";
import { CloudSeries } from "@/lib/types";
import { ConstellationCloud } from "@/components/ConstellationCloud";

/**
 * K2/K8: fri jämförelse av avtal (leverantör × område), max 6 markerade,
 * ovanpå konstellationsmolnet. All data kommer serverifrån (cloud) — inga
 * klientanrop behövs. Jämförelsen sker per AVTAL — aldrig beräknade snitt.
 */

const GROUP_COLORS = ["var(--compare-1)", "var(--compare-2)", "var(--compare-3)", "var(--compare-4)", "var(--compare-5)"];
const MAX_SELECTED = 6;

export function CompareExplorer({
  cloud,
  periods,
  initialKeys,
}: {
  cloud: CloudSeries[];
  periods: string[];
  initialKeys: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialKeys.slice(0, MAX_SELECTED));
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return cloud
      .filter((s) => {
        const key = `${s.supplier}|${s.delivery_area}`;
        return !selected.includes(key) && (s.supplier.toLowerCase().includes(q) || s.delivery_area.toLowerCase().includes(q));
      })
      .slice(0, 8);
  }, [query, cloud, selected]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {selected.map((key, i) => {
          const [supplier, area] = key.split("|");
          const color = i === selected.length - 1 ? "var(--signal)" : GROUP_COLORS[i % GROUP_COLORS.length];
          return (
            <button
              key={key}
              onClick={() => setSelected(selected.filter((k) => k !== key))}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-colors hover:bg-[var(--bg-hover)]"
              style={{ borderColor: color, color: "var(--text)" }}
              title="Klicka för att ta bort"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              {supplier} — {area}
              <span className="text-[var(--text-faint)]">×</span>
            </button>
          );
        })}
      </div>

      <div className="relative max-w-md">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={selected.length >= MAX_SELECTED ? `Max ${MAX_SELECTED} avtal — ta bort ett först` : "Lyft ett avtal: sök leverantör eller område — eller klicka i molnet…"}
          disabled={selected.length >= MAX_SELECTED}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none border border-[var(--line)] bg-[var(--bg-raised)] placeholder:text-[var(--text-faint)] focus:border-[var(--compare-1)] disabled:opacity-50"
          aria-label="Sök avtal att jämföra"
        />
        {matches.length > 0 && (
          <ul className="absolute z-40 mt-1 w-full card divide-y divide-[var(--line-soft)] overflow-hidden">
            {matches.map((s) => {
              const key = `${s.supplier}|${s.delivery_area}`;
              return (
                <li key={key}>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--bg-hover)]"
                    onClick={() => {
                      setSelected([...selected, key]);
                      setQuery("");
                    }}
                  >
                    {s.supplier} <span className="text-[var(--text-dim)]">— {s.delivery_area}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card p-4">
        <ConstellationCloud
          cloud={cloud}
          periods={periods}
          selected={selected}
          onSelect={(key) => setSelected((prev) => (prev.includes(key) || prev.length >= MAX_SELECTED ? prev : [...prev, key]))}
          maxSelected={MAX_SELECTED}
        />
      </div>
    </div>
  );
}
