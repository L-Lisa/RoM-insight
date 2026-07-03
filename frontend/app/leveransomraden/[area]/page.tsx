import { notFound } from "next/navigation";
import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { explain } from "@/lib/tooltips";
import { RatingBadge, RiskBadge } from "@/components/Badges";
import { DataStamp } from "@/components/DataStamp";
import { getAreaRows, getLatestPeriod } from "@/lib/queries";
import { formatScore, periodLabel, slugify } from "@/lib/format";

export const revalidate = 3600;

interface Props {
  params: Promise<{ area: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { area } = await params;
  const name = decodeURIComponent(area);
  return {
    title: `Rusta och matcha i ${name} — leverantörer och betyg`,
    description: `Alla Rusta och matcha-leverantörer i ${name}: betyg, viktat resultat och riskläge. Data: Arbetsförmedlingen.`,
  };
}

export default async function AreaPage({ params }: Props) {
  const { area: encoded } = await params;
  const areaName = decodeURIComponent(encoded);
  const latest = await getLatestPeriod();
  if (!latest) notFound();

  const rows = await getAreaRows(latest, areaName);
  if (!rows.length) notFound();

  const top5Keys = new Set(rows.slice(0, 5).map((r) => r.id));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leveransomraden" className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]">
          ← Alla områden
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">Rusta och matcha i {areaName}</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          {rows.length} avtal · {periodLabel(latest)} · sorterade på viktat resultat
        </p>
        <div className="mt-2"><DataStamp period={latest} /></div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr className="border-b border-[var(--line)]">
              <th className="mono-label px-4 py-3 font-normal">#</th>
              <th className="mono-label px-4 py-3 font-normal">Leverantör</th>
              <th className="mono-label px-4 py-3 font-normal text-right"><Tooltip label="Viktat" layers={explain.viktatResultat} /></th>
              <th className="mono-label px-4 py-3 font-normal text-right"><Tooltip label="Betyg" layers={explain.betyg} /></th>
              <th className="mono-label px-4 py-3 font-normal text-right">Deltagare</th>
              <th className="mono-label px-4 py-3 font-normal text-center"><Tooltip label="Risk" layers={explain.riskflagga} /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line-soft)]">
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`hover:bg-[var(--bg-hover)] transition-colors ${top5Keys.has(row.id) ? "" : "opacity-80"}`}
              >
                <td className="px-4 py-3 text-[var(--text-faint)] tabular-nums">{i + 1}</td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/leverantorer/${slugify(row.supplier)}`} className="hover:text-[var(--compare-1)]">
                    {row.supplier}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatScore(row.weighted_score)}</td>
                <td className="px-4 py-3 text-right"><RatingBadge rating={row.rating} /></td>
                <td className="px-4 py-3 text-right tabular-nums">{row.participants}</td>
                <td className="px-4 py-3 text-center"><RiskBadge risk={row.risk_of_termination} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--text-dim)] max-w-2xl">
        Ett resultat i {areaName} är inte automatiskt jämförbart med samma siffra i ett annat område — AF:s viktning
        justerar för deltagarnas nivå, inte för den lokala arbetsmarknaden. Läs mer på{" "}
        <Link href="/metod" className="link">metodsidan</Link>.
      </p>
    </div>
  );
}
