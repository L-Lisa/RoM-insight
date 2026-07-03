"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatScore, slugify } from "@/lib/format";

/**
 * C3: hela marknaden, sorterbar. Klientkomponent — datan kommer från servern.
 */

export interface MarketRow {
  supplier: string;
  delivery_area: string;
  weighted_score: number | null;
  rating: number | null;
  participants: number;
  results: number;
}

type SortKey = "supplier" | "delivery_area" | "weighted_score" | "rating" | "participants" | "results";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "supplier", label: "Leverantör", numeric: false },
  { key: "delivery_area", label: "Område", numeric: false },
  { key: "weighted_score", label: "Viktat", numeric: true },
  { key: "rating", label: "Betyg", numeric: true },
  { key: "participants", label: "Deltagare", numeric: true },
  { key: "results", label: "Resultat", numeric: true },
];

export function MarketTable({ rows }: { rows: MarketRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("weighted_score");
  const [desc, setDesc] = useState(true);
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => r.supplier.toLowerCase().includes(q) || r.delivery_area.toLowerCase().includes(q))
      : rows;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "sv");
      return desc ? -cmp : cmp;
    });
  }, [rows, sortKey, desc, query]);

  function toggle(key: SortKey, numeric: boolean) {
    if (key === sortKey) setDesc(!desc);
    else {
      setSortKey(key);
      setDesc(numeric);
    }
  }

  return (
    <div className="space-y-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filtrera på leverantör eller område…"
        className="w-full max-w-md rounded-lg px-4 py-2.5 text-sm outline-none border border-[var(--line)] bg-[var(--bg-raised)] placeholder:text-[var(--text-faint)] focus:border-[var(--compare-1)]"
        aria-label="Filtrera marknadstabellen"
      />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="text-left">
            <tr className="border-b border-[var(--line)]">
              {COLUMNS.map((c) => (
                <th key={c.key} className={`mono-label px-4 py-3 font-normal ${c.numeric ? "text-right" : ""}`}>
                  <button
                    onClick={() => toggle(c.key, c.numeric)}
                    className="hover:text-[var(--text)] inline-flex items-center gap-1"
                  >
                    {c.label}
                    {sortKey === c.key && <span aria-hidden>{desc ? "↓" : "↑"}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line-soft)]">
            {sorted.map((r) => (
              <tr key={`${r.supplier}|${r.delivery_area}`} className="hover:bg-[var(--bg-hover)] transition-colors">
                <td className="px-4 py-2.5 font-medium">
                  <Link href={`/leverantorer/${slugify(r.supplier)}`} className="hover:text-[var(--compare-1)]">
                    {r.supplier}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[var(--text-dim)]">{r.delivery_area}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatScore(r.weighted_score)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.rating ?? <span className="text-[var(--text-faint)]" title="Ej betygsatt ännu">·</span>}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.participants}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.results}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--text-dim)]">{sorted.length} avtal visas.</p>
    </div>
  );
}
