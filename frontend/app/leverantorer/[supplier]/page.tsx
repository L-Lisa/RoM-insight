import { notFound } from "next/navigation";
import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { explain } from "@/lib/tooltips";
import { TrendChart } from "@/components/TrendChart";
import { PercentileBar } from "@/components/PercentileBar";
import { RatingBadge, RiskBadge, DirectionArrow } from "@/components/Badges";
import { DataStamp } from "@/components/DataStamp";
import { WhatIsNeeded } from "@/components/WhatIsNeeded";
import { PrintButton } from "@/components/PrintButton";
import { CompareButton } from "@/components/CompareButton";
import { ShowSource } from "@/components/ShowSource";
import { SourceBreakdown } from "@/components/SourceBreakdown";
import {
  getAllPeriodWeights,
  getLatestPeriod,
  getMunicipalities,
  getNameVariants,
  getPeriodRows,
  getPeriodWeights,
  getRadarOfficeRows,
  getSupplierBySlug,
  getSupplierOffices,
  getSupplierRadarStatus,
  getSupplierRatingHistory,
  getSupplierResults,
  getSuppliers,
  percentileOf,
  radarCoverageGaps,
  RadarCoverageGap,
} from "@/lib/queries";
import { contractInsight } from "@/lib/insights";
import { formatScore, isRankable, periodLabel, periodShort, slugify } from "@/lib/format";
import { MAX_COMPARE } from "@/lib/compare";
import { RomResult } from "@/lib/types";

export const revalidate = 3600;

interface Props {
  params: Promise<{ supplier: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { supplier } = await params;
  const sup = await resolveSupplier(supplier);
  if (!sup) return { title: "Leverantör" };
  const s = sup.name;
  const og = `/og?${new URLSearchParams({ title: s, sub: "Betyg, viktat resultat och trend per leveransområde i Rusta och matcha" })}`;
  return {
    title: `${s} — betyg och resultat i Rusta och matcha`,
    description: `${s}: betyg, viktat resultatmått och trend per leveransområde i Rusta och matcha. Data: Arbetsförmedlingen.`,
    openGraph: { title: s, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
  };
}

async function resolveSupplier(param: string) {
  const decoded = decodeURIComponent(param);
  const bySlug = await getSupplierBySlug(decoded);
  if (bySlug) return bySlug;
  // Bakåtkompatibilitet: gamla länkar använde URL-kodat namn
  const suppliers = await getSuppliers();
  return suppliers.find((s) => s.name === decoded || s.slug === slugify(decoded)) ?? null;
}

export default async function SupplierPage({ params }: Props) {
  const { supplier: raw } = await params;
  const sup = await resolveSupplier(raw);
  if (!sup) notFound();
  const name = sup.name;

  const [rows, ratings, latestPeriod, offices, variants] = await Promise.all([
    getSupplierResults(name),
    getSupplierRatingHistory(name),
    getLatestPeriod(),
    getSupplierOffices(sup.id),
    getNameVariants(),
  ]);
  if (!rows.length) notFound();
  const radarStatus = await getSupplierRadarStatus(sup, variants);

  const latestAll = latestPeriod ? await getPeriodRows(latestPeriod) : [];
  const weights = latestPeriod ? await getPeriodWeights(latestPeriod) : null;
  const weightsByPeriod = new Map((await getAllPeriodWeights()).map((w) => [w.period, w]));
  // Percentil och områdessnitt räknas ENDAST mot betygsatta avtal (betygsregeln,
  // isRankable) — under AF:s betygsvillkor är viktat resultat inte jämförbart.
  const allScores = latestAll
    .filter(isRankable)
    .map((r) => r.weighted_score)
    .filter((v): v is number => v !== null && v !== undefined);
  // C2: benchmark mot områdets snitt (RoM Insights beräkning, oviktat medel)
  const areaAvg = new Map<string, number>();
  {
    const acc = new Map<string, number[]>();
    for (const r of latestAll) {
      if (r.weighted_score !== null && isRankable(r)) acc.set(r.delivery_area, [...(acc.get(r.delivery_area) ?? []), r.weighted_score]);
    }
    for (const [a, v] of acc) areaAvg.set(a, v.reduce((x, y) => x + y, 0) / v.length);
  }

  // Områdessidan finns bara för områden i senaste perioden — historiska
  // områden länkas inte (annars 404 via notFound på områdessidan).
  const currentAreas = new Set(latestAll.map((r) => r.delivery_area));

  const latestRows = rows.filter((r) => r.dataset_date === latestPeriod);
  const isExited = latestRows.length === 0;
  const lastSeen = rows[rows.length - 1].dataset_date;

  // AAA-fallet: syns i söktjänsten, men utan kontor i sina avtalsområden
  let coverageGap: RadarCoverageGap | null = null;
  if (radarStatus?.present && !isExited && latestRows.length) {
    const [officeRows, municipalities] = await Promise.all([
      getRadarOfficeRows(radarStatus.checked),
      getMunicipalities(),
    ]);
    coverageGap = radarCoverageGaps(latestRows, officeRows, municipalities, [sup], variants)[0] ?? null;
  }

  // Per avtal (område): serie + senaste värde
  const byArea = new Map<string, RomResult[]>();
  for (const r of rows) {
    byArea.set(r.delivery_area, [...(byArea.get(r.delivery_area) ?? []), r]);
  }
  const areas = Array.from(byArea.entries())
    .map(([area, series]) => ({
      area,
      series,
      latest: series[series.length - 1],
      insight: contractInsight(series),
    }))
    .sort((a, b) => {
      // Betygsatta avtal först — utan betyg är viktat resultat inte jämförbart.
      const aRated = a.latest.rating !== null ? 0 : 1;
      const bRated = b.latest.rating !== null ? 0 : 1;
      if (aRated !== bRated) return aRated - bRated;
      return (b.latest.weighted_score ?? 0) - (a.latest.weighted_score ?? 0);
    });

  const biggest = [...areas].sort((a, b) => (b.latest.participants ?? 0) - (a.latest.participants ?? 0))[0];

  // Betygsmatris: område × period ur betygshistoriken
  const ratingPeriods = Array.from(new Set(ratings.map((r) => r.period))).sort();
  const ratingAreas = Array.from(new Set(ratings.map((r) => r.delivery_area))).sort();

  const compareKeys = areas.slice(0, MAX_COMPARE).map((a) => `${name}|${a.area}`).join(",");

  return (
    <div className="space-y-8">
      <div>
        <Link href="/leverantorer" className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]">
          ← Alla leverantörer
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <span className="ml-auto"><PrintButton /></span>
          {isExited && (
            <span className="text-xs px-2 py-1 rounded-[var(--radius-badge)]" style={{ background: "rgba(224,108,108,0.12)", color: "var(--terminated)", border: "1px solid rgba(224,108,108,0.35)" }}>
              Utgången ur statistiken, sista data {periodLabel(lastSeen)}
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          {isExited
            ? `Fanns i statistiken t.o.m. ${periodLabel(lastSeen)}. Varför avtalen lämnat statistiken framgår inte av Arbetsförmedlingens filer.`
            : `${latestRows.length} avtal i ${latestRows.length} ${latestRows.length === 1 ? "område" : "områden"} (${periodLabel(latestPeriod!)})${byArea.size > latestRows.length ? ` · ${byArea.size} områden historiskt` : ""}`}
        </p>
        <div className="mt-2"><DataStamp period={isExited ? lastSeen : latestPeriod} /></div>
      </div>

      {!isExited && radarStatus && !radarStatus.present && (
        <div className="card p-4 text-sm leading-relaxed">
          <span className="mono-label block mb-1">
            <Tooltip label="Radarn" layers={explain.radarn} />
          </span>
          Syntes inte i Arbetsförmedlingens söktjänst vid senaste kontrollen (
          {new Date(`${radarStatus.checked}T12:00:00`).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })}
          ), trots avtal i senaste statistiken. AF publicerar inte orsaken; det kan vara avtal som löpt ut, eget
          utträde, namnbyte eller hävning. Kolla själv i{" "}
          <a
            href="https://arbetsformedlingen.se/for-arbetssokande/extra-stod/stod-a-o/rusta-och-matcha/sok-leverantor-inom-rusta-och-matcha"
            className="link"
            rel="noopener noreferrer"
            target="_blank"
          >
            AF:s söktjänst
          </a>
          . <Link href="/handelser" className="link">Mer i Radarn →</Link>
        </div>
      )}

      {!isExited && coverageGap && (
        <div className="card p-4 text-sm leading-relaxed">
          <span className="mono-label block mb-1">
            <Tooltip label="Radarn" layers={explain.radarn} />
          </span>
          Syns i Arbetsförmedlingens söktjänst (kontor i {coverageGap.officePostorter.join(", ")}), men utan
          synligt kontor i{" "}
          {coverageGap.uncoveredAreas.length === coverageGap.contractAreas.length
            ? "något av avtalsområdena"
            : `${coverageGap.uncoveredAreas.length} av ${coverageGap.contractAreas.length} avtalsområden`}{" "}
          ({coverageGap.uncoveredAreas.join(", ")}) vid senaste kontrollen (
          {new Date(`${radarStatus!.checked}T12:00:00`).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })}
          ). Vad det beror på framgår inte av AF:s data. Kolla själv i{" "}
          <a
            href="https://arbetsformedlingen.se/for-arbetssokande/extra-stod/stod-a-o/rusta-och-matcha/sok-leverantor-inom-rusta-och-matcha"
            className="link"
            rel="noopener noreferrer"
            target="_blank"
          >
            AF:s söktjänst
          </a>
          . <Link href="/handelser" className="link">Mer i Radarn →</Link>
        </div>
      )}

      {!isExited && biggest?.insight.text && (
        <div className="card p-4 text-sm leading-relaxed">
          <span className="mono-label block mb-1">Läget just nu <DirectionArrow direction={biggest.insight.direction} /></span>
          {biggest.insight.text}
          <span className="block text-xs text-[var(--text-dim)] mt-2">
            Automatiskt formulerad ur AF:s siffror (största avtalet). Varje tal är spårbart till källfilen.
          </span>
        </div>
      )}

      <section>
        <h2 className="text-base font-medium mb-3">
          Avtal per leveransområde {latestPeriod && !isExited && <span className="text-[var(--text-dim)] font-normal">— {periodLabel(latestPeriod)}</span>}
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-left">
              <tr className="border-b border-[var(--line)]">
                <th className="mono-label px-4 py-3 font-normal"><Tooltip label="Område" layers={explain.leveransomrade} /></th>
                <th className="mono-label px-4 py-3 font-normal text-right"><Tooltip label="Viktat" layers={explain.viktatResultat} /></th>
                <th className="mono-label px-4 py-3 font-normal text-right"><Tooltip label="Percentil" layers={explain.percentil} /></th>
                <th className="mono-label px-4 py-3 font-normal text-right">Mot områdets snitt</th>
                <th className="mono-label px-4 py-3 font-normal text-right"><Tooltip label="Betyg" layers={explain.betyg} /></th>
                <th className="mono-label px-4 py-3 font-normal text-right">Deltagare</th>
                <th className="mono-label px-4 py-3 font-normal text-center"><Tooltip label="Risk" layers={explain.riskflagga} /></th>
                <th className="mono-label px-4 py-3 font-normal text-right">Trend</th>
                <th className="mono-label px-2 py-3 font-normal text-center" aria-label="Jämför" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-soft)]">
              {areas.map(({ area, latest, insight }) => (
                <tr key={area} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="px-4 py-3">
                    {currentAreas.has(area) ? (
                      <Link href={`/leveransomraden/${encodeURIComponent(area)}`} className="hover:text-[var(--compare-1)]">
                        {area}
                      </Link>
                    ) : (
                      area
                    )}
                    {latest.dataset_date !== latestPeriod && (
                      <span className="ml-2 text-xs text-[var(--text-faint)] whitespace-nowrap">
                        t.o.m. {periodLabel(latest.dataset_date)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ShowSource row={latest} weights={weightsByPeriod.get(latest.dataset_date) ?? null} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--text-dim)]">
                    {latest.dataset_date === latestPeriod && latest.weighted_score !== null && latest.rating !== null
                      ? `${percentileOf(latest.weighted_score, allScores)} %`
                      : "–"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--text-dim)]">
                    {(() => {
                      const avg = areaAvg.get(area);
                      if (avg === undefined || latest.weighted_score === null || latest.rating === null || latest.dataset_date !== latestPeriod) return "–";
                      const rel = Math.round(((latest.weighted_score - avg) / avg) * 100);
                      return rel > 0 ? `+${rel} %` : `${rel} %`;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right"><RatingBadge rating={latest.rating} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{latest.participants}</td>
                  <td className="px-4 py-3 text-center"><RiskBadge risk={latest.risk_of_termination} /></td>
                  <td className="px-4 py-3 text-right"><DirectionArrow direction={insight.direction} /></td>
                  <td className="px-2 py-3 text-center"><CompareButton supplier={name} area={area} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isExited && biggest && biggest.latest.dataset_date === latestPeriod && (
          <p className="text-sm mt-3">
            <Link
              href={`/vad-kravs?avtal=${encodeURIComponent(`${name}|${biggest.area}`)}`}
              className="link"
            >
              Vad krävs för att nå tröskeln, snittet eller toppen? →
            </Link>
          </p>
        )}
      </section>

      {!isExited && biggest && biggest.latest.dataset_date === latestPeriod && biggest.latest.weighted_score !== null && (
        <section className="card p-5">
          <h2 className="text-base font-medium mb-1">
            Så räknas resultatet <span className="text-[var(--text-dim)] font-normal">— största avtalet ({biggest.area}, {periodLabel(biggest.latest.dataset_date)})</span>
          </h2>
          <p className="text-sm text-[var(--text-dim)] mb-4">
            AF:s nivådata och formeln bakom det viktade resultatet, uträknad live.
          </p>
          <SourceBreakdown row={biggest.latest} weights={weightsByPeriod.get(biggest.latest.dataset_date) ?? null} />
          <p className="text-xs text-[var(--text-dim)]">
            Gäller största avtalet. För övriga avtal: klicka &rdquo;källa&rdquo; vid valfri rad i avtalstabellen ovan.
          </p>
        </section>
      )}

      {!isExited && latestPeriod && (
        <WhatIsNeeded contracts={latestRows} weights={weights} period={latestPeriod} />
      )}

      {!isExited && biggest && latestPeriod && biggest.latest.dataset_date === latestPeriod && biggest.latest.weighted_score !== null && biggest.latest.rating !== null && (
        <section className="card p-5">
          <h2 className="text-base font-medium mb-3">
            Position i marknaden <span className="text-[var(--text-dim)] font-normal">— största avtalet ({biggest.area})</span>
          </h2>
          <PercentileBar
            value={biggest.latest.weighted_score}
            allScores={allScores}
            percentile={percentileOf(biggest.latest.weighted_score, allScores)}
          />
          <p className="text-xs text-[var(--text-dim)] mt-3">
            Viktat resultat {formatScore(biggest.latest.weighted_score)} · Percentilen är RoM Insights beräkning mot de {allScores.length} betygsatta avtalen i perioden, inte ett AF-mått. Avtal utan betyg ingår inte: under AF:s betygsvillkor är underlaget för litet för att jämföras.
          </p>
        </section>
      )}

      <section className="relative">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base font-medium">
            Trend {biggest && <span className="text-[var(--text-dim)] font-normal">— {biggest.area}</span>}
          </h2>
          <Link href={`/jamfor?keys=${encodeURIComponent(compareKeys)}`} className="text-sm link">
            Jämför alla områden →
          </Link>
        </div>
        <div className="card p-4">
          <TrendChart data={biggest?.series ?? []} />
        </div>
      </section>

      {!isExited && latestRows.length > 0 && (
        <section>
          <h2 className="text-base font-medium mb-1">Deltagarprofil &amp; hållbarhet</h2>
          <p className="text-sm text-[var(--text-dim)] mb-3 max-w-3xl">
            Vilka grupper avtalen jobbar med, och hur stor andel av de första resultaten som följts av godkänd
            uppföljning. RoM Insights beräkningar på AF:s nivådata.
          </p>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="text-left">
                <tr className="border-b border-[var(--line)]">
                  <th className="mono-label px-4 py-3 font-normal">Område</th>
                  <th className="mono-label px-4 py-3 font-normal"><Tooltip label="Deltagarmix A/B/C" layers={explain.deltagarmix} /></th>
                  <th className="mono-label px-4 py-3 font-normal text-right">Andel nivå C</th>
                  <th className="mono-label px-4 py-3 font-normal text-right"><Tooltip label="Hållbarhet RR2/RR1" layers={explain.hallbarhet} /></th>
                  <th className="mono-label px-4 py-3 font-normal text-right">RR1 / RR2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line-soft)]">
                {latestRows.map((r) => {
                  const pa = r.participants_a ?? 0, pb = r.participants_b ?? 0, pc = r.participants_c ?? 0;
                  const tot = pa + pb + pc;
                  const rr1 = (r.rr1_a ?? 0) + (r.rr1_b ?? 0) + (r.rr1_c ?? 0);
                  const rr2 = (r.rr2_a ?? 0) + (r.rr2_b ?? 0) + (r.rr2_c ?? 0);
                  return (
                    <tr key={r.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/leveransomraden/${encodeURIComponent(r.delivery_area)}`} className="hover:text-[var(--compare-1)]">
                          {r.delivery_area}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {tot > 0 ? (
                          <span className="inline-flex h-3 w-40 rounded-sm overflow-hidden" title={`A ${pa} · B ${pb} · C ${pc}`}>
                            <span style={{ width: `${(pa / tot) * 100}%`, background: "var(--compare-3)", opacity: 0.55 }} />
                            <span style={{ width: `${(pb / tot) * 100}%`, background: "var(--compare-1)", opacity: 0.7 }} />
                            <span style={{ width: `${(pc / tot) * 100}%`, background: "var(--compare-2)" }} />
                          </span>
                        ) : "–"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{tot > 0 ? `${Math.round((pc / tot) * 100)} %` : "–"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{rr1 > 0 ? `${Math.round((rr2 / rr1) * 100)} %` : "–"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--text-dim)]">{rr1} / {rr2}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--text-dim)] mt-2">
            Mixstapeln: ljusast = nivå A (närmast arbetsmarknaden), mörkast = nivå C. Hållbarheten är en
            underskattning för nya avtal: sena placeringar hinner inte få uppföljning inom mätfönstret.
          </p>
        </section>
      )}

      {offices.length > 0 && (
        <section>
          <h2 className="text-base font-medium mb-1">Kontor</h2>
          <p className="text-sm text-[var(--text-dim)] mb-3">
            {offices.length} kontor enligt Arbetsförmedlingens sök leverantör-data.
          </p>
          <div className="card p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            {offices.map((o) => (
              <div key={o.id} className="py-1">
                <span className="font-medium">{o.postort ?? "Okänd ort"}</span>
                {o.adressrad && <span className="text-[var(--text-dim)]"> · {o.adressrad}</span>}
                {o.nyval_tillatet === false && <span className="text-xs text-[var(--text-faint)]"> · tar ej emot nyval</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {ratingPeriods.length > 0 && (
        <section>
          <h2 className="text-base font-medium mb-3">
            Betygshistorik <span className="text-[var(--text-dim)] font-normal">— {periodLabel(ratingPeriods[0])} till {periodLabel(ratingPeriods[ratingPeriods.length - 1])}</span>
          </h2>
          <div className="card overflow-x-auto relative">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="text-left">
                <tr className="border-b border-[var(--line)]">
                  <th className="mono-label px-4 py-3 font-normal sticky left-0 z-10" style={{ background: "var(--bg-card)" }}>Område</th>
                  {ratingPeriods.map((p) => (
                    <th key={p} className="mono-label px-2 py-3 font-normal text-center">{periodShort(p)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line-soft)]">
                {ratingAreas.map((area) => (
                  <tr key={area}>
                    <td className="px-4 py-2.5 sticky left-0 z-10" style={{ background: "var(--bg-card)" }}>
                      {currentAreas.has(area) ? (
                        <Link href={`/leveransomraden/${encodeURIComponent(area)}`} className="hover:text-[var(--compare-1)]">
                          {area}
                        </Link>
                      ) : (
                        area
                      )}
                    </td>
                    {ratingPeriods.map((p) => {
                      const cell = ratings.find((r) => r.delivery_area === area && r.period === p);
                      return (
                        <td key={p} className="px-2 py-2.5 text-center tabular-nums">
                          {cell ? (
                            cell.rating !== null ? (
                              // Heatmap: betyg = fyllnadsnivå av EN nyans (kravprofil §4e), siffran kvar för exakthet.
                              // rgba = --rating-fill (#7c96f5); opacitet 1→0,24 … 4→0,66
                              <span
                                className="inline-flex w-7 h-6 items-center justify-center rounded-[4px]"
                                aria-label={`Betyg ${cell.rating} av 4`}
                                style={{ background: `rgba(124, 150, 245, ${0.1 + cell.rating * 0.14})` }}
                              >
                                {cell.rating}
                              </span>
                            ) : (
                              <span className="text-[var(--text-faint)]" title="Ej betygsatt ännu">·</span>
                            )
                          ) : <span className="text-[var(--text-faint)]">–</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--text-dim)] mt-2">
            · = ej betygsatt ännu (under betygströskeln) · – = fanns inte i området den perioden
          </p>
        </section>
      )}
    </div>
  );
}
