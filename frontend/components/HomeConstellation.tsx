"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CloudSeries } from "@/lib/types";
import { getAllCloudSeries } from "@/lib/queries";
import { ConstellationCloud } from "@/components/ConstellationCloud";

/**
 * Konstellationen på startsidan + leverantörsspotlight.
 * Molndatan hämtas först när sektionen närmar sig viewporten (IntersectionObserver)
 * — startsidans first load förblir lätt (SEO-planens Core Web Vitals-krav).
 */

const MAX_SELECTED = 6;

function lastVal(s: CloudSeries): number | null {
  for (let i = s.values.length - 1; i >= 0; i--) {
    if (s.values[i] !== null) return s.values[i];
  }
  return null;
}

export function HomeConstellation({ periods, initialKeys }: { periods: string[]; initialKeys: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cloud, setCloud] = useState<CloudSeries[] | null>(null);
  const [selected, setSelected] = useState<string[]>(initialKeys.slice(0, MAX_SELECTED));
  const [query, setQuery] = useState("");

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

  // Spotlight: leverantörsträffar grupperade per leverantör
  const matches = useMemo(() => {
    if (!cloud || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    const bySupplier = new Map<string, CloudSeries[]>();
    for (const s of cloud) {
      if (s.supplier.toLowerCase().includes(q)) {
        bySupplier.set(s.supplier, [...(bySupplier.get(s.supplier) ?? []), s]);
      }
    }
    return Array.from(bySupplier.entries()).slice(0, 6);
  }, [cloud, query]);

  function spotlight(series: CloudSeries[]) {
    const keys = [...series]
      .sort((a, b) => (lastVal(b) ?? 0) - (lastVal(a) ?? 0))
      .slice(0, MAX_SELECTED)
      .map((s) => `${s.supplier}|${s.delivery_area}`);
    setSelected(keys);
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
            {matches.map(([supplier, series]) => (
              <li key={supplier}>
                <button
                  type="button"
                  onClick={() => spotlight(series)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-hover)] transition-colors"
                >
                  {supplier}{" "}
                  <span className="text-xs text-[var(--text-dim)]">
                    — {series.length} {series.length === 1 ? "avtal" : "avtal"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cloud ? (
        <ConstellationCloud
          cloud={cloud}
          periods={periods}
          selected={selected}
          onSelect={(key) => setSelected((cur) => (cur.length < MAX_SELECTED ? [...cur, key] : cur))}
          maxSelected={MAX_SELECTED}
        />
      ) : (
        <div
          className="w-full flex items-center justify-center text-sm text-[var(--text-faint)]"
          style={{ aspectRatio: "960 / 460" }}
          aria-hidden
        >
          Konstellationen laddar…
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
