import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { explain } from "@/lib/tooltips";
import { DataStamp } from "@/components/DataStamp";
import { getLatestPeriod, getMunicipalities, getPeriodRows } from "@/lib/queries";
import { KommunSearch } from "@/components/KommunSearch";
import { formatScore } from "@/lib/format";

export const revalidate = 3600;

export const metadata = {
  title: "Leveransområden",
  description:
    "Alla leveransområden i Rusta och matcha: antal leverantörer, snittresultat och riskläge per område. Data: Arbetsförmedlingen.",
};

export default async function AreasPage() {
  const latest = await getLatestPeriod();
  const [rows, municipalities] = await Promise.all([
    latest ? getPeriodRows(latest) : Promise.resolve([]),
    getMunicipalities(),
  ]);

  const areas = new Map<string, { count: number; scores: number[]; risk: number; participants: number }>();
  for (const r of rows) {
    const a = areas.get(r.delivery_area) ?? { count: 0, scores: [], risk: 0, participants: 0 };
    a.count++;
    if (r.weighted_score !== null) a.scores.push(r.weighted_score);
    if (r.risk_of_termination === true) a.risk++;
    a.participants += r.participants ?? 0;
    areas.set(r.delivery_area, a);
  }

  const national = rows.map((r) => r.weighted_score).filter((v): v is number => v !== null);
  const nationalAvg = national.reduce((s, v) => s + v, 0) / (national.length || 1);

  const list = Array.from(areas.entries())
    .map(([name, a]) => ({
      name,
      count: a.count,
      participants: a.participants,
      avg: a.scores.length ? a.scores.reduce((s, v) => s + v, 0) / a.scores.length : null,
    }))
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leveransområden</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          {list.length} områden i senaste statistiken · riksgenomsnitt viktat resultat {formatScore(nationalAvg)}
        </p>
        <div className="mt-2"><DataStamp period={latest} note="snitt per område är RoM Insights beräkning (oviktat medel av avtalens viktade resultat)" /></div>
      </div>

      <KommunSearch municipalities={municipalities} areas={list.map((a) => a.name)} />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr className="border-b border-[var(--line)]">
              <th className="mono-label px-4 py-3 font-normal"><Tooltip label="Område" layers={explain.leveransomrade} /></th>
              <th className="mono-label px-4 py-3 font-normal text-right">Avtal</th>
              <th className="mono-label px-4 py-3 font-normal text-right">Deltagare</th>
              <th className="mono-label px-4 py-3 font-normal text-right"><Tooltip label="Snitt viktat" layers={explain.viktatResultat} /></th>
              <th className="mono-label px-4 py-3 font-normal text-right">Mot riket</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line-soft)]">
            {list.map((a) => {
              const rel = a.avg !== null ? Math.round(((a.avg - nationalAvg) / nationalAvg) * 100) : null;
              return (
                <tr key={a.name} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/leveransomraden/${encodeURIComponent(a.name)}`} className="hover:text-[var(--compare-1)]">
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{a.count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{a.participants.toLocaleString("sv-SE")}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatScore(a.avg)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--text-dim)]">
                    {rel === null ? "–" : rel > 0 ? `+${rel} %` : `${rel} %`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
