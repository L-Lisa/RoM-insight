import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { explain } from "@/lib/tooltips";
import { RatingBadge, RiskBadge } from "@/components/Badges";
import { CompareButton } from "@/components/CompareButton";
import { ShowSource } from "@/components/ShowSource";
import { DataStamp } from "@/components/DataStamp";
import { HomeConstellation } from "@/components/HomeConstellation";
import { HeroSearch } from "@/components/HeroSearch";
import { MarketChart } from "@/components/MarketChart";
import {
  diffPeriods,
  getMarketSeries,
  getPeriodRows,
  getPeriods,
  getPeriodWeights,
  getTopContracts,
} from "@/lib/queries";
import { computeMovers, Mover } from "@/lib/newsletter";
import { PeriodWeights } from "@/lib/types";
import { marketInsight } from "@/lib/insights";
import { formatScore, periodLabel, slugify } from "@/lib/format";
import { contractKey } from "@/lib/compare";
import { RomResult } from "@/lib/types";
import { AF_RATING_MIN_PARTICIPANTS, AF_RATING_MIN_MONTHS } from "@/lib/afRules";

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

  // Störst lyft/tapp sedan förra perioden — delad beräkning med Marknadsbrevet
  // (computeMovers: betygsregeln + teckenfilter så listorna aldrig överlappar).
  const movers = prev ? computeMovers(prevRows, latestRows) : [];
  const lifts = movers.filter((m) => m.delta > 0).slice(0, 3);
  const drops = movers.filter((m) => m.delta < 0).slice(-3).reverse();

  const events = prev ? diffPeriods(prevRows, latestRows, prev, latest) : [];
  const exits = events.filter((e) => e.type === "left").length;
  const entries = events.filter((e) => e.type === "entered").length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hela Rusta och matcha-marknaden i siffror</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1 max-w-3xl">
          Arbetsförmedlingen publicerar betyg och resultat varannan månad — men bara som ögonblicksbilder.
          Här sparas historiken, så att du ser hur varje leverantör och leveransområde faktiskt utvecklas:
          trender, lyft och tapp, oberoende och direkt ur AF:s filer.
        </p>
        <div className="mt-4">
          <HeroSearch
            suppliers={Array.from(new Set(latestRows.map((r) => r.supplier)))
              .sort((a, b) => a.localeCompare(b, "sv"))
              .map((n) => ({ name: n, slug: slugify(n) }))}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href="/leverantorer" className="rounded-lg border border-[var(--line)] px-3 py-1.5 hover:bg-[var(--bg-hover)] transition-colors">Hitta en leverantör</Link>
          <Link href="/leveransomraden" className="rounded-lg border border-[var(--line)] px-3 py-1.5 hover:bg-[var(--bg-hover)] transition-colors">Sök på kommun</Link>
          <Link href="/jamfor" className="rounded-lg border border-[var(--line)] px-3 py-1.5 hover:bg-[var(--bg-hover)] transition-colors">Jämför avtal</Link>
          <Link href="/vad-kravs" className="rounded-lg border border-[var(--line)] px-3 py-1.5 hover:bg-[var(--bg-hover)] transition-colors">Vad krävs för att lyfta?</Link>
        </div>
        <div className="mt-3">
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
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-base font-medium">Konstellationen — hela marknaden på en gång</h2>
          <Link href="/jamfor" className="text-sm link">Jämför avtal →</Link>
        </div>
        <p className="text-sm text-[var(--text-dim)] mb-4 max-w-3xl">
          Varje linje är ett avtal (leverantör × område). Sök en leverantör för att lysa upp deras avtal mot
          resten av marknaden, eller klicka direkt i molnet.
        </p>
        <HomeConstellation periods={periods} initialKeys={top5.map((r) => contractKey(r.supplier, r.delivery_area))} />
      </section>

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
        <p className="lg:col-span-2 text-xs text-[var(--text-dim)]">
          Endast betygsatta avtal rankas. Avtal utan betyg, under AF:s betygsvillkor (minst {AF_RATING_MIN_PARTICIPANTS} deltagare,
          minst {AF_RATING_MIN_MONTHS} månaders verksamhet), har för litet underlag för att viktat resultat ska gå att jämföra.
          De syns i tabellerna på <Link href="/marknad" className="link">marknadssidan</Link> och profilsidorna.
        </p>
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
          <p className="lg:col-span-2 text-xs text-[var(--text-dim)]">
            Räknat på avtal med betyg i båda perioderna.
          </p>
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

function MoverList({ movers, positive }: { movers: Mover[]; positive?: boolean }) {
  if (!movers.length) return <p className="text-sm text-[var(--text-dim)]">Kräver två perioder.</p>;
  return (
    <ul className="space-y-2">
      {movers.map((m) => (
        <li key={`${m.supplier}|${m.delivery_area}`} className="flex items-center justify-between text-sm gap-3">
          <Link href={`/leverantorer/${slugify(m.supplier)}`} className="hover:text-[var(--compare-1)] truncate">
            {m.supplier} <span className="text-[var(--text-dim)]">— {m.delivery_area}</span>
          </Link>
          <span className="tabular-nums shrink-0" style={{ color: positive ? "var(--positive)" : "var(--text-dim)" }}>
            {m.delta >= 0 ? "+" : "−"}{formatScore(Math.abs(m.delta))} → {formatScore(m.to)}
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
            <th className="mono-label px-2 py-3 font-normal text-center" aria-label="Jämför" />
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
              <td className="px-2 py-3 text-center"><CompareButton supplier={row.supplier} area={row.delivery_area} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
