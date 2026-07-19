"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Municipality } from "@/lib/types";

/**
 * K1 (v1): kommun ELLER leveransområde in → rätt områdessida. Kommun→område-
 * mappningen är AF:s egna leveransområdesdokument (via delivery_area_municipalities).
 * Områdesträffar visas först, sedan kommunmappningar. Substring, case-okänsligt.
 */
export function KommunSearch({ municipalities, areas }: { municipalities: Municipality[]; areas: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { areaHits: [], kommunHits: [] };
    const areaHits = areas
      .filter((a) => a.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b, "sv"))
      .slice(0, 6);
    const kommunHits = municipalities
      .filter((m) => m.kommun.toLowerCase().includes(q))
      .sort((a, b) => a.kommun.localeCompare(b.kommun, "sv"))
      .slice(0, Math.max(2, 10 - areaHits.length));
    return { areaHits, kommunHits };
  }, [query, municipalities, areas]);

  const hasMatches = matches.areaHits.length > 0 || matches.kommunHits.length > 0;

  return (
    <div className="relative max-w-md">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Sök din kommun eller ett leveransområde…"
        className="w-full rounded-lg px-4 py-2.5 text-sm outline-none border border-[var(--line)] bg-[var(--bg-raised)] placeholder:text-[var(--text-faint)] focus:border-[var(--compare-1)]"
        aria-label="Sök kommun eller leveransområde"
      />
      {hasMatches && (
        <ul className="absolute z-40 mt-1 w-full card divide-y divide-[var(--line-soft)] overflow-hidden">
          {matches.areaHits.map((a) => (
            <li key={`area:${a}`}>
              <button
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--bg-hover)] flex justify-between gap-3"
                onClick={() => router.push(`/leveransomraden/${encodeURIComponent(a)}`)}
              >
                <span className="font-medium">{a}</span>
                <span className="text-[var(--text-dim)] shrink-0">leveransområde</span>
              </button>
            </li>
          ))}
          {matches.kommunHits.map((m) => (
            <li key={`kommun:${m.kommun}`}>
              <button
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--bg-hover)] flex justify-between gap-3"
                onClick={() => router.push(`/leveransomraden/${encodeURIComponent(m.delivery_area)}`)}
              >
                <span>{m.kommun}</span>
                <span className="text-[var(--text-dim)] truncate">→ {m.delivery_area}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
