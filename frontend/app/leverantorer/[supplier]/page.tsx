import { notFound } from "next/navigation";
import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { explain } from "@/lib/tooltips";
import { TrendChart } from "@/components/TrendChart";
import { PercentileBar } from "@/components/PercentileBar";
import { RatingBadge, RiskBadge, DirectionArrow } from "@/components/Badges";
import { DataStamp } from "@/components/DataStamp";
import { WhatIsNeeded } from "@/components/WhatIsNeeded";
import {
  getLatestPeriod,
  getPeriodRows,
  getPeriodWeights,
  getSupplierBySlug,
  getSupplierRatingHistory,
  getSupplierResults,
  getSuppliers,
  percentileOf,
} from "@/lib/queries";
import { contractInsight } from "@/lib/insights";
import { formatScore, periodLabel, periodShort, slugify } from "@/lib/format";
import { RomResult } from "@/lib/types";

export const revalidate = 3600;

interface Props {
  params: Promise<{ supplier: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { supplier } = await params;
  const s = await resolveSupplier(supplier);
  if (!s) return { title: "Leverantör" };
  const og = `/og?${new URLSearchParams({ title: s, sub: "Betyg, viktat resultat och trend per leveransområde i Rusta och matcha" })}`;
  return {
    title: `${s} — betyg och resultat i Rusta och matcha`,
    description: `${s}: betyg, viktat resultatmått och trend per leveransområde i Rusta och matcha. Data: Arbetsförmedlingen.`,
    openGraph: { title: s, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
  };
}

async function resolveSupplier(param: string): Promise<string | null> {
  const decoded = decodeURIComponent(param);
  const bySlug = await getSupplierBySlug(decoded);
  if (bySlug) return bySlug.name;
  // Bakåtkompatibilitet: gamla länkar använde URL-kodat namn
  const suppliers = await getSuppliers();
  const byName = suppliers.find((s) => s.name === decoded || s.slug === slugify(decoded));
  return byName?.name ?? null;
}

export default async function SupplierPage({ params }: Props) {
  const { supplier: raw } = await params;
  const name = await resolveSupplier(raw);
  if (!name) notFound();

  const [rows, ratings, latestPeriod] = await Promise.all([
    getSupplierResults(name),
    getSupplierRatingHistory(name),
    getLatestPeriod(),
  ]);
  if (!rows.length) notFound();

  const latestAll = latestPeriod ? await getPeriodRows(latestPeriod) : [];
  const weights = latestPeriod ? await getPeriodWeights(latestPeriod) : null;
  const allScores = latestAll
    .map((r) => r.weighted_score)
    .filter((v): v is number => v !== null && v !== undefined);
  // C2: benchmark mot områdets snitt (RoM Insights beräkning, oviktat medel)
  const areaAvg = new Map<string, number>();
  {
    const acc = new Map<string, number[]>();
    for (const r of latestAll) {
      if (r.weighted_score !== null) acc.set(r.delivery_area, [...(acc.get(r.delivery_area) ?? []), r.weighted_score]);
    }
    for (const [a, v] of acc) areaAvg.set(a, v.reduce((x, y) => x + y, 0) / v.length);
  }

  const latestRows = rows.filter((r) => r.dataset_date === latestPeriod);
  const isExited = latestRows.length === 0;
  const lastSeen = rows[rows.length - 1].dataset_date;

  // Per avtal (område): serie + senaste värde
  const byArea = new Map<string, RomResult[]>();
  for (const r of rows) {
    byArea.set(r.delivery_area, [...(byArea.get(r.delivery_area) ?? []), r]);
  }
  const areas = Array.from(byArea.entries())
    .map(([area, series]) => ({
      area,
      series,
      latest: series[series.length - 1],
      insight: contractInsight(series),
    }))
    .sort((a, b) => (b.latest.weighted_score ?? 0) - (a.latest.weighted_score ?? 0));

  const biggest = [...areas].sort((a, b) => (b.latest.participants ?? 0) - (a.latest.participants ?? 0))[0];

  // Betygsmatris: område × period ur betygshistoriken
  const ratingPeriods = Array.from(new Set(ratings.map((r) => r.period))).sort();
  const ratingAreas = Array.from(new Set(ratings.map((r) => r.delivery_area))).sort();

  const compareKeys = areas.slice(0, 6).map((a) => `${name}|${a.area}`).join(",");

  return (
    <div className="space-y-8">
      <div>
        <Link href="/leverantorer" className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]">
          ← Alla leverantörer
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          {isExited && (
            <span className="text-xs px-2 py-1 rounded-[var(--radius-badge)]" style={{ background: "rgba(224,108,108,0.12)", color: "var(--terminated)", border: "1px solid rgba(224,108,108,0.35)" }}>
              Utgången ur statistiken — sista data {periodLabel(lastSeen)}
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          {isExited
            ? `Fanns i statistiken t.o.m. ${periodLabel(lastSeen)}. Varför avtalen lämnat statistiken framgår inte av Arbetsförmedlingens filer.`
            : `${latestRows.length} avtal i ${latestRows.length === 1 ? "ett" : latestRows.length} leveransområden · senaste mätning ${periodLabel(latestPeriod!)}`}
        </p>
        <div className="mt-2"><DataStamp period={isExited ? lastSeen : latestPeriod} /></div>
      </div>

      {!isExited && biggest?.insight.text && (
        <div className="card p-4 text-sm leading-relaxed">
          <span className="mono-label block mb-1">Läget just nu <DirectionArrow direction={biggest.insight.direction} /></span>
          {biggest.insight.text}
          <span className="block text-xs text-[var(--text-dim)] mt-2">
            Automatiskt formulerad ur AF:s siffror (största avtalet) — varje tal är spårbart till källfilen.
          </span>
        </div>
      )}

      <section>
        <h2 className="text-base font-medium mb-3">
          Avtal per leveransområde {latestPeriod && !isExited && <span className="text-[var(--text-dim)] font-normal">— {periodLabel(latestPeriod)}</span>}
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-left">
              <tr className="border-b border-[var(--line)]">
                <th className="mono-label px-4 py-3 font-normal"><Tooltip label="Område" layers={explain.leveransomrade} /></th>
                <th className="mono-label px-4 py-3 font-normal text-right"><Tooltip label="Viktat" layers={explain.viktatResultat} /></th>
                <th className="mono-label px-4 py-3 font-normal text-right"><Tooltip label="Percentil" layers={explain.percentil} /></th>
                <th className="mono-label px-4 py-3 font-normal text-right">Mot områdets snitt</th>
                <th className="mono-label px-4 py-3 font-normal text-right"><Tooltip label="Betyg" layers={explain.betyg} /></th>
                <th className="mono-label px-4 py-3 font-normal text-right">Deltagare</th>
                <th className="mono-label px-4 py-3 font-normal text-center"><Tooltip label="Risk" layers={explain.riskflagga} /></th>
                <th className="mono-label px-4 py-3 font-normal text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-soft)]">
              {areas.map(({ area, latest, insight }) => (
                <tr key={area} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-4 py-3">{area}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatScore(latest.weighted_score)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--text-dim)]">
                    {latest.dataset_date === latestPeriod && latest.weighted_score !== null
                      ? `${percentileOf(latest.weighted_score, allScores)} %`
                      : "–"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--text-dim)]">
                    {(() => {
                      const avg = areaAvg.get(area);
                      if (avg === undefined || latest.weighted_score === null || latest.dataset_date !== latestPeriod) return "–";
                      const rel = Math.round(((latest.weighted_score - avg) / avg) * 100);
                      return rel > 0 ? `+${rel} %` : `${rel} %`;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right"><RatingBadge rating={latest.rating} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{latest.participants}</td>
                  <td className="px-4 py-3 text-center"><RiskBadge risk={latest.risk_of_termination} /></td>
                  <td className="px-4 py-3 text-right"><DirectionArrow direction={insight.direction} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!isExited && latestPeriod && (
        <WhatIsNeeded contracts={latestRows} weights={weights} period={latestPeriod} />
      )}

      {!isExited && biggest && latestPeriod && biggest.latest.dataset_date === latestPeriod && biggest.latest.weighted_score !== null && (
        <section className="card p-5">
          <h2 className="text-base font-medium mb-3">
            Position i marknaden <span className="text-[var(--text-dim)] font-normal">— största avtalet ({biggest.area})</span>
          </h2>
          <PercentileBar
            value={biggest.latest.weighted_score}
            allScores={allScores}
            percentile={percentileOf(biggest.latest.weighted_score, allScores)}
          />
          <p className="text-xs text-[var(--text-dim)] mt-3">
            Viktat resultat {formatScore(biggest.latest.weighted_score)} · Percentilen är RoM Insights beräkning mot samtliga {allScores.length} avtal i perioden — inte ett AF-mått.
          </p>
        </section>
      )}

      <section className="relative">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base font-medium">
            Trend {biggest && <span className="text-[var(--text-dim)] font-normal">— {biggest.area}</span>}
          </h2>
          <Link href={`/jamfor?keys=${encodeURIComponent(compareKeys)}`} className="text-sm link">
            Jämför alla områden →
          </Link>
        </div>
        <div className="card p-4">
          <TrendChart data={biggest?.series ?? []} />
        </div>
      </section>

      {ratingPeriods.length > 0 && (
        <section>
          <h2 className="text-base font-medium mb-3">
            Betygshistorik <span className="text-[var(--text-dim)] font-normal">— {periodLabel(ratingPeriods[0])} till {periodLabel(ratingPeriods[ratingPeriods.length - 1])}</span>
          </h2>
          <div className="card overflow-x-auto relative">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="text-left">
                <tr className="border-b border-[var(--line)]">
                  <th className="mono-label px-4 py-3 font-normal">Område</th>
                  {ratingPeriods.map((p) => (
                    <th key={p} className="mono-label px-2 py-3 font-normal text-center">{periodShort(p)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line-soft)]">
                {ratingAreas.map((area) => (
                  <tr key={area}>
                    <td className="px-4 py-2.5">{area}</td>
                    {ratingPeriods.map((p) => {
                      const cell = ratings.find((r) => r.delivery_area === area && r.period === p);
                      return (
                        <td key={p} className="px-2 py-2.5 text-center tabular-nums">
                          {cell ? (cell.rating ?? <span className="text-[var(--text-faint)]" title="Ej betygsatt ännu">·</span>) : <span className="text-[var(--text-faint)]">–</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--text-dim)] mt-2">
            · = ej betygsatt ännu (under betygströskeln) · – = fanns inte i området den perioden
          </p>
        </section>
      )}
    </div>
  );
}
