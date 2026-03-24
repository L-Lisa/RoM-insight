import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { tooltips } from "@/lib/tooltips";

async function getAreaSummary() {
  const { data: dateRow } = await supabase
    .from("rom_results")
    .select("dataset_date")
    .order("dataset_date", { ascending: false })
    .limit(1)
    .single();

  const latestDate = dateRow?.dataset_date ?? null;
  if (!latestDate) return [];

  const { data } = await supabase
    .from("rom_results")
    .select("delivery_area, weighted_score, risk_of_termination, participants")
    .eq("dataset_date", latestDate);

  if (!data) return [];

  const latest = data;

  // Group by delivery area
  const areas = new Map<string, {
    count: number;
    totalWeightedScore: number;
    atRisk: number;
    totalParticipants: number;
  }>();

  for (const row of latest) {
    const existing = areas.get(row.delivery_area) ?? {
      count: 0,
      totalWeightedScore: 0,
      atRisk: 0,
      totalParticipants: 0,
    };
    areas.set(row.delivery_area, {
      count: existing.count + 1,
      totalWeightedScore: existing.totalWeightedScore + (row.weighted_score ?? 0),
      atRisk: existing.atRisk + (row.risk_of_termination ? 1 : 0),
      totalParticipants: existing.totalParticipants + (row.participants ?? 0),
    });
  }

  return Array.from(areas.entries())
    .map(([area, stats]) => ({
      area,
      avgWeightedScore: stats.totalWeightedScore / stats.count,
      supplierCount: stats.count,
      atRisk: stats.atRisk,
      totalParticipants: stats.totalParticipants,
    }))
    .sort((a, b) => b.avgWeightedScore - a.avgWeightedScore);
}

export default async function LeveransområdenPage() {
  const areas = await getAreaSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Leveransområden</h1>
        <p className="text-sm text-gray-500 mt-1">
          {areas.length} leveransområden · Källa: Arbetsförmedlingen
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left"><Tooltip label="Leveransområde" text={tooltips.leveransomrade} /></th>
              <th className="px-4 py-3 text-right">Leverantörer</th>
              <th className="px-4 py-3 text-right">Snitt viktat resultat</th>
              <th className="px-4 py-3 text-right">Deltagare</th>
              <th className="px-4 py-3 text-center"><Tooltip label="Riskerar hävning" text={tooltips.riskHavning} /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {areas.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/leveransomraden/${encodeURIComponent(row.area)}`}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {row.area}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{row.supplierCount}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.avgWeightedScore.toFixed(3)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{row.totalParticipants}</td>
                <td className="px-4 py-3 text-center">
                  {row.atRisk > 0 ? (
                    <span className="inline-block bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {row.atRisk}
                    </span>
                  ) : (
                    <span className="text-gray-300">–</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
