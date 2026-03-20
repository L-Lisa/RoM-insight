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

interface TrendPoint {
  dataset_date: string;
  weighted_score: number | null;
  result_rate: number | null;
  rating: number | null;
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-gray-400 italic py-4">
        Trenddata kräver minst två mätperioder.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    period: d.dataset_date,
    "Viktat resultat": d.weighted_score ?? null,
    "Resultattakt (%)":
      d.result_rate != null
        ? Math.round(d.result_rate * 1000) / 10
        : null,
    Betyg: d.rating ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart
        data={chartData}
        margin={{ top: 4, right: 24, bottom: 4, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
        <YAxis
          yAxisId="score"
          domain={[0, 1]}
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => v.toFixed(1)}
        />
        <YAxis
          yAxisId="pct"
          orientation="right"
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(value, name) => {
            if (name === "Resultattakt (%)") return [`${value}%`, name];
            return [value, name];
          }}
        />
        <Legend />
        <Line
          yAxisId="score"
          type="monotone"
          dataKey="Viktat resultat"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="Resultattakt (%)"
          stroke="#16a34a"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
        <Line
          yAxisId="score"
          type="monotone"
          dataKey="Betyg"
          stroke="#d97706"
          strokeWidth={2}
          dot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
