import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { explain } from "@/lib/tooltips";
import { RatingBadge, RiskBadge } from "@/components/Badges";
import { ShowSource } from "@/components/ShowSource";
import { DataStamp } from "@/components/DataStamp";
import { MarketChart } from "@/components/MarketChart";
import {
  diffPeriods,
  getMarketSeries,
  getPeriodRows,
  getPeriods,
  getPeriodWeights,
  getTopContracts,
} from "@/lib/queries";
import { PeriodWeights } from "@/lib/types";
import { marketInsight } from "@/lib/insights";
import { formatScore, periodLabel, slugify } from "@/lib/format";
import { RomResult } from "@/lib/types";

export const revalidate = 3600;

export default async function OverviewPage() {
  const periods = await getPeriods();
  if (!periods.length) return <p>Ingen data laddad ännu.</p>;

  const latest = periods[periods.length - 1];
  const prev = periods.length > 1 ? periods[periods.length - 2] : null;

  const [top5, bottom5, marketSeries, latestRows, prevRows, weights] = await Promise.all([
    getTopContracts(latest, 5, false),
    getTopContracts(latest, 5, true),
    getMarketSeries(periods),
    getPeriodRows(latest),
    prev ? getPeriodRows(prev) : Promise.resolve([] as RomResult[]),
    getPeriodWeights(latest),
  ]);

  const suppliers = new Set(latestRows.map((r) => r.supplier)).size;
  const unrated = latestRows.filter((r) => r.rating === null).length;
  const insight = marketInsight(marketSeries);

  // Störst lyft/tapp sedan förra perioden — deterministisk beräkning per avtal
  const movers: { row: RomResult; delta: number }[] = [];
  if (prev) {
    const key = (r: RomResult) => r.ka_number ?? `${r.supplier}|${r.delivery_area}`;
    const prevMap = new Map(prevRows.map((r) => [key(r), r]));
    for (const r of latestRows) {
      const p = prevMap.get(key(r));
      if (p && r.weighted_score !== null && p.weighted_score !== null) {
        movers.push({ row: r, delta: r.weighted_score - p.weighted_score });
      }
    }
    movers.sort((a, b) => b.delta - a.delta);
  }
  const lifts = movers.slice(0, 3);
  const drops = movers.slice(-3).reverse();

  const events = prev ? diffPeriods(prevRows, latestRows, prev, latest) : [];
  const exits = events.filter((e) => e.type === "left").length;
  const entries = events.filter((e) => e.type === "entered").length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rusta och matcha-marknaden i siffror</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Oberoende statistik per leverantör och leveransområde — betyg, viktade resultat, trender och händelser.
        </p>
        <div className="mt-2">
          <DataStamp period={latest} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Aktiva avtal" value={String(latestRows.length)} sub={prev ? `${entries} nya · ${exits} lämnade sedan ${periodLabel(prev)}` : undefined} />
        <StatCard label="Leverantörer" value={String(suppliers)} />
        <StatCard label="Leveransområden" value={String(new Set(latestRows.map((r) => r.delivery_area)).size)} />
        <StatCard label="Ej betygsatta ännu" value={`${Math.round((unrated / latestRows.length) * 100)} %`} sub={`${unrated} avtal`} />
      </div>

      <section className="card p-5">
        <h2 className="text-base font-medium mb-1">Marknadens utveckling</h2>
        {insight && <p className="text-sm text-[var(--text-dim)] mb-4 max-w-3xl">{insight}</p>}
        <MarketChart series={marketSeries} />
        <DataStamp period={latest} note="deltagare avser de som påbörjade tjänsten 11–22 månader före respektive mätning" />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base font-medium">Topp 5 — högst viktat resultat</h2>
            <Link href="/leverantorer" className="text-sm link">Alla leverantörer →</Link>
          </div>
          <LeaderboardTable rows={top5} startRank={1} weights={weights} />
        </section>
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base font-medium">
              <Tooltip label="Lägst viktat resultat" layers={explain.viktatResultat} />
            </h2>
            <span className="text-xs text-[var(--text-dim)]">data, inte dom — se metodsidan</span>
          </div>
          <LeaderboardTable rows={bottom5} weights={weights} />
        </section>
      </div>

      {prev && (lifts.length > 0 || drops.length > 0) && (
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h2 className="text-base font-medium mb-3">Störst lyft sedan {periodLabel(prev)}</h2>
            <MoverList movers={lifts} positive />
          </div>
          <div className="card p-5">
            <h2 className="text-base font-medium mb-3">Största tapp sedan {periodLabel(prev)}</h2>
            <MoverList movers={drops} />
          </div>
        </section>
      )}

      <section className="card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-medium">Vad hände sedan förra släppet?</h2>
          <p className="text-sm text-[var(--text-dim)]">
            {events.length} händelser: betygsändringar, nya avtal, avtal som lämnat statistiken.
          </p>
        </div>
        <Link href="/handelser" className="text-sm link">Hela händelseloggen →</Link>
      </section>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="mono-label">{label}</p>
      <p className="text-2xl font-semibold mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-[var(--text-dim)] mt-1">{sub}</p>}
    </div>
  );
}

function MoverList({ movers, positive }: { movers: { row: RomResult; delta: number }[]; positive?: boolean }) {
  if (!movers.length) return <p className="text-sm text-[var(--text-dim)]">Kräver två perioder.</p>;
  return (
    <ul className="space-y-2">
      {movers.map(({ row, delta }) => (
        <li key={row.id} className="flex items-center justify-between text-sm gap-3">
          <Link href={`/leverantorer/${slugify(row.supplier)}`} className="hover:text-[var(--compare-1)] truncate">
            {row.supplier} <span className="text-[var(--text-dim)]">— {row.delivery_area}</span>
          </Link>
          <span className="tabular-nums shrink-0" style={{ color: positive ? "var(--positive)" : "var(--text-dim)" }}>
            {delta >= 0 ? "+" : "−"}{formatScore(Math.abs(delta))} → {formatScore(row.weighted_score)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function LeaderboardTable({ rows, startRank, weights }: { rows: RomResult[]; startRank?: number; weights: PeriodWeights | null }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="border-b border-[var(--line)]">
            {startRank !== undefined && <th className="mono-label px-4 py-3 font-normal">#</th>}
            <th className="mono-label px-4 py-3 font-normal">Leverantör</th>
            <th className="mono-label px-4 py-3 font-normal">
              <Tooltip label="Område" layers={explain.leveransomrade} />
            </th>
            <th className="mono-label px-4 py-3 font-normal text-right">
              <Tooltip label="Viktat" layers={explain.viktatResultat} />
            </th>
            <th className="mono-label px-4 py-3 font-normal text-right">
              <Tooltip label="Betyg" layers={explain.betyg} />
            </th>
            <th className="mono-label px-4 py-3 font-normal text-center">
              <Tooltip label="Risk" layers={explain.riskflagga} />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line-soft)]">
          {rows.map((row, i) => (
            <tr key={row.id} className="hover:bg-[var(--bg-hover)] transition-colors">
              {startRank !== undefined && <td className="px-4 py-3 text-[var(--text-faint)] tabular-nums">{startRank + i}</td>}
              <td className="px-4 py-3 font-medium">
                <Link href={`/leverantorer/${slugify(row.supplier)}`} className="hover:text-[var(--compare-1)]">
                  {row.supplier}
                </Link>
              </td>
              <td className="px-4 py-3 text-[var(--text-dim)]">{row.delivery_area}</td>
              <td className="px-4 py-3 text-right">
                <ShowSource row={row} weights={weights} />
              </td>
              <td className="px-4 py-3 text-right"><RatingBadge rating={row.rating} /></td>
              <td className="px-4 py-3 text-center"><RiskBadge risk={row.risk_of_termination} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
