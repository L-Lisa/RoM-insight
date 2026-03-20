import { supabase } from "@/lib/supabase";
import { RomResult } from "@/lib/types";
import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { tooltips } from "@/lib/tooltips";

async function getOverviewData() {
  // Resolve latest dataset_date from production table — no string manipulation
  const { data: dateRow } = await supabase
    .from("rom_results")
    .select("dataset_date")
    .order("dataset_date", { ascending: false })
    .limit(1)
    .single();

  const latestDate = dateRow?.dataset_date ?? null;

  if (!latestDate) {
    return {
      latestDate: null,
      topSuppliers: [],
      totalSuppliers: 0,
      atRisk: 0,
      totalAreas: 0,
    };
  }

  const [
    { data: topSuppliers },
    { count: totalSuppliers },
    { count: atRisk },
    { data: areaRows },
  ] = await Promise.all([
    supabase
      .from("rom_results")
      .select("supplier, weighted_score, rating, risk_of_termination, delivery_area")
      .eq("dataset_date", latestDate)
      .order("weighted_score", { ascending: false })
      .limit(10),
    supabase
      .from("rom_results")
      .select("*", { count: "exact", head: true })
      .eq("dataset_date", latestDate),
    supabase
      .from("rom_results")
      .select("*", { count: "exact", head: true })
      .eq("dataset_date", latestDate)
      .eq("risk_of_termination", true),
    supabase
      .from("rom_results")
      .select("delivery_area")
      .eq("dataset_date", latestDate),
  ]);

  const totalAreas = new Set(areaRows?.map((r) => r.delivery_area)).size;

  return {
    latestDate,
    topSuppliers: topSuppliers ?? [],
    totalSuppliers: totalSuppliers ?? 0,
    atRisk: atRisk ?? 0,
    totalAreas,
  };
}

export default async function OverviewPage() {
  const { latestDate, topSuppliers, totalSuppliers, atRisk, totalAreas } =
    await getOverviewData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Marknadsöversikt</h1>
        <p className="text-sm text-gray-500 mt-1">
          Senaste mätperiod: {latestDate ?? "–"} · Källa: Arbetsförmedlingen
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Leverantörsavtal" value={String(totalSuppliers)} />
        <StatCard label="Leveransområden" value={String(totalAreas)} />
        <StatCard
          label="Riskerar hävning"
          value={String(atRisk)}
          highlight={atRisk > 0}
        />
        <StatCard label="Mätperiod" value={latestDate ?? "–"} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Topplista – Sverige</h2>
          <Link
            href="/leverantorer"
            className="text-sm text-blue-600 hover:underline"
          >
            Visa alla →
          </Link>
        </div>
        <LeaderboardTable rows={topSuppliers} />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p
        className={`text-2xl font-semibold mt-1 ${
          highlight ? "text-red-600" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function LeaderboardTable({ rows }: { rows: Partial<RomResult>[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left">#</th>
            <th className="px-4 py-3 text-left">Leverantör</th>
            <th className="px-4 py-3 text-left">
              <Tooltip label="Leveransområde" text={tooltips.leveransomrade} />
            </th>
            <th className="px-4 py-3 text-right">
              <Tooltip label="Viktat resultat" text={tooltips.viktatResultat} />
            </th>
            <th className="px-4 py-3 text-right">
              <Tooltip label="Betyg" text={tooltips.betyg} />
            </th>
            <th className="px-4 py-3 text-center">
              <Tooltip label="Riskerar hävning" text={tooltips.riskHavning} />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-400">{i + 1}</td>
              <td className="px-4 py-3 font-medium">
                <Link
                  href={`/leverantorer/${encodeURIComponent(row.supplier ?? "")}`}
                  className="hover:text-blue-600 hover:underline"
                >
                  {row.supplier}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-600">{row.delivery_area}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {row.weighted_score?.toFixed(3) ?? "–"}
              </td>
              <td className="px-4 py-3 text-right">
                {row.rating ?? <span className="text-gray-400">–</span>}
              </td>
              <td className="px-4 py-3 text-center">
                {row.risk_of_termination ? (
                  <span className="inline-block bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    Ja
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
  );
}
