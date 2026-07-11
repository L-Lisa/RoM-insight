import Link from "next/link";
import { ExitBadge, RatingBadge } from "@/components/Badges";
import { DataStamp } from "@/components/DataStamp";
import { getPeriodRows, getPeriods } from "@/lib/queries";
import { formatScore, periodLabel, slugify } from "@/lib/format";
import { RomResult } from "@/lib/types";

export const revalidate = 3600;

export const metadata = {
  title: "Arkiv — förändringar på marknaden",
  description:
    "Leverantörsavtal som lämnat Rusta och matcha-statistiken, med deras sista publicerade siffror. AF publicerar bara ögonblicksbilder — arkivet bevarar historiken.",
};

export default async function ArchivePage() {
  const periods = await getPeriods();
  const allRows = await Promise.all(periods.map((p) => getPeriodRows(p)));
  const latest = periods[periods.length - 1];
  const latestKeys = new Set(allRows[allRows.length - 1].map((r) => r.ka_number ?? `${r.supplier}|${r.delivery_area}`));

  // Sista kända rad per avtal som INTE finns i senaste perioden
  const lastSeen = new Map<string, RomResult>();
  for (const rows of allRows) {
    for (const r of rows) {
      const key = r.ka_number ?? `${r.supplier}|${r.delivery_area}`;
      if (!latestKeys.has(key)) lastSeen.set(key, r);
    }
  }
  const exited = Array.from(lastSeen.values()).sort(
    (a, b) => b.dataset_date.localeCompare(a.dataset_date) || a.supplier.localeCompare(b.supplier, "sv"),
  );

  const marketDrop = allRows.length >= 2
    ? Math.round(((allRows[0].length - allRows[allRows.length - 1].length) / allRows[0].length) * 100)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Förändringar på marknaden</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1 max-w-2xl">
          {exited.length} avtal har lämnat statistiken sedan {periodLabel(periods[0])}
          {marketDrop !== null && marketDrop > 0 && <> — marknaden har krympt {marketDrop} % mätt i antal avtal</>}.
          Arbetsförmedlingen publicerar bara ögonblicksbilder; det här arkivet bevarar varje avtals sista
          publicerade siffror. Varför ett avtal försvunnit — hävning, egen uppsägning eller annat — framgår
          inte av AF:s filer, så det anges inte.
        </p>
        <div className="mt-2"><DataStamp period={latest} /></div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-left">
            <tr className="border-b border-[var(--line)]">
              <th className="mono-label px-4 py-3 font-normal">Leverantör</th>
              <th className="mono-label px-4 py-3 font-normal">Område</th>
              <th className="mono-label px-4 py-3 font-normal">Sist sedd</th>
              <th className="mono-label px-4 py-3 font-normal text-right">Sista viktat</th>
              <th className="mono-label px-4 py-3 font-normal text-right">Sista betyg</th>
              <th className="mono-label px-4 py-3 font-normal text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line-soft)]">
            {exited.map((r) => (
              <tr key={`${r.supplier}|${r.delivery_area}`} className="hover:bg-[var(--bg-hover)] transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/leverantorer/${slugify(r.supplier)}`} className="hover:text-[var(--compare-1)]">
                    {r.supplier}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--text-dim)]">{r.delivery_area}</td>
                <td className="px-4 py-3 tabular-nums">{periodLabel(r.dataset_date)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatScore(r.weighted_score)}</td>
                <td className="px-4 py-3 text-right"><RatingBadge rating={r.rating} /></td>
                <td className="px-4 py-3 text-right"><ExitBadge /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
