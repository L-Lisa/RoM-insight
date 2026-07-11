import { MarketTable, MarketRow } from "@/components/MarketTable";
import { DataStamp } from "@/components/DataStamp";
import { getLatestPeriod, getPeriodRows } from "@/lib/queries";
import { periodLabel } from "@/lib/format";

export const revalidate = 3600;

export const metadata = {
  title: "Hela marknaden",
  description:
    "Samtliga Rusta och matcha-avtal i senaste perioden — sorterbart på viktat resultat, betyg, deltagare och resultat. Data: Arbetsförmedlingen.",
};

export default async function MarketPage() {
  const latest = await getLatestPeriod();
  const rows = latest ? await getPeriodRows(latest) : [];

  const tableRows: MarketRow[] = rows.map((r) => ({
    supplier: r.supplier,
    delivery_area: r.delivery_area,
    weighted_score: r.weighted_score,
    rating: r.rating,
    participants: r.participants,
    results: r.results,
    sustainability: (() => {
      const rr1 = (r.rr1_a ?? 0) + (r.rr1_b ?? 0) + (r.rr1_c ?? 0);
      const rr2 = (r.rr2_a ?? 0) + (r.rr2_b ?? 0) + (r.rr2_c ?? 0);
      return rr1 > 0 ? Math.round((rr2 / rr1) * 100) : null;
    })(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hela marknaden</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Samtliga {rows.length} avtal i {latest ? periodLabel(latest) : "senaste perioden"} — klicka på en kolumn för att sortera. Hållbarhet = RR2/RR1
          (andel första resultat med godkänd uppföljning i samma fönster — vår beräkning).
        </p>
        <div className="mt-2"><DataStamp period={latest} /></div>
      </div>
      <MarketTable rows={tableRows} />
    </div>
  );
}
