"use client";

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { periodShort } from "@/lib/format";

export function MarketChart({
  series,
}: {
  series: { period: string; contracts: number; participants: number }[];
}) {
  const data = series.map((s) => ({
    period: periodShort(s.period),
    "Aktiva avtal": s.contracts,
    "Deltagare (11–22 mån)": s.participants,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--text-dim)" }} stroke="var(--line)" />
        <YAxis yAxisId="contracts" tick={{ fontSize: 11, fill: "var(--text-dim)" }} stroke="var(--line)" domain={[0, 1000]} />
        <YAxis
          yAxisId="participants"
          orientation="right"
          tick={{ fontSize: 11, fill: "var(--text-dim)" }}
          stroke="var(--line)"
          tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
        />
        <Tooltip
          contentStyle={{ background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--text)", fontSize: 12 }}
          formatter={(value, name) =>
            name === "Deltagare (11–22 mån)" && typeof value === "number" ? [value.toLocaleString("sv-SE"), name] : [value, name]
          }
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-dim)" }} />
        <Bar yAxisId="participants" dataKey="Deltagare (11–22 mån)" fill="rgba(124,150,245,0.16)" radius={[3, 3, 0, 0]} />
        <Line
          yAxisId="contracts"
          type="monotone"
          dataKey="Aktiva avtal"
          stroke="var(--compare-1)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--compare-1)", strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
