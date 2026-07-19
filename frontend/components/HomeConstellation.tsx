"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CloudSeries } from "@/lib/types";
import { getAllCloudSeries } from "@/lib/queries";
import { ConstellationCloud } from "@/components/ConstellationCloud";
import { SelectionChips, SpotlightNote, spotlightSelection } from "@/components/SelectionChips";
import { Spinner } from "@/components/Spinner";
import { MAX_COMPARE } from "@/lib/compare";
import { periodLabel } from "@/lib/format";

/**
 * Konstellationen på startsidan + leverantörsspotlight.
 * Molndatan hämtas först när sektionen närmar sig viewporten (IntersectionObserver)
 * — startsidans first load förblir lätt (SEO-planens Core Web Vitals-krav).
 */

export function HomeConstellation({ periods, initialKeys }: { periods: string[]; initialKeys: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cloud, setCloud] = useState<CloudSeries[] | null>(null);
  const [selected, setSelected] = useState<string[]>(initialKeys.slice(0, MAX_COMPARE));
  const [query, setQuery] = useState("");
  const [spotlightNote, setSpotlightNote] = useState<{ supplier: string; total: number } | null>(null);

  const latestIdx = periods.length - 1;

  useEffect(() => {
    const el = ref.current;
    if (!el || cloud) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          getAllCloudSeries(periods).then(setCloud);
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [periods, cloud]);

  // Spotlight: leverantörsträffar grupperade per leverantör. Sortering:
  // startsWith före substring, med-i-senaste-perioden före historiska, sedan namn.
  const matches = useMemo(() => {
    if (!cloud || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    const bySupplier = new Map<string, CloudSeries[]>();
    for (const s of cloud) {
      if (s.supplier.toLowerCase().includes(q)) {
        bySupplier.set(s.supplier, [...(bySupplier.get(s.supplier) ?? []), s]);
      }
    }
    return Array.from(bySupplier.entries())
      .sort(([aName, aSeries], [bName, bSeries]) => {
        const starts = (n: string) => (n.toLowerCase().startsWith(q) ? 0 : 1);
        const inLatest = (series: CloudSeries[]) => (series.some((s) => s.values[latestIdx] !== null) ? 0 : 1);
        return (
          starts(aName) - starts(bName) ||
          inLatest(aSeries) - inLatest(bSeries) ||
          aName.localeCompare(bName, "sv")
        );
      })
      .slice(0, 6);
  }, [cloud, query, latestIdx]);

  function spotlight(supplier: string, series: CloudSeries[]) {
    const { keys, total } = spotlightSelection(series);
    setSelected(keys);
    setSpotlightNote(total > keys.length ? { supplier, total } : null);
    setQuery("");
  }

  return (
    <div ref={ref} className="space-y-3">
      <div className="relative max-w-md">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Lys upp en leverantör — skriv namnet…"
          aria-label="Sök leverantör i konstellationen"
          disabled={!cloud}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none border border-[var(--line)] bg-[var(--bg-raised)] placeholder:text-[var(--text-faint)] focus:border-[var(--compare-1)] disabled:opacity-60"
        />
        {matches.length > 0 && (
          <ul className="absolute z-30 mt-1 w-full card divide-y divide-[var(--line-soft)] overflow-hidden">
            {matches.map(([supplier, series]) => {
              const latestCount = series.filter((s) => s.values[latestIdx] !== null).length;
              const label =
                latestCount === series.length
                  ? `${latestCount} avtal (${periodLabel(periods[latestIdx])})`
                  : `${latestCount} avtal (${periodLabel(periods[latestIdx])}) · ${series.length} totalt sedan ${periodLabel(periods[0])}`;
              return (
                <li key={supplier}>
                  <button
                    type="button"
                    onClick={() => spotlight(supplier, series)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    {supplier} <span className="text-xs text-[var(--text-dim)]">— {label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SelectionChips
        selected={selected}
        cloud={cloud}
        onRemove={(key) => {
          setSelected((cur) => cur.filter((k) => k !== key));
          setSpotlightNote(null);
        }}
      />
      {spotlightNote && selected.length > 0 && (
        <SpotlightNote supplier={spotlightNote.supplier} total={spotlightNote.total} shown={selected.length} />
      )}

      {cloud ? (
        <ConstellationCloud
          cloud={cloud}
          periods={periods}
          selected={selected}
          onSelect={(key) => {
            setSelected((cur) => (cur.includes(key) || cur.length >= MAX_COMPARE ? cur : [...cur, key]));
            setSpotlightNote(null);
          }}
          maxSelected={MAX_COMPARE}
        />
      ) : (
        <div
          className="w-full flex items-center justify-center"
          style={{ aspectRatio: "960 / 460" }}
        >
          <Spinner label="Hämtar marknadsdata…" />
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-[var(--text-dim)]">
          Startvyn lyfter topp 5 i landet. Klicka i molnet eller sök för att lyfta andra.
        </p>
        <Link
          href={`/jamfor?keys=${encodeURIComponent(selected.join(","))}`}
          className="text-sm link shrink-0"
        >
          Öppna i Jämför →
        </Link>
      </div>
    </div>
  );
}
