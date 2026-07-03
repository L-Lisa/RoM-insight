import { supabase } from "@/lib/supabase";
import { MarketEvent, PeriodWeights, RomResult, Supplier, SupplierRating } from "@/lib/types";

/**
 * Dataåtkomstlager. Regler:
 * - Filtrera alltid i databasen (aldrig hämta allt och filtrera i JS).
 * - Visa aldrig härledda värden som AF-data — beräkningar (percentil, riskzon,
 *   händelser) markeras som RoM Insights egna på ytan som visar dem.
 * - PostgREST returnerar max 1000 rader per anrop; per-periodfrågor ligger
 *   under det (≤958). Frågor som kan växa använder paginering.
 */

export async function getPeriods(): Promise<string[]> {
  // Markörloop: ett litet anrop per period. En "hämta alla datum"-fråga vore
  // trunkerad av PostgREST:s 1000-raderstak (rom_results har 7000+ rader).
  const periods: string[] = [];
  let cursor: string | null = null;
  for (;;) {
    let q = supabase
      .from("rom_results")
      .select("dataset_date")
      .order("dataset_date", { ascending: true })
      .limit(1);
    if (cursor) q = q.gt("dataset_date", cursor);
    const { data } = await q;
    if (!data?.length) break;
    cursor = data[0].dataset_date as string;
    periods.push(cursor);
  }
  return periods;
}

export async function getLatestPeriod(): Promise<string | null> {
  const { data } = await supabase
    .from("rom_results")
    .select("dataset_date")
    .order("dataset_date", { ascending: false })
    .limit(1)
    .single();
  return data?.dataset_date ?? null;
}

export async function getPeriodRows(period: string): Promise<RomResult[]> {
  const out: RomResult[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("rom_results")
      .select("*")
      .eq("dataset_date", period)
      .order("id", { ascending: true })
      .range(from, from + 999);
    out.push(...((data ?? []) as RomResult[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function getTopContracts(period: string, limit = 5, ascending = false): Promise<RomResult[]> {
  const { data } = await supabase
    .from("rom_results")
    .select("*")
    .eq("dataset_date", period)
    .not("weighted_score", "is", null)
    .order("weighted_score", { ascending })
    .limit(limit);
  return (data ?? []) as RomResult[];
}

export async function getAreaRows(period: string, area: string): Promise<RomResult[]> {
  const { data } = await supabase
    .from("rom_results")
    .select("*")
    .eq("dataset_date", period)
    .eq("delivery_area", area)
    .order("weighted_score", { ascending: false });
  return (data ?? []) as RomResult[];
}

export async function getPeriodWeights(period: string): Promise<PeriodWeights | null> {
  const { data } = await supabase.from("period_weights").select("*").eq("period", period).maybeSingle();
  return (data as PeriodWeights) ?? null;
}

export async function getSuppliers(): Promise<Supplier[]> {
  const { data } = await supabase.from("suppliers").select("*").order("name").range(0, 999);
  return (data ?? []) as Supplier[];
}

export async function getSupplierBySlug(slug: string): Promise<Supplier | null> {
  const { data } = await supabase.from("suppliers").select("*").eq("slug", slug).maybeSingle();
  return (data as Supplier) ?? null;
}

export async function getSupplierResults(name: string): Promise<RomResult[]> {
  const { data } = await supabase
    .from("rom_results")
    .select("*")
    .eq("supplier", name)
    .order("dataset_date", { ascending: true })
    .range(0, 999);
  return (data ?? []) as RomResult[];
}

export async function getSupplierRatingHistory(name: string): Promise<SupplierRating[]> {
  const { data } = await supabase
    .from("supplier_ratings")
    .select("ka_number, supplier, delivery_area, af_region, rating, period")
    .eq("supplier", name)
    .order("period", { ascending: true })
    .range(0, 999);
  return (data ?? []) as SupplierRating[];
}

/** Percentil för ett värde mot alla avtal i perioden. RoM Insights beräkning. */
export function percentileOf(value: number, allScores: number[]): number {
  if (!allScores.length) return 0;
  const below = allScores.filter((s) => s < value).length;
  return Math.round((below / allScores.length) * 100);
}

export async function getPeriodScores(period: string): Promise<number[]> {
  const rows = await getPeriodRows(period);
  return rows.map((r) => r.weighted_score).filter((v): v is number => v !== null && v !== undefined);
}

/**
 * Händelselogg: beräknas ur skillnaden mellan två intilliggande perioder.
 * Endast fakta ur AF:s filer — inga orsaksantaganden.
 */
export function diffPeriods(prev: RomResult[], curr: RomResult[], prevPeriod: string, period: string): MarketEvent[] {
  const key = (r: RomResult) => r.ka_number ?? `${r.supplier}|${r.delivery_area}`;
  const prevMap = new Map(prev.map((r) => [key(r), r]));
  const currMap = new Map(curr.map((r) => [key(r), r]));
  const events: MarketEvent[] = [];

  for (const [k, c] of currMap) {
    const p = prevMap.get(k);
    if (!p) {
      events.push({
        type: "entered", period, prevPeriod, supplier: c.supplier,
        delivery_area: c.delivery_area, ka_number: c.ka_number,
        detail: "Ny i statistiken",
      });
      continue;
    }
    if (p.rating !== c.rating) {
      events.push({
        type: "rating_changed", period, prevPeriod, supplier: c.supplier,
        delivery_area: c.delivery_area, ka_number: c.ka_number,
        detail: `Betyg ${p.rating ?? "saknas"} → ${c.rating ?? "saknas"}`,
      });
    }
    // Riskflaggan jämförs bara när AF publicerade kolumnen i BÅDA perioderna
    if (p.risk_of_termination !== null && c.risk_of_termination !== null && p.risk_of_termination !== c.risk_of_termination) {
      events.push({
        type: c.risk_of_termination ? "risk_on" : "risk_off", period, prevPeriod,
        supplier: c.supplier, delivery_area: c.delivery_area, ka_number: c.ka_number,
        detail: c.risk_of_termination ? "AF:s riskflagga tillkom" : "AF:s riskflagga togs bort",
      });
    }
  }
  for (const [k, p] of prevMap) {
    if (!currMap.has(k)) {
      events.push({
        type: "left", period, prevPeriod, supplier: p.supplier,
        delivery_area: p.delivery_area, ka_number: p.ka_number,
        detail: "Lämnade statistiken",
      });
    }
  }
  return events;
}

/** Marknads-KPI:er per period för utvecklingskurvan. */
export async function getMarketSeries(periods: string[]) {
  const series = [];
  for (const period of periods) {
    const rows = await getPeriodRows(period);
    series.push({
      period,
      contracts: rows.length,
      suppliers: new Set(rows.map((r) => r.supplier)).size,
      participants: rows.reduce((s, r) => s + (r.participants ?? 0), 0),
    });
  }
  return series;
}
