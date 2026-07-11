"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Municipality } from "@/lib/types";

/**
 * K1 (v1): kommun in → rätt leveransområde. Mappningen är AF:s egna
 * leveransområdesdokument (via delivery_area_municipalities). Avstånd till
 * närmaste kontor kommer när postnummer-geokodning finns.
 */
export function KommunSearch({ municipalities }: { municipalities: Municipality[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return municipalities.filter((m) => m.kommun.toLowerCase().startsWith(q)).slice(0, 8);
  }, [query, municipalities]);

  return (
    <div className="relative max-w-md">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Var bor du? Sök din kommun…"
        className="w-full rounded-lg px-4 py-2.5 text-sm outline-none border border-[var(--line)] bg-[var(--bg-raised)] placeholder:text-[var(--text-faint)] focus:border-[var(--compare-1)]"
        aria-label="Sök kommun för att hitta ditt leveransområde"
      />
      {matches.length > 0 && (
        <ul className="absolute z-40 mt-1 w-full card divide-y divide-[var(--line-soft)] overflow-hidden">
          {matches.map((m) => (
            <li key={m.kommun}>
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
