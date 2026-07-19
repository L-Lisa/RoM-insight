"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatScore, isRankable, slugify } from "@/lib/format";
import { CompareButton } from "@/components/CompareButton";

/**
 * C3: hela marknaden, sorterbar. Klientkomponent — datan kommer från servern.
 */

export interface MarketRow {
  supplier: string;
  delivery_area: string;
  weighted_score: number | null;
  rating: number | null;
  participants: number;
  /** Antal RR1 — första godkända resultatet (arbete eller studier). Hålls alltid isär från RR2. */
  results: number;
  /** Antal RR2 — godkänd uppföljningsredovisning, senare i tid. Aldrig hopslagen med RR1. */
  rr2: number;
  /** RR2/RR1 i procent — RoM Insights beräkning; null om RR1 = 0 */
  sustainability: number | null;
}

type SortKey = "supplier" | "delivery_area" | "weighted_score" | "rating" | "participants" | "results" | "rr2" | "sustainability";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "supplier", label: "Leverantör", numeric: false },
  { key: "delivery_area", label: "Område", numeric: false },
  { key: "weighted_score", label: "Viktat", numeric: true },
  { key: "rating", label: "Betyg", numeric: true },
  { key: "participants", label: "Deltagare", numeric: true },
  { key: "results", label: "RR1", numeric: true },
  { key: "rr2", label: "RR2", numeric: true },
  { key: "sustainability", label: "Hållbarhet", numeric: true },
];

/** Vid sortering på viktat resultat sorteras avtal utan betyg alltid sist —
 *  under AF:s betygsvillkor är måttet inte jämförbart (för små nämnare). */
const RATED_FIRST_KEYS: SortKey[] = ["weighted_score"];

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
      if (RATED_FIRST_KEYS.includes(sortKey)) {
        const aRated = isRankable(a) ? 0 : 1;
        const bRated = isRankable(b) ? 0 : 1;
        if (aRated !== bRated) return aRated - bRated;
      }
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
              <th className="mono-label px-2 py-3 font-normal text-center" aria-label="Jämför" />
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
                <td className="px-4 py-2.5 text-right tabular-nums">{r.rr2}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-dim)]">
                  {r.sustainability === null ? "–" : `${r.sustainability} %`}
                </td>
                <td className="px-2 py-2.5 text-center"><CompareButton supplier={r.supplier} area={r.delivery_area} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--text-dim)]">
        {sorted.length} avtal visas. Vid sortering på viktat resultat hamnar avtal utan betyg sist —
        under AF:s betygsvillkor (minst 18 deltagare, 12 månaders verksamhet) är måttet inte jämförbart.
      </p>
    </div>
  );
}
