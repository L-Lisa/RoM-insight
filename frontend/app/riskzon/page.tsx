import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { explain } from "@/lib/tooltips";
import { RatingBadge } from "@/components/Badges";
import { DataStamp } from "@/components/DataStamp";
import { getPeriodRows, getPeriods } from "@/lib/queries";
import { formatScore, periodLabel, slugify } from "@/lib/format";

export const revalidate = 3600;

export const metadata = {
  title: "Riskzonen",
  description:
    "Avtal som uppfyller Arbetsförmedlingens publicerade hävningskriterier i Rusta och matcha: betyg 1 eller saknas samt viktat resultat under 0,2. Informativ beräkning.",
};

export default async function RiskZonePage() {
  const periods = await getPeriods();
  const latest = periods[periods.length - 1];
  const rows = latest ? await getPeriodRows(latest) : [];

  // Senaste period där AF själva publicerade riskflaggan
  let afFlagPeriod: string | null = null;
  let afFlags = new Map<string, boolean>();
  for (let i = periods.length - 1; i >= 0; i--) {
    const p = await getPeriodRows(periods[i]);
    if (p.some((r) => r.risk_of_termination !== null)) {
      afFlagPeriod = periods[i];
      afFlags = new Map(p.map((r) => [r.ka_number ?? `${r.supplier}|${r.delivery_area}`, r.risk_of_termination === true]));
      break;
    }
  }

  // AF:s två publika kriterier som kan läsas ur filen (22-månaderskravet och
  // "två efterföljande uppföljningar" kräver avtalshistorik — anges i texten)
  const inZone = rows
    .filter((r) => (r.rating === null || r.rating === 1) && r.weighted_score !== null && r.weighted_score < 0.2)
    .sort((a, b) => (a.weighted_score ?? 0) - (b.weighted_score ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Riskzonen</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1 max-w-3xl">
          Avtal som i {latest ? periodLabel(latest) : "senaste perioden"} uppfyller de två hävningskriterier som går att
          läsa direkt ur Arbetsförmedlingens fil: <strong>betyg 1 eller saknas</strong> och{" "}
          <strong>viktat resultatmått under 0,2</strong>. AF:s fullständiga prövning kräver dessutom att avtalet varit
          aktivt i 22 månader och att bristerna består vid två uppföljningar i rad.
        </p>
        <p className="text-xs mt-2 px-3 py-2 card inline-block" style={{ color: "var(--risk)" }}>
          Informativ beräkning utifrån Arbetsförmedlingens publicerade villkor — simulerar inte myndighetens beslut.
        </p>
        <div className="mt-2"><DataStamp period={latest} /></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl">
        <div className="card p-4">
          <p className="mono-label">I riskzonen nu</p>
          <p className="text-2xl font-semibold mt-1 tabular-nums">{inZone.length}</p>
          <p className="text-xs text-[var(--text-dim)] mt-1">av {rows.length} avtal</p>
        </div>
        <div className="card p-4">
          <p className="mono-label">Andel av marknaden</p>
          <p className="text-2xl font-semibold mt-1 tabular-nums">{rows.length ? Math.round((inZone.length / rows.length) * 100) : 0} %</p>
        </div>
        <div className="card p-4">
          <p className="mono-label">AF:s egen flagga</p>
          <p className="text-sm mt-1 text-[var(--text-dim)]">
            {afFlagPeriod ? `senast publicerad ${periodLabel(afFlagPeriod)}` : "aldrig publicerad"}
          </p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="text-left">
            <tr className="border-b border-[var(--line)]">
              <th className="mono-label px-4 py-3 font-normal">Leverantör</th>
              <th className="mono-label px-4 py-3 font-normal">Område</th>
              <th className="mono-label px-4 py-3 font-normal text-right"><Tooltip label="Viktat" layers={explain.viktatResultat} /></th>
              <th className="mono-label px-4 py-3 font-normal text-right"><Tooltip label="Betyg" layers={explain.betyg} /></th>
              <th className="mono-label px-4 py-3 font-normal text-right">Deltagare</th>
              <th className="mono-label px-4 py-3 font-normal text-center">
                <Tooltip label={afFlagPeriod ? `AF:s flagga (${periodLabel(afFlagPeriod)})` : "AF:s flagga"} layers={explain.riskflagga} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line-soft)]">
            {inZone.map((r) => {
              const afFlag = afFlags.get(r.ka_number ?? `${r.supplier}|${r.delivery_area}`);
              return (
                <tr key={r.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/leverantorer/${slugify(r.supplier)}`} className="hover:text-[var(--compare-1)]">
                      {r.supplier}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-dim)]">
                    <Link href={`/leveransomraden/${encodeURIComponent(r.delivery_area)}`} className="hover:text-[var(--compare-1)]">
                      {r.delivery_area}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: "var(--risk)" }}>{formatScore(r.weighted_score)}</td>
                  <td className="px-4 py-3 text-right"><RatingBadge rating={r.rating} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.participants}</td>
                  <td className="px-4 py-3 text-center text-xs text-[var(--text-dim)]">
                    {afFlag === undefined ? "fanns ej" : afFlag ? <span style={{ color: "var(--risk)" }}>Ja</span> : "Nej"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--text-dim)] max-w-3xl">
        Beräkningsgrund: betyg och viktat resultatmått ur Arbetsförmedlingens resultatuppföljning{" "}
        {latest ? periodLabel(latest) : ""}. Kriterierna är AF:s publicerade kvalitetsvillkor — läs hela metoden på{" "}
        <Link href="/metod" className="link">metodsidan</Link>.
      </p>
    </div>
  );
}
