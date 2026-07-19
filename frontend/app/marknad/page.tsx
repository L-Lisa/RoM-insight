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

  // RR1 och RR2 redovisas alltid separat (results-kolumnen i DB = enbart RR1).
  // Hållbarhet kräver KOMPLETT nivådata (samma regel som ShowSource) — vid
  // partiell backfill vore kvoten annars räknad på en annan bas än RR1-kolumnen.
  const tableRows: MarketRow[] = rows.map((r) => {
    const levels = [r.rr1_a, r.rr1_b, r.rr1_c, r.rr2_a, r.rr2_b, r.rr2_c];
    const hasLevels = levels.every((v) => v !== null && v !== undefined);
    const rr1 = (r.rr1_a ?? 0) + (r.rr1_b ?? 0) + (r.rr1_c ?? 0);
    const rr2 = (r.rr2_a ?? 0) + (r.rr2_b ?? 0) + (r.rr2_c ?? 0);
    return {
      supplier: r.supplier,
      delivery_area: r.delivery_area,
      weighted_score: r.weighted_score,
      rating: r.rating,
      participants: r.participants,
      results: r.results,
      rr2,
      sustainability: hasLevels && rr1 > 0 ? Math.round((rr2 / rr1) * 100) : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hela marknaden</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Samtliga {rows.length} avtal i {latest ? periodLabel(latest) : "senaste perioden"} — klicka på en kolumn för att sortera.
          RR1 = första godkända resultatet (arbete eller studier), RR2 = godkänd uppföljningsredovisning — alltid separat redovisade.
          Hållbarhet = RR2/RR1 (andel första resultat med godkänd uppföljning i samma fönster — vår beräkning).
        </p>
        <div className="mt-2"><DataStamp period={latest} /></div>
      </div>
      <MarketTable rows={tableRows} />
    </div>
  );
}
