"use client";

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
import { periodShort } from "@/lib/format";

/**
 * Få-punkters-ärlighet (kravprofil §4d): AF-serien har max ~9 punkter.
 * Monotone-interpolation + SYNLIGA punktmarkörer på valda linjer — kurvan får
 * aldrig antyda data mellan mätpunkterna. connectNulls är AV: luckor är data.
 */

interface TrendPoint {
  dataset_date: string;
  weighted_score: number | null;
  result_rate: number | null;
  rating: number | null;
}

const AXIS_TICK = { fontSize: 11, fill: "var(--text-dim)" };

export function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.filter((d) => d.weighted_score !== null || d.rating !== null).length < 2) {
    return (
      <p className="text-sm text-[var(--text-dim)] italic py-4">
        Trend kräver minst två mätperioder — visas när nästa AF-släpp är inne.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    period: periodShort(d.dataset_date),
    "Viktat resultat": d.weighted_score ?? null,
    Betyg: d.rating ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
        <XAxis dataKey="period" tick={AXIS_TICK} stroke="var(--line)" />
        <YAxis
          yAxisId="score"
          domain={[0, 0.6]}
          tick={AXIS_TICK}
          stroke="var(--line)"
          tickFormatter={(v: number) => v.toFixed(1).replace(".", ",")}
        />
        <YAxis
          yAxisId="rating"
          orientation="right"
          domain={[0, 4]}
          ticks={[1, 2, 3, 4]}
          tick={AXIS_TICK}
          stroke="var(--line)"
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-raised)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            color: "var(--text)",
            fontSize: 12,
          }}
          formatter={(value, name) =>
            name === "Viktat resultat" && typeof value === "number" ? [value.toFixed(3).replace(".", ","), name] : [value, name]
          }
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-dim)" }} />
        <Line
          yAxisId="score"
          type="monotone"
          dataKey="Viktat resultat"
          stroke="var(--compare-1)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--compare-1)", strokeWidth: 0 }}
        />
        <Line
          yAxisId="rating"
          type="stepAfter"
          dataKey="Betyg"
          stroke="var(--compare-3)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--compare-3)", strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
