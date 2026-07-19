"use client";

import { useMemo, useState } from "react";
import { CloudSeries } from "@/lib/types";
import { ConstellationCloud } from "@/components/ConstellationCloud";
import { SelectionChips, SpotlightNote, spotlightSelection } from "@/components/SelectionChips";
import { MAX_COMPARE, contractKey } from "@/lib/compare";

/**
 * K2/K8: fri jämförelse av avtal (leverantör × område), max MAX_COMPARE
 * markerade, ovanpå konstellationsmolnet. All data kommer serverifrån (cloud)
 * — inga klientanrop behövs. Jämförelsen sker per AVTAL — aldrig beräknade snitt.
 */

const MAX_SUGGESTIONS = 12;

const keyOf = (s: CloudSeries) => contractKey(s.supplier, s.delivery_area);

export function CompareExplorer({
  cloud,
  periods,
  initialKeys,
}: {
  cloud: CloudSeries[];
  periods: string[];
  initialKeys: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialKeys.slice(0, MAX_COMPARE));
  const [query, setQuery] = useState("");
  const [spotlightNote, setSpotlightNote] = useState<{ supplier: string; total: number } | null>(null);

  const latestIdx = periods.length - 1;

  const bySupplier = useMemo(() => {
    const m = new Map<string, CloudSeries[]>();
    for (const s of cloud) m.set(s.supplier, [...(m.get(s.supplier) ?? []), s]);
    return m;
  }, [cloud]);

  // Sorterade träffar utan tyst trunkering: startsWith före substring,
  // med-i-senaste-perioden före historiska, sedan bokstavsordning på område.
  const matches = useMemo(() => {
    if (query.trim().length < 2) return null;
    const q = query.trim().toLowerCase();
    const hits = cloud
      .filter((s) => {
        const key = keyOf(s);
        return !selected.includes(key) && (s.supplier.toLowerCase().includes(q) || s.delivery_area.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const starts = (s: CloudSeries) =>
          s.supplier.toLowerCase().startsWith(q) || s.delivery_area.toLowerCase().startsWith(q) ? 0 : 1;
        const inLatest = (s: CloudSeries) => (s.values[latestIdx] !== null ? 0 : 1);
        return (
          starts(a) - starts(b) ||
          inLatest(a) - inLatest(b) ||
          a.delivery_area.localeCompare(b.delivery_area, "sv") ||
          a.supplier.localeCompare(b.supplier, "sv")
        );
      });

    // Gruppera per leverantör i sorteringsordning, trunkera på antal rader
    const groups: { supplier: string; items: CloudSeries[] }[] = [];
    const idx = new Map<string, number>();
    for (const s of hits) {
      let i = idx.get(s.supplier);
      if (i === undefined) {
        i = groups.length;
        idx.set(s.supplier, i);
        groups.push({ supplier: s.supplier, items: [] });
      }
      groups[i].items.push(s);
    }
    let shown = 0;
    const visible: { supplier: string; items: CloudSeries[] }[] = [];
    for (const g of groups) {
      if (shown >= MAX_SUGGESTIONS) break;
      const take = g.items.slice(0, MAX_SUGGESTIONS - shown);
      visible.push({ supplier: g.supplier, items: take });
      shown += take.length;
    }
    return { visible, shown, total: hits.length };
  }, [query, cloud, selected, latestIdx]);

  // Samma beteende som startsidans spotlight: alla leverantörens avtal,
  // högst resultat först, upp till taket.
  function selectAllFor(supplier: string) {
    const { keys, total } = spotlightSelection(bySupplier.get(supplier) ?? []);
    setSelected(keys);
    setSpotlightNote(total > keys.length ? { supplier, total } : null);
    setQuery("");
  }

  return (
    <div className="space-y-4">
      <SelectionChips
        selected={selected}
        cloud={cloud}
        onRemove={(key) => {
          setSelected(selected.filter((k) => k !== key));
          setSpotlightNote(null);
        }}
      />
      {spotlightNote && selected.length > 0 && (
        <SpotlightNote supplier={spotlightNote.supplier} total={spotlightNote.total} shown={selected.length} />
      )}

      <div className="relative max-w-md">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={selected.length >= MAX_COMPARE ? `Max ${MAX_COMPARE} avtal — ta bort ett först` : "Lyft ett avtal: sök leverantör eller område — eller klicka i molnet…"}
          disabled={selected.length >= MAX_COMPARE}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none border border-[var(--line)] bg-[var(--bg-raised)] placeholder:text-[var(--text-faint)] focus:border-[var(--compare-1)] disabled:opacity-50"
          aria-label="Sök avtal att jämföra"
        />
        {matches && matches.visible.length > 0 && (
          <ul className="absolute z-40 mt-1 w-full card divide-y divide-[var(--line-soft)] overflow-hidden max-h-96 overflow-y-auto">
            {matches.visible.map((g) => (
              <li key={g.supplier}>
                <div className="flex items-center justify-between gap-3 px-4 pt-2.5 pb-1">
                  <span className="text-xs font-medium text-[var(--text-dim)] truncate">{g.supplier}</span>
                  <button
                    type="button"
                    onClick={() => selectAllFor(g.supplier)}
                    className="text-xs shrink-0 text-[var(--compare-1)] hover:underline"
                  >
                    + alla ({bySupplier.get(g.supplier)?.length ?? g.items.length})
                  </button>
                </div>
                {g.items.map((s) => {
                  const key = keyOf(s);
                  return (
                    <button
                      key={key}
                      className="w-full text-left pl-7 pr-4 py-2 text-sm hover:bg-[var(--bg-hover)]"
                      onClick={() => {
                        setSelected((prev) => (prev.includes(key) || prev.length >= MAX_COMPARE ? prev : [...prev, key]));
                        setSpotlightNote(null);
                        setQuery("");
                      }}
                    >
                      {s.supplier} <span className="text-[var(--text-dim)]">— {s.delivery_area}</span>
                    </button>
                  );
                })}
              </li>
            ))}
            {matches.total > matches.shown && (
              <li className="px-4 py-2 text-xs text-[var(--text-dim)]">
                visar {matches.shown} av {matches.total} träffar — skriv mer för att förfina
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="card p-4">
        <ConstellationCloud
          cloud={cloud}
          periods={periods}
          selected={selected}
          onSelect={(key) => {
            setSelected((prev) => (prev.includes(key) || prev.length >= MAX_COMPARE ? prev : [...prev, key]));
            setSpotlightNote(null);
          }}
          maxSelected={MAX_COMPARE}
        />
      </div>
    </div>
  );
}
