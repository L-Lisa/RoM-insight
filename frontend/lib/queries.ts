import { supabase } from "./supabase";
import { CloudSeries, MarketEvent, Municipality, NameVariant, Office, OfficeSnapshotRow, PeriodWeights, RadarSnapshotRow, RomResult, Supplier, SupplierRating } from "./types";

/**
 * Dataåtkomstlager. Regler:
 * - Filtrera alltid i databasen (aldrig hämta allt och filtrera i JS).
 * - Visa aldrig härledda värden som AF-data — beräkningar (percentil, riskzon,
 *   händelser) markeras som RoM Insights egna på ytan som visar dem.
 * - PostgREST returnerar max 1000 rader per anrop; per-periodfrågor ligger
 *   under det (≤958). Frågor som kan växa använder paginering.
 */

export async function getPeriods(): Promise<string[]> {
  // Markörloop mot rom_results — DATAKÄLLAN för vilka perioder som faktiskt är
  // publicerade. Medvetet INTE period_weights: ingest.py skriver rom_results
  // men vikterna backfillas separat (scripts/backfill.py), så en nyimporterad
  // period saknar vikter en stund — den får aldrig döljas här. En "hämta alla
  // datum"-fråga vore dessutom trunkerad av PostgREST:s 1000-raderstak
  // (rom_results har 7000+ rader). Perioderna är få (~8) så loopen är billig.
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

/** Betygsregeln bor i lib/format.ts (isRankable) — klientsäker utan supabase.
 *  Endast betygsatta avtal rankas i viktat resultat-mått: under AF:s
 *  betygsvillkor (minst 18 deltagare, 12 månaders verksamhet) blir måttet
 *  statistiskt meningslöst (maj 2026: "bästa" obetygsatta avtalet hade 1,15
 *  på 2 deltagare). AF rankar dem inte — det gör inte vi heller. */
export async function getTopContracts(period: string, limit = 5, ascending = false): Promise<RomResult[]> {
  const { data } = await supabase
    .from("rom_results")
    .select("*")
    .eq("dataset_date", period)
    .not("weighted_score", "is", null)
    .not("rating", "is", null)
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
    // nullsFirst: false — Postgres lägger annars NULL FÖRST vid DESC, och ett
    // betygsatt avtal utan publicerat viktat värde skulle hamna som rank 1.
    .order("weighted_score", { ascending: false, nullsFirst: false });
  return (data ?? []) as RomResult[];
}

export async function getPeriodWeights(period: string): Promise<PeriodWeights | null> {
  const { data } = await supabase.from("period_weights").select("*").eq("period", period).maybeSingle();
  return (data as PeriodWeights) ?? null;
}

/** Alla periodvikter (≤ ett tiotal rader) — för källpaneler över blandade perioder. */
export async function getAllPeriodWeights(): Promise<PeriodWeights[]> {
  const { data } = await supabase.from("period_weights").select("*").order("period").range(0, 99);
  return (data ?? []) as PeriodWeights[];
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

/** Percentil för ett värde mot betygsatta avtal i perioden (anroparen filtrerar
 *  allScores till rating !== null). RoM Insights beräkning. */
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

/** Marknads-KPI:er per period för utvecklingskurvan. Perioderna hämtas
 *  parallellt (sekventiellt var en av startsidans tyngsta väntningar). */
export async function getMarketSeries(periods: string[]) {
  const perPeriod = await Promise.all(periods.map((p) => getPeriodRows(p)));
  return periods.map((period, i) => {
    const rows = perPeriod[i];
    return {
      period,
      contracts: rows.length,
      suppliers: new Set(rows.map((r) => r.supplier)).size,
      participants: rows.reduce((s, r) => s + (r.participants ?? 0), 0),
    };
  });
}

/** Kommun → leveransområde (AF:s leveransområdesdokument, laddad av systerprojektet). */
export async function getMunicipalities(): Promise<Municipality[]> {
  const { data } = await supabase
    .from("delivery_area_municipalities")
    .select("kommun, delivery_area")
    .order("kommun")
    .range(0, 499);
  return (data ?? []) as Municipality[];
}

export async function getAreaMunicipalities(area: string): Promise<string[]> {
  const { data } = await supabase
    .from("delivery_area_municipalities")
    .select("kommun")
    .eq("delivery_area", area)
    .order("kommun");
  return (data ?? []).map((r) => r.kommun as string);
}

/** Leverantörens kontor (AF:s sök-leverantör-data via systerprojektet). */
export async function getSupplierOffices(supplierId: number): Promise<Office[]> {
  const { data } = await supabase
    .from("offices")
    .select("id, supplier_name, supplier_id, adressrad, postnummer, postort, latitude, longitude, nyval_tillatet")
    .eq("supplier_id", supplierId)
    .order("postort")
    .range(0, 499);
  return (data ?? []) as Office[];
}

/**
 * Radarn: ögonblicksbilder av AF:s sök leverantör-tjänst (vår additiva tabell).
 * Statistikfilerna släpar upp till två månader; söktjänsten ändras när AF agerar.
 */
export async function getRadarDates(): Promise<string[]> {
  const dates: string[] = [];
  let cursor: string | null = null;
  for (;;) {
    let q = supabase
      .from("sokleverantor_snapshots")
      .select("snapshot_date")
      .order("snapshot_date", { ascending: true })
      .limit(1);
    if (cursor) q = q.gt("snapshot_date", cursor);
    const { data } = await q;
    if (!data?.length) break;
    cursor = data[0].snapshot_date as string;
    dates.push(cursor);
  }
  return dates;
}

/** Senaste radar-kontrolldatumet i ETT anrop (getRadarDates markörloop växer
 *  med varje veckosnapshot; profilsidan behöver bara det senaste). */
export async function getLatestRadarDate(): Promise<string | null> {
  const { data } = await supabase
    .from("sokleverantor_snapshots")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.snapshot_date as string) ?? null;
}

export async function getRadarRows(date: string): Promise<RadarSnapshotRow[]> {
  const out: RadarSnapshotRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("sokleverantor_snapshots")
      .select("snapshot_date, af_leverantor_id, supplier_name, supplier_id, offices_count, any_nyval")
      .eq("snapshot_date", date)
      .order("af_leverantor_id", { ascending: true })
      .range(from, from + 999);
    out.push(...((data ?? []) as RadarSnapshotRow[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Kontorsnivån för ett kontrolldatum. Tom lista = ingen kontorssnapshot den dagen
 *  (kontorsnivån började samlas 2026-07-03; veckorutinen kan släpa tills scopet vidgats). */
export async function getRadarOfficeRows(date: string): Promise<OfficeSnapshotRow[]> {
  const out: OfficeSnapshotRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("sokleverantor_office_snapshots")
      .select("snapshot_date, af_leverantor_id, supplier_name, postort, address, nyval")
      .eq("snapshot_date", date)
      .order("af_leverantor_id", { ascending: true })
      .order("postort", { ascending: true })
      .order("address", { ascending: true })
      .range(from, from + 999);
    out.push(...((data ?? []) as OfficeSnapshotRow[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function getNameVariants(): Promise<NameVariant[]> {
  const { data } = await supabase.from("supplier_name_variants").select("variant, supplier_id").range(0, 999);
  return (data ?? []) as NameVariant[];
}

/**
 * Leverantörer med avtal i statistiken som inte syns i radar-snapshotten.
 * Matchar via supplier_id, kanoniskt namn OCH kända namnvarianter åt båda hållen —
 * ett namnbyte får aldrig se ut som en försvunnen leverantör.
 */
export function radarMissingSuppliers(
  statsRows: RomResult[],
  radar: RadarSnapshotRow[],
  suppliers: Supplier[],
  variants: NameVariant[],
): Supplier[] {
  const radarIds = new Set(radar.map((r) => r.supplier_id).filter((v): v is number => v !== null));
  const radarNames = new Set(radar.map((r) => r.supplier_name.toLowerCase()));
  const byId = new Map(suppliers.map((s) => [s.id, s]));
  const variantsBySupplier = new Map<number, string[]>();
  const supplierByVariant = new Map<string, number>();
  for (const v of variants) {
    variantsBySupplier.set(v.supplier_id, [...(variantsBySupplier.get(v.supplier_id) ?? []), v.variant.toLowerCase()]);
    supplierByVariant.set(v.variant.toLowerCase(), v.supplier_id);
  }
  const statsNames = new Set(statsRows.map((r) => r.supplier));
  return suppliers
    .filter((s) => {
      if (!statsNames.has(s.name)) return false;
      if (radarIds.has(s.id)) return false;
      if (radarNames.has(s.name.toLowerCase())) return false;
      // Egen variant syns i söktjänsten?
      if ((variantsBySupplier.get(s.id) ?? []).some((v) => radarNames.has(v))) return false;
      // Statistiknamnet är en variant av annan leverantör vars kanoniska namn syns?
      const canonicalId = supplierByVariant.get(s.name.toLowerCase());
      if (canonicalId !== undefined) {
        const canonical = byId.get(canonicalId);
        if (canonical && (radarIds.has(canonical.id) || radarNames.has(canonical.name.toLowerCase()))) return false;
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

/**
 * Leverantörer som syns i söktjänsten men saknar synligt kontor i minst ett
 * av sina avtalsområden (AAA-fallet: kontor kvar i Landskrona, avtal i
 * Stockholm). Kontor mappas till område via postort = kommunnamn — medvetet
 * KONSERVATIVT: kan inte leverantörens samtliga kontorsorter mappas till en
 * kommun görs inget påstående alls (hellre saknad flagga än fel råd).
 */
export interface RadarCoverageGap {
  supplier: Supplier;
  officePostorter: string[];
  contractAreas: string[];
  uncoveredAreas: string[];
}

export function radarCoverageGaps(
  statsRows: RomResult[],
  officeRows: OfficeSnapshotRow[],
  municipalities: Municipality[],
  suppliers: Supplier[],
  variants: NameVariant[],
): RadarCoverageGap[] {
  const areaByKommun = new Map(municipalities.map((m) => [m.kommun.toLowerCase(), m.delivery_area]));
  const supplierByName = new Map(suppliers.map((s) => [s.name.toLowerCase(), s]));
  const byId = new Map(suppliers.map((s) => [s.id, s]));
  for (const v of variants) {
    const s = byId.get(v.supplier_id);
    if (s) supplierByName.set(v.variant.toLowerCase(), s);
  }

  const officesBySupplier = new Map<number, OfficeSnapshotRow[]>();
  for (const o of officeRows) {
    const s = supplierByName.get(o.supplier_name.toLowerCase());
    if (!s) continue;
    officesBySupplier.set(s.id, [...(officesBySupplier.get(s.id) ?? []), o]);
  }

  const contractAreasBySupplier = new Map<string, Set<string>>();
  for (const r of statsRows) {
    let set = contractAreasBySupplier.get(r.supplier);
    if (!set) {
      set = new Set();
      contractAreasBySupplier.set(r.supplier, set);
    }
    set.add(r.delivery_area);
  }

  const gaps: RadarCoverageGap[] = [];
  for (const [supplierName, contractAreas] of contractAreasBySupplier) {
    const sup = supplierByName.get(supplierName.toLowerCase());
    if (!sup) continue;
    const offices = officesBySupplier.get(sup.id);
    if (!offices || offices.length === 0) continue; // helt osynlig — egen lista
    const postorter = Array.from(new Set(offices.map((o) => o.postort))).sort((a, b) => a.localeCompare(b, "sv"));
    const officeAreas = postorter.map((p) => areaByKommun.get(p.toLowerCase()));
    if (officeAreas.some((a) => a === undefined)) continue; // omappbar kontorsort → inget påstående
    const covered = new Set(officeAreas as string[]);
    // Påstå bara "saknar kontor" om avtalsområdet självt finns i kommunmappningen —
    // annars kan täckning inte avgöras (samma försiktighetsregel som för kontorsorterna).
    const mappableAreas = new Set(municipalities.map((m) => m.delivery_area));
    const uncovered = Array.from(contractAreas)
      .filter((a) => mappableAreas.has(a) && !covered.has(a))
      .sort((a, b) => a.localeCompare(b, "sv"));
    if (uncovered.length) {
      gaps.push({
        supplier: sup,
        officePostorter: postorter,
        contractAreas: Array.from(contractAreas).sort((a, b) => a.localeCompare(b, "sv")),
        uncoveredAreas: uncovered,
      });
    }
  }
  return gaps.sort((a, b) => a.supplier.name.localeCompare(b.supplier.name, "sv"));
}

/** Syns leverantören i senaste radar-snapshotten? null = ingen snapshot finns. */
export async function getSupplierRadarStatus(
  sup: Supplier,
  variants: NameVariant[],
): Promise<{ checked: string; present: boolean } | null> {
  const latest = await getLatestRadarDate();
  if (!latest) return null;
  const names = [sup.name, ...variants.filter((v) => v.supplier_id === sup.id).map((v) => v.variant)];
  const [byId, byName] = await Promise.all([
    supabase.from("sokleverantor_snapshots").select("id").eq("snapshot_date", latest).eq("supplier_id", sup.id).limit(1),
    supabase.from("sokleverantor_snapshots").select("id").eq("snapshot_date", latest).in("supplier_name", names).limit(1),
  ]);
  const present = Boolean(byId.data?.length || byName.data?.length);
  return { checked: latest, present };
}

/** Alla avtalsserier (kompakt) för konstellationsmolnet. Perioderna hämtas
 *  parallellt — sekventiellt var den tyngsta väntan på startsidan och /jamfor. */
export async function getAllCloudSeries(periods: string[]): Promise<CloudSeries[]> {
  const perPeriod = await Promise.all(periods.map((p) => getPeriodRows(p)));
  const byKey = new Map<string, CloudSeries>();
  for (let i = 0; i < periods.length; i++) {
    for (const r of perPeriod[i]) {
      const key = `${r.supplier}|${r.delivery_area}`;
      let s = byKey.get(key);
      if (!s) {
        s = { supplier: r.supplier, delivery_area: r.delivery_area, values: new Array(periods.length).fill(null) };
        byKey.set(key, s);
      }
      s.values[i] = r.weighted_score !== null ? Math.round(r.weighted_score * 1000) / 1000 : null;
    }
  }
  return Array.from(byKey.values());
}
