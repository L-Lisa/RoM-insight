import Link from "next/link";
import { DataStamp } from "@/components/DataStamp";
import { diffPeriods, getPeriodRows, getPeriods } from "@/lib/queries";
import { periodLabel, slugify } from "@/lib/format";
import { MarketEvent } from "@/lib/types";

export const revalidate = 3600;

export const metadata = {
  title: "Händelser",
  description:
    "Händelseloggen för Rusta och matcha-marknaden: betygsändringar, nya avtal, avtal som lämnat statistiken och AF:s riskflaggor — period för period.",
};

const TYPE_META: Record<MarketEvent["type"], { label: string; color: string }> = {
  rating_changed: { label: "Betyg", color: "var(--compare-1)" },
  entered: { label: "Ny", color: "var(--positive)" },
  left: { label: "Lämnade", color: "var(--terminated)" },
  risk_on: { label: "Riskflagga", color: "var(--risk)" },
  risk_off: { label: "Risk borta", color: "var(--text-dim)" },
};

export default async function EventsPage() {
  const periods = await getPeriods();
  const allRows = await Promise.all(periods.map((p) => getPeriodRows(p)));

  const byTransition: { period: string; prevPeriod: string; events: MarketEvent[] }[] = [];
  for (let i = periods.length - 1; i > 0; i--) {
    const events = diffPeriods(allRows[i - 1], allRows[i], periods[i - 1], periods[i]);
    byTransition.push({ period: periods[i], prevPeriod: periods[i - 1], events });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Händelser</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1 max-w-2xl">
          Vad som ändrats mellan Arbetsförmedlingens släpp: betyg, nya avtal, avtal som lämnat statistiken och
          AF:s riskflaggor. Endast fakta ur filerna — varför ett avtal lämnat statistiken framgår inte av AF:s data,
          så det påstår vi inget om.
        </p>
        <div className="mt-2"><DataStamp period={periods[periods.length - 1] ?? null} /></div>
      </div>

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
                      <span className="text-[var(--text-dim)] truncate">— {e.delivery_area}</span>
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
