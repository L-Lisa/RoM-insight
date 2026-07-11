"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/**
 * K7: sökbar leverantörskatalog (typeahead), grupperad
 * Aktiva / Ej betygsatta ännu / Utgångna. 235 namn kräver sök, inte scroll.
 */

export interface DirectoryEntry {
  name: string;
  slug: string;
  group: "active" | "unrated" | "exited";
  areas: number;
  bestRating: number | null;
}

const GROUP_LABELS: Record<DirectoryEntry["group"], string> = {
  active: "Aktiva",
  unrated: "Ej betygsatta ännu",
  exited: "Utgångna ur statistiken",
};

export function SupplierDirectory({ entries }: { entries: DirectoryEntry[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? entries.filter((e) => e.name.toLowerCase().includes(q)) : entries;
  }, [entries, query]);

  const groups: DirectoryEntry["group"][] = ["active", "unrated", "exited"];

  return (
    <div className="space-y-6">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Sök leverantör…"
        className="w-full max-w-md rounded-lg px-4 py-2.5 text-sm outline-none border border-[var(--line)] bg-[var(--bg-raised)] placeholder:text-[var(--text-faint)] focus:border-[var(--compare-1)]"
        aria-label="Sök leverantör"
      />

      {groups.map((g) => {
        const list = filtered.filter((e) => e.group === g);
        if (!list.length) return null;
        return (
          <section key={g}>
            <h2 className="mono-label mb-2">
              {GROUP_LABELS[g]} <span className="text-[var(--text-faint)]">({list.length})</span>
            </h2>
            <div className="card divide-y divide-[var(--line-soft)]">
              {list.map((e) => (
                <Link
                  key={e.slug}
                  href={`/leverantorer/${e.slug}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <span className={e.group === "exited" ? "text-[var(--text-dim)]" : ""}>{e.name}</span>
                  <span className="text-xs text-[var(--text-dim)] tabular-nums">
                    {e.areas} {e.areas === 1 ? "område" : "områden"}
                    {e.bestRating !== null && ` · bästa betyg ${e.bestRating}`}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-sm text-[var(--text-dim)]">Ingen leverantör matchar &quot;{query}&quot;.</p>
      )}
    </div>
  );
}
