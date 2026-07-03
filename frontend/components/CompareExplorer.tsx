"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { periodShort } from "@/lib/format";

/**
 * K2/K8: fri jämförelse av avtal (leverantör × område), max 6 markerade.
 * Färglösning per kravprofilen: 5 dämpade blå-lila + EN reserverad signalfärg
 * för den senast tillagda ("din leverantör") — grupp + hjälte, inte regnbåge.
 * Jämförelsen sker per AVTAL — aldrig hopslagna/beräknade leverantörssnitt.
 */

const GROUP_COLORS = ["var(--compare-1)", "var(--compare-2)", "var(--compare-3)", "var(--compare-4)", "var(--compare-5)"];
const MAX_SELECTED = 6;

export interface ContractOption {
  key: string; // "supplier|area"
  supplier: string;
  delivery_area: string;
}

interface SeriesRow {
  supplier: string;
  delivery_area: string;
  dataset_date: string;
  weighted_score: number | null;
}

export function CompareExplorer({
  options,
  periods,
  initialKeys,
}: {
  options: ContractOption[];
  periods: string[];
  initialKeys: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialKeys.slice(0, MAX_SELECTED));
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<SeriesRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!selected.length) {
        setRows([]);
        return;
      }
      setLoading(true);
      const parts = selected.map((k) => {
        const [supplier, area] = k.split("|");
        return { supplier, area };
      });
      const results: SeriesRow[] = [];
      // Ett anrop per valt avtal (max 6 × ≤9 rader) — filtrerat i databasen
      await Promise.all(
        parts.map(async ({ supplier, area }) => {
          const { data } = await supabase
            .from("rom_results")
            .select("supplier, delivery_area, dataset_date, weighted_score")
            .eq("supplier", supplier)
            .eq("delivery_area", area)
            .order("dataset_date", { ascending: true });
          if (data) results.push(...(data as SeriesRow[]));
        }),
      );
      if (!cancelled) {
        setRows(results);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return options
      .filter((o) => !selected.includes(o.key) && (o.supplier.toLowerCase().includes(q) || o.delivery_area.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [query, options, selected]);

  const chartData = useMemo(() => {
    return periods.map((p) => {
      const point: Record<string, string | number | null> = { period: periodShort(p) };
      for (const key of selected) {
        const [supplier, area] = key.split("|");
        const row = rows.find((r) => r.supplier === supplier && r.delivery_area === area && r.dataset_date === p);
        point[`${supplier} — ${area}`] = row?.weighted_score ?? null;
      }
      return point;
    });
  }, [periods, rows, selected]);

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
          placeholder={selected.length >= MAX_SELECTED ? `Max ${MAX_SELECTED} avtal — ta bort ett först` : "Lägg till avtal: sök leverantör eller område…"}
          disabled={selected.length >= MAX_SELECTED}
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none border border-[var(--line)] bg-[var(--bg-raised)] placeholder:text-[var(--text-faint)] focus:border-[var(--compare-1)] disabled:opacity-50"
          aria-label="Sök avtal att jämföra"
        />
        {matches.length > 0 && (
          <ul className="absolute z-40 mt-1 w-full card divide-y divide-[var(--line-soft)] overflow-hidden">
            {matches.map((o) => (
              <li key={o.key}>
                <button
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--bg-hover)]"
                  onClick={() => {
                    setSelected([...selected, o.key]);
                    setQuery("");
                  }}
                >
                  {o.supplier} <span className="text-[var(--text-dim)]">— {o.delivery_area}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-4">
        {loading && <p className="text-sm text-[var(--text-dim)] py-8 text-center">Hämtar serier…</p>}
        {!loading && selected.length === 0 && (
          <p className="text-sm text-[var(--text-dim)] py-8 text-center">Välj avtal ovan för att jämföra.</p>
        )}
        {!loading && selected.length > 0 && (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--text-dim)" }} stroke="var(--line)" />
              <YAxis
                domain={[0, 0.6]}
                tick={{ fontSize: 11, fill: "var(--text-dim)" }}
                stroke="var(--line)"
                tickFormatter={(v: number) => v.toFixed(1).replace(".", ",")}
              />
              <Tooltip
                contentStyle={{ background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--text)", fontSize: 12 }}
                formatter={(value) => (typeof value === "number" ? value.toFixed(3).replace(".", ",") : String(value ?? "–"))}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-dim)" }} />
              {selected.map((key, i) => {
                const [supplier, area] = key.split("|");
                const color = i === selected.length - 1 ? "var(--signal)" : GROUP_COLORS[i % GROUP_COLORS.length];
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={`${supplier} — ${area}`}
                    stroke={color}
                    strokeWidth={i === selected.length - 1 ? 2.5 : 2}
                    dot={{ r: 4, fill: color, strokeWidth: 0 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
        <p className="data-stamp mt-2">Viktat resultatmått per avtal och period. Punkterna är AF:s faktiska mätningar — linjen däremellan är bara läshjälp.</p>
      </div>
    </div>
  );
}
