import Link from "next/link";
import { DataStamp } from "@/components/DataStamp";
import { Tooltip } from "@/components/Tooltip";
import { explain } from "@/lib/tooltips";
import {
  diffPeriods,
  getMunicipalities,
  getNameVariants,
  getPeriodRows,
  getPeriods,
  getRadarDates,
  getRadarOfficeRows,
  getRadarRows,
  getSuppliers,
  radarCoverageGaps,
  radarMissingSuppliers,
} from "@/lib/queries";
import { periodLabel, slugify } from "@/lib/format";
import { MarketEvent } from "@/lib/types";

export const revalidate = 3600;

export const metadata = {
  title: "Händelser & Radarn",
  description:
    "Händelseloggen för Rusta och matcha-marknaden: betygsändringar, nya avtal, avtal som lämnat statistiken, och Radarn som bevakar vilka leverantörer som syns i Arbetsförmedlingens söktjänst.",
};

const TYPE_META: Record<MarketEvent["type"], { label: string; color: string }> = {
  rating_changed: { label: "Betyg", color: "var(--compare-1)" },
  entered: { label: "Ny", color: "var(--positive)" },
  left: { label: "Lämnade", color: "var(--terminated)" },
  risk_on: { label: "Riskflagga", color: "var(--risk)" },
  risk_off: { label: "Risk borta", color: "var(--text-dim)" },
};

function radarDateLabel(d: string): string {
  return new Date(`${d}T12:00:00`).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
}

export default async function EventsPage() {
  const periods = await getPeriods();
  const allRows = await Promise.all(periods.map((p) => getPeriodRows(p)));

  const byTransition: { period: string; prevPeriod: string; events: MarketEvent[] }[] = [];
  for (let i = periods.length - 1; i > 0; i--) {
    const events = diffPeriods(allRows[i - 1], allRows[i], periods[i - 1], periods[i]);
    byTransition.push({ period: periods[i], prevPeriod: periods[i - 1], events });
  }

  // Radarn: senaste snapshot jämförs mot senaste statistiken (Lisas beslut
  // 2026-07-20: enklare än snapshot-mot-snapshot — baslinjen är statistiken).
  const radarDates = await getRadarDates();
  const latestRadar = radarDates.length ? radarDates[radarDates.length - 1] : null;
  const [latestRadarRows, latestOfficeRows, municipalities, suppliers, variants] = await Promise.all([
    latestRadar ? getRadarRows(latestRadar) : Promise.resolve([]),
    latestRadar ? getRadarOfficeRows(latestRadar) : Promise.resolve([]),
    getMunicipalities(),
    getSuppliers(),
    getNameVariants(),
  ]);
  const latestStatsRows = allRows[allRows.length - 1] ?? [];
  // Områdessidan finns bara för områden i senaste perioden — äldre händelser
  // kan röra områden som lämnat statistiken; de länkas inte (annars 404).
  const currentAreas = new Set(latestStatsRows.map((r) => r.delivery_area));
  const missing = latestRadar
    ? radarMissingSuppliers(latestStatsRows, latestRadarRows, suppliers, variants)
    : [];
  const coverageGaps = latestRadar
    ? radarCoverageGaps(latestStatsRows, latestOfficeRows, municipalities, suppliers, variants)
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Händelser</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1 max-w-2xl">
          Vad som ändrats mellan Arbetsförmedlingens släpp: betyg, nya avtal, avtal som lämnat statistiken och
          AF:s riskflaggor. Endast fakta ur filerna. Varför ett avtal lämnat statistiken framgår inte av AF:s data,
          så det påstår vi inget om.
        </p>
        <div className="mt-2"><DataStamp period={periods[periods.length - 1] ?? null} /></div>
      </div>

      {latestRadar && (
        <section className="card p-5 space-y-4">
          <div>
            <h2 className="text-base font-medium flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--signal)" }} aria-hidden />
              <Tooltip label="Radarn" layers={explain.radarn} />
            </h2>
            <p className="text-sm text-[var(--text-dim)] mt-1 max-w-2xl">
              Statistiken och AF:s söktjänst är två olika listor. Vi jämför dem för att se vilka som försvinner
              på vägen: vid senaste kontrollen ({radarDateLabel(latestRadar)}) syntes {latestRadarRows.length}{" "}
              leverantörer med {latestRadarRows.reduce((s, r) => s + r.offices_count, 0)} kontor i söktjänsten.
              Varför en leverantör saknas framgår inte av datan — det kan vara allt från namnbyte till avslutat
              avtal. Värt att hålla ögonen på; mer än så påstår vi inte.
            </p>
          </div>

          {missing.length > 0 && (
            <div>
              <h3 className="text-sm font-medium">
                {missing.length} {missing.length === 1 ? "leverantör" : "leverantörer"} har avtal i statistiken ({periodLabel(periods[periods.length - 1])})
                men syntes inte alls i söktjänsten vid senaste kontrollen ({radarDateLabel(latestRadar)}).
              </h3>
              <p className="text-xs text-[var(--text-dim)] mb-2">
                Listan fångar leverantörer som saknas helt.
                {coverageGaps.length > 0 && " Leverantörer som syns i söktjänsten men saknar kontor i sina avtalsområden listas nedanför."}
              </p>
              <div className="flex flex-wrap gap-2">
                {missing.map((s) => (
                  <Link
                    key={s.id}
                    href={`/leverantorer/${s.slug}`}
                    className="text-xs px-2.5 py-1 rounded-[var(--radius-badge)] border transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ borderColor: "var(--line)", color: "var(--text)" }}
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {coverageGaps.length > 0 && (
            <div>
              <h3 className="text-sm font-medium">
                {coverageGaps.length} {coverageGaps.length === 1 ? "leverantör" : "leverantörer"} syns i söktjänsten men saknar synligt kontor i minst ett av sina
                avtalsområden ({periodLabel(periods[periods.length - 1])}) vid senaste kontrollen ({radarDateLabel(latestRadar)})
              </h3>
              <p className="text-xs text-[var(--text-dim)] mb-2">
                Kontor mappas till leveransområde via AF:s kommunlista. Leverantörer vars kontorsorter inte
                säkert kan mappas till en kommun räknas inte med här.
              </p>
              <div className="divide-y divide-[var(--line-soft)] border border-[var(--line-soft)] rounded-lg max-h-[360px] overflow-y-auto">
                {coverageGaps.map((g) => (
                  <div key={g.supplier.id} className="px-4 py-2.5 text-sm">
                    <Link href={`/leverantorer/${g.supplier.slug}`} className="hover:text-[var(--compare-1)] font-medium">
                      {g.supplier.name}
                    </Link>
                    <span className="block text-xs text-[var(--text-dim)] mt-0.5">
                      Avtal utan synligt kontor: {g.uncoveredAreas.join(", ")} · kontor finns i: {g.officePostorter.join(", ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-[var(--text-dim)] leading-relaxed max-w-2xl">
            Varför försvinner någon ur söktjänsten? Arbetsförmedlingen publicerar inte orsaken. Det kan vara avtal
            som löpt ut, eget utträde, ett namnbyte vi ännu inte kartlagt, eller hävning. Vi påstår inget i det
            enskilda fallet; när AF själva publicerar ett besked länkar vi det. Kolla gärna själv i{" "}
            <a
              href="https://arbetsformedlingen.se/for-arbetssokande/extra-stod/stod-a-o/rusta-och-matcha/sok-leverantor-inom-rusta-och-matcha"
              className="link"
              rel="noopener noreferrer"
              target="_blank"
            >
              AF:s söktjänst
            </a>
            . Metoden beskrivs på <Link href="/metod" className="link">metodsidan</Link>.
          </p>
        </section>
      )}

      {byTransition.map(({ period, prevPeriod, events }) => {
        const counts = events.reduce<Record<string, number>>((acc, e) => {
          acc[e.type] = (acc[e.type] ?? 0) + 1;
          return acc;
        }, {});
        return (
          <section key={period}>
            <h2 className="text-base font-medium mb-1">
              {periodLabel(prevPeriod)} → {periodLabel(period)}
            </h2>
            <p className="text-xs text-[var(--text-dim)] mb-3">
              {events.length} händelser
              {counts.rating_changed ? ` · ${counts.rating_changed} betygsändringar` : ""}
              {counts.entered ? ` · ${counts.entered} nya` : ""}
              {counts.left ? ` · ${counts.left} lämnade` : ""}
              {counts.risk_on ? ` · ${counts.risk_on} nya riskflaggor` : ""}
            </p>
            <div className="card divide-y divide-[var(--line-soft)] max-h-[480px] overflow-y-auto">
              {events
                .sort((a, b) => a.supplier.localeCompare(b.supplier, "sv"))
                .map((e, i) => {
                  const meta = TYPE_META[e.type];
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span
                        className="shrink-0 text-xs px-2 py-0.5 rounded-[var(--radius-badge)] border"
                        style={{ color: meta.color, borderColor: meta.color, opacity: 0.9 }}
                      >
                        {meta.label}
                      </span>
                      <Link href={`/leverantorer/${slugify(e.supplier)}`} className="hover:text-[var(--compare-1)] truncate">
                        {e.supplier}
                      </Link>
                      <span className="text-[var(--text-dim)] truncate">
                        —{" "}
                        {currentAreas.has(e.delivery_area) ? (
                          <Link href={`/leveransomraden/${encodeURIComponent(e.delivery_area)}`} className="hover:text-[var(--compare-1)]">
                            {e.delivery_area}
                          </Link>
                        ) : (
                          e.delivery_area
                        )}
                      </span>
                      <span className="ml-auto text-[var(--text-dim)] text-xs shrink-0">{e.detail}</span>
                    </div>
                  );
                })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
