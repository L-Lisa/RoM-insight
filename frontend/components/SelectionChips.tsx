"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CloudSeries } from "@/lib/types";
import { contractKey, MAX_COMPARE } from "@/lib/compare";
import { slugify } from "@/lib/format";

/**
 * Delad chip-rad för valda avtal (startsidan + /jamfor) med samma
 * positionsbaserade färgformel som konstellationens linjer: sista valda
 * får signalfärgen, övriga GROUP_COLORS efter position.
 */

export const GROUP_COLORS = [
  "var(--compare-1)",
  "var(--compare-2)",
  "var(--compare-3)",
  "var(--compare-4)",
  "var(--compare-5)",
  "var(--compare-6)",
  "var(--compare-7)",
  "var(--compare-8)",
];

export function selectionColor(idx: number, count: number): string {
  return idx === count - 1 ? "var(--signal)" : GROUP_COLORS[idx % GROUP_COLORS.length];
}

/** Senaste icke-tomma värdet i en serie — används för "högst resultat först". */
export function lastValue(values: (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== null) return values[i];
  }
  return null;
}

/** Samma regel som ConstellationClouds segments(): en linje kräver två
 *  mätpunkter i intilliggande perioder — annars ritas bara punkter. */
export function hasDrawableLine(values: (number | null)[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== null && values[i - 1] !== null) return true;
  }
  return false;
}

/** Spotlight: en leverantörs avtal, högst resultat först, upp till taket.
 *  Delas mellan startsidan och /jamfor så urvalet aldrig kan divergera. */
export function spotlightSelection(series: CloudSeries[]): { keys: string[]; total: number } {
  const keys = [...series]
    .sort((a, b) => (lastValue(b.values) ?? 0) - (lastValue(a.values) ?? 0))
    .slice(0, MAX_COMPARE)
    .map((s) => contractKey(s.supplier, s.delivery_area));
  return { keys, total: series.length };
}

/** Trunkeringsraden under chipsen när en spotlight visar färre än alla avtal. */
export function SpotlightNote({ supplier, total, shown }: { supplier: string; total: number; shown: number }) {
  return (
    <p className="text-xs text-[var(--text-dim)]">
      Visar {shown} av {total} avtal — högst resultat först. Alla avtal finns i tabellen på{" "}
      <Link href={`/leverantorer/${slugify(supplier)}`} className="link">
        profilsidan →
      </Link>
    </p>
  );
}

export function SelectionChips({
  selected,
  onRemove,
  cloud,
}: {
  selected: string[];
  onRemove: (key: string) => void;
  cloud: CloudSeries[] | null;
}) {
  const byKey = useMemo(
    () => new Map((cloud ?? []).map((s) => [contractKey(s.supplier, s.delivery_area), s])),
    [cloud],
  );
  if (selected.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {selected.map((key, i) => {
        const [supplier, area] = key.split("|");
        const color = selectionColor(i, selected.length);
        const series = byKey.get(key);
        const points = series ? series.values.filter((v) => v !== null).length : 0;
        const noLine = series !== undefined && !hasDrawableLine(series.values);
        return (
          <button
            key={key}
            onClick={() => onRemove(key)}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-colors hover:bg-[var(--bg-hover)]"
            style={{ borderColor: color, color: "var(--text)" }}
            title="Klicka för att ta bort"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            {supplier} — {area}
            {noLine && (
              <span className="text-[var(--text-dim)]">
                · {points} {points === 1 ? "mätpunkt" : "mätpunkter"}, ingen linje än
              </span>
            )}
            <span className="text-[var(--text-faint)]">×</span>
          </button>
        );
      })}
    </div>
  );
}
