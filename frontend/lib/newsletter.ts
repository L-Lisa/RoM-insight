import { RomResult } from "@/lib/types";
import { diffPeriods, getPeriodRows, getPeriods } from "@/lib/queries";

/**
 * Marknadsbrevet som blogg: varje nummer byggs deterministiskt ur två perioders
 * data enligt mallens fem sektioner. Ingen LLM — varje siffra är exakt per
 * definition (guardrails lager 3). Sektionsordning och skrivregler ur
 * marknadsbrevet-mall.md: inga värderande adjektiv, "lägst" aldrig "sämst",
 * period alltid angiven.
 */

export interface Mover {
  supplier: string;
  delivery_area: string;
  from: number;
  to: number;
  delta: number;
}

export interface Issue {
  period: string;      // "2026-05-01"
  prevPeriod: string;
  slug: string;        // "2026-05"
  contractsPrev: number;
  contractsCurr: number;
  entered: number;
  left: number;
  ratingChanges: number;
  riskPrev: number;
  riskCurr: number;
  lifts: Mover[];
  drops: Mover[];
  ratedCount: number;
  lowestRatingCount: number;
  lowestRatingShare: number; // procent
}

function riskCount(rows: RomResult[]): number {
  return rows.filter(
    (r) => (r.rating === null || r.rating === 1) && r.weighted_score !== null && r.weighted_score < 0.2,
  ).length;
}

export function buildIssue(prev: RomResult[], curr: RomResult[], prevPeriod: string, period: string): Issue {
  const key = (r: RomResult) => r.ka_number ?? `${r.supplier}|${r.delivery_area}`;
  const prevMap = new Map(prev.map((r) => [key(r), r]));

  const movers: Mover[] = [];
  for (const c of curr) {
    const p = prevMap.get(key(c));
    if (p && c.weighted_score !== null && p.weighted_score !== null) {
      movers.push({
        supplier: c.supplier,
        delivery_area: c.delivery_area,
        from: p.weighted_score,
        to: c.weighted_score,
        delta: c.weighted_score - p.weighted_score,
      });
    }
  }
  movers.sort((a, b) => b.delta - a.delta);

  const events = diffPeriods(prev, curr, prevPeriod, period);
  const rated = curr.filter((r) => r.rating !== null);
  const lowest = rated.filter((r) => r.rating === 1);

  return {
    period,
    prevPeriod,
    slug: period.slice(0, 7),
    contractsPrev: prev.length,
    contractsCurr: curr.length,
    entered: events.filter((e) => e.type === "entered").length,
    left: events.filter((e) => e.type === "left").length,
    ratingChanges: events.filter((e) => e.type === "rating_changed").length,
    riskPrev: riskCount(prev),
    riskCurr: riskCount(curr),
    lifts: movers.slice(0, 3),
    drops: movers.slice(-3).reverse(),
    ratedCount: rated.length,
    lowestRatingCount: lowest.length,
    lowestRatingShare: rated.length ? Math.round((lowest.length / rated.length) * 100) : 0,
  };
}

/** Alla nummer, nyast först. */
export async function getAllIssues(): Promise<Issue[]> {
  const periods = await getPeriods();
  const rows = await Promise.all(periods.map((p) => getPeriodRows(p)));
  const issues: Issue[] = [];
  for (let i = periods.length - 1; i > 0; i--) {
    issues.push(buildIssue(rows[i - 1], rows[i], periods[i - 1], periods[i]));
  }
  return issues;
}

export async function getIssue(slug: string): Promise<Issue | null> {
  const issues = await getAllIssues();
  return issues.find((i) => i.slug === slug) ?? null;
}
