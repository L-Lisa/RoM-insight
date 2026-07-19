import { notFound } from "next/navigation";
import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { explain } from "@/lib/tooltips";
import { RatingBadge, RiskBadge } from "@/components/Badges";
import { CompareButton } from "@/components/CompareButton";
import { DataStamp } from "@/components/DataStamp";
import { getAreaMunicipalities, getAreaRows, getLatestPeriod } from "@/lib/queries";
import { formatScore, isRankable, periodLabel, slugify } from "@/lib/format";

export const revalidate = 3600;

interface Props {
  params: Promise<{ area: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { area } = await params;
  const name = decodeURIComponent(area);
  const og = `/og?${new URLSearchParams({ title: `Rusta och matcha i ${name}`, sub: "Leverantörer, betyg och viktade resultat i området" })}`;
  return {
    title: `Rusta och matcha i ${name} — leverantörer och betyg`,
    description: `Alla Rusta och matcha-leverantörer i ${name}: betyg, viktat resultat och riskläge. Data: Arbetsförmedlingen.`,
    openGraph: { title: `Rusta och matcha i ${name}`, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function AreaPage({ params }: Props) {
  const { area: encoded } = await params;
  const areaName = decodeURIComponent(encoded);
  const latest = await getLatestPeriod();
  if (!latest) notFound();

  const [areaRows, municipalities] = await Promise.all([
    getAreaRows(latest, areaName),
    getAreaMunicipalities(areaName),
  ]);
  if (!areaRows.length) notFound();

  // Endast betygsatta avtal rankas (#) — avtal utan betyg listas sist, orankade:
  // under AF:s betygsvillkor är viktat resultat inte jämförbart (betygsregeln).
  const rated = areaRows.filter(isRankable);
  const unrated = areaRows.filter((r) => !isRankable(r));
  const rows = [...rated, ...unrated];

  const top5Keys = new Set(rated.slice(0, 5).map((r) => r.id));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leveransomraden" className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]">
          ← Alla områden
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">Rusta och matcha i {areaName}</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          {rows.length} avtal · {periodLabel(latest)}
          {rated.length > 0
            ? ` · betygsatta avtal rankade på viktat resultat${unrated.length > 0 ? ` · ${unrated.length} avtal utan betyg listas sist, orankade` : ""}`
            : " · inga avtal har betyg ännu — inget rankas"}
        </p>
        {municipalities.length > 0 && (
          <p className="text-xs text-[var(--text-dim)] mt-1 max-w-3xl">
            Omfattar kommunerna: {municipalities.join(", ")} <span className="text-[var(--text-faint)]">(AF:s leveransområdesindelning)</span>
          </p>
        )}
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
              <th className="mono-label px-2 py-3 font-normal text-center" aria-label="Jämför" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line-soft)]">
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={`hover:bg-[var(--bg-hover)] transition-colors ${rated.length === 0 || top5Keys.has(row.id) ? "" : "opacity-80"}`}
              >
                <td className="px-4 py-3 text-[var(--text-faint)] tabular-nums">{row.rating !== null && row.weighted_score !== null ? i + 1 : "–"}</td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/leverantorer/${slugify(row.supplier)}`} className="hover:text-[var(--compare-1)]">
                    {row.supplier}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatScore(row.weighted_score)}</td>
                <td className="px-4 py-3 text-right"><RatingBadge rating={row.rating} /></td>
                <td className="px-4 py-3 text-right tabular-nums">{row.participants}</td>
                <td className="px-4 py-3 text-center"><RiskBadge risk={row.risk_of_termination} /></td>
                <td className="px-2 py-3 text-center"><CompareButton supplier={row.supplier} area={row.delivery_area} /></td>
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
