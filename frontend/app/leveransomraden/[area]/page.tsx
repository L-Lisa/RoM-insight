import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { tooltips } from "@/lib/tooltips";

interface Props {
  params: Promise<{ area: string }>;
}

async function getAreaData(areaName: string) {
  const { data } = await supabase
    .from("rom_results")
    .select("*")
    .eq("delivery_area", areaName)
    .order("dataset_date", { ascending: false });
  return data ?? [];
}

export default async function AreaPage({ params }: Props) {
  const { area: encodedArea } = await params;
  const areaName = decodeURIComponent(encodedArea);
  const rows = await getAreaData(areaName);

  if (rows.length === 0) notFound();

  const latestDate = rows[0].dataset_date;
  const latest = rows.filter((r) => r.dataset_date === latestDate);
  latest.sort((a, b) => (b.weighted_score ?? 0) - (a.weighted_score ?? 0));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/leveransomraden" className="text-sm text-gray-500 hover:text-gray-700">
          ← Tillbaka till leveransområden
        </Link>
        <h1 className="text-2xl font-semibold mt-2">{areaName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {latest.length} leverantörsavtal · Period: {latestDate} · Källa: Arbetsförmedlingen
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Snitt viktat resultat"
          value={(
            latest.reduce((sum, r) => sum + (r.weighted_score ?? 0), 0) / latest.length
          ).toFixed(3)}
        />
        <MetricCard
          label="Totalt deltagare"
          value={String(latest.reduce((sum, r) => sum + (r.participants ?? 0), 0))}
        />
        <MetricCard
          label="Riskerar hävning"
          value={String(latest.filter((r) => r.risk_of_termination).length)}
          highlight={latest.some((r) => r.risk_of_termination)}
        />
      </div>

      {/* Leaderboard for this area */}
      <section>
        <h2 className="text-lg font-medium mb-3">Leverantörer i {areaName}</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Leverantör</th>
                <th className="px-4 py-3 text-right"><Tooltip label="Viktat resultat" text={tooltips.viktatResultat} /></th>
                <th className="px-4 py-3 text-right"><Tooltip label="Resultattakt" text={tooltips.resultattakt} /></th>
                <th className="px-4 py-3 text-right"><Tooltip label="Betyg" text={tooltips.betyg} /></th>
                <th className="px-4 py-3 text-right">Deltagare</th>
                <th className="px-4 py-3 text-center"><Tooltip label="Riskerar hävning" text={tooltips.riskHavning} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {latest.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/leverantorer/${encodeURIComponent(row.supplier)}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {row.supplier}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.weighted_score?.toFixed(3) ?? "–"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.result_rate != null
                      ? `${(row.result_rate * 100).toFixed(1)}%`
                      : "–"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.rating ?? <span className="text-gray-400">–</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.participants}</td>
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
      </section>
    </div>
  );
}

function MetricCard({
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
      <p className={`text-2xl font-semibold mt-1 ${highlight ? "text-red-600" : ""}`}>
        {value}
      </p>
    </div>
  );
}
