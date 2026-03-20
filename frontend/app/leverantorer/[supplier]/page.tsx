import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { tooltips } from "@/lib/tooltips";
import { TrendChart } from "@/components/TrendChart";

interface Props {
  params: Promise<{ supplier: string }>;
}

async function getSupplierData(supplierName: string) {
  const { data } = await supabase
    .from("rom_results")
    .select("*")
    .eq("supplier", supplierName)
    .order("dataset_date", { ascending: true });
  return data ?? [];
}

export default async function SupplierPage({ params }: Props) {
  const { supplier: encodedSupplier } = await params;
  const supplierName = decodeURIComponent(encodedSupplier);
  const rows = await getSupplierData(supplierName);

  if (rows.length === 0) notFound();

  const latest = rows[rows.length - 1];
  const history = rows;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/leverantorer" className="text-sm text-gray-500 hover:text-gray-700">
          ← Tillbaka till leverantörer
        </Link>
        <h1 className="text-2xl font-semibold mt-2">{supplierName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Leveransområde: {latest.delivery_area} · Senaste period: {latest.dataset_date} · Källa: Arbetsförmedlingen
        </p>
      </div>

      {/* Risk indicator */}
      {latest.risk_of_termination && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          <span className="font-medium">Riskindikator:</span> Denna leverantör riskerar hävning av avtalet
          enligt Arbetsförmedlingens officiella kriterier. Indikatorn är informativ och simulerar inte
          officiella beslut.
        </div>
      )}

      {/* Latest metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Viktat resultatmått" value={latest.weighted_score?.toFixed(3) ?? "–"} />
        <MetricCard
          label="Resultattakt"
          value={latest.result_rate != null ? `${(latest.result_rate * 100).toFixed(1)}%` : "–"}
        />
        <MetricCard label="Betyg" value={latest.rating != null ? String(latest.rating) : "Saknas"} />
        <MetricCard label="Deltagare" value={String(latest.participants ?? "–")} />
      </div>

      {/* Trend chart */}
      <section>
        <h2 className="text-lg font-medium mb-3">Trend</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <TrendChart data={history} />
        </div>
      </section>

      {/* Historical table */}
      {history.length > 1 && (
        <section>
          <h2 className="text-lg font-medium mb-3">Historik</h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-right"><Tooltip label="Viktat resultat" text={tooltips.viktatResultat} /></th>
                  <th className="px-4 py-3 text-right"><Tooltip label="Resultattakt" text={tooltips.resultattakt} /></th>
                  <th className="px-4 py-3 text-right"><Tooltip label="Betyg" text={tooltips.betyg} /></th>
                  <th className="px-4 py-3 text-right">Deltagare</th>
                  <th className="px-4 py-3 text-center"><Tooltip label="Riskerar hävning" text={tooltips.riskHavning} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...history].reverse().map((row, i) => (
                  <tr key={i} className={i === 0 ? "bg-blue-50" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3 tabular-nums">
                      {row.dataset_date}
                      {i === 0 && (
                        <span className="ml-2 text-xs text-blue-600 font-medium">Senaste</span>
                      )}
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
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
