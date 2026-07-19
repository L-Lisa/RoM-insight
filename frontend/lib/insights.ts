import { RomResult } from "@/lib/types";
import { formatScore, periodLabel } from "@/lib/format";
import { AF_TERMINATION_THRESHOLD_LABEL } from "@/lib/afRules";

/**
 * T2 (v1): deterministiska insiktstexter.
 * Guardrails lager 3: ingen LLM i körvägen — varje mening byggs av kod ur
 * förberäknade värden, så varje siffra och riktningsord är exakt per definition.
 * Tystnadsregeln: färre än två datapunkter → ingen trendtext alls.
 */

export interface ContractInsight {
  text: string | null;
  direction: "up" | "down" | "flat" | null;
}

export function contractInsight(series: RomResult[]): ContractInsight {
  const points = series
    .filter((r) => r.weighted_score !== null && r.weighted_score !== undefined)
    .sort((a, b) => a.dataset_date.localeCompare(b.dataset_date));

  if (points.length < 2) return { text: null, direction: null };

  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const delta = last.weighted_score - prev.weighted_score;

  // Räkna raka perioder i samma riktning
  let streak = 1;
  for (let i = points.length - 1; i > 0; i--) {
    const d = points[i].weighted_score - points[i - 1].weighted_score;
    if ((delta >= 0 && d > 0) || (delta < 0 && d < 0)) streak++;
    else break;
  }

  const best = Math.max(...points.map((p) => p.weighted_score));
  const isBest = last.weighted_score === best && delta > 0;

  const parts: string[] = [];
  const name = `${last.supplier} i ${last.delivery_area}`;

  if (Math.abs(delta) < 0.005) {
    parts.push(`${name} ligger stabilt: ${formatScore(last.weighted_score)} i ${periodLabel(last.dataset_date)} (${formatScore(prev.weighted_score)} perioden innan).`);
  } else if (delta > 0) {
    parts.push(
      streak >= 3
        ? `${name} förbättras för ${streak}:e perioden i rad — ${formatScore(last.weighted_score)} i ${periodLabel(last.dataset_date)}.`
        : `${name} ökade till ${formatScore(last.weighted_score)} i ${periodLabel(last.dataset_date)}, från ${formatScore(prev.weighted_score)}.`,
    );
    if (isBest) parts.push("Bästa resultatet hittills i serien.");
  } else {
    parts.push(
      streak >= 3
        ? `${name} tappar för ${streak}:e perioden i rad — ${formatScore(last.weighted_score)} i ${periodLabel(last.dataset_date)}.`
        : `${name} sjönk till ${formatScore(last.weighted_score)} i ${periodLabel(last.dataset_date)}, från ${formatScore(prev.weighted_score)}.`,
    );
  }

  // Riskzonsfakta (AF:s publika kriterier) — endast när AF-data finns
  const ratingLow = last.rating === 1 || last.rating === null;
  if (last.weighted_score < 0.2 && ratingLow) {
    parts.push(
      `Avtalet uppfyller två av Arbetsförmedlingens hävningskriterier (betyg ${last.rating ?? "saknas"}, viktat resultat under ${AF_TERMINATION_THRESHOLD_LABEL}). Informativ beräkning, inte myndighetens bedömning.`,
    );
  }

  return { text: parts.join(" "), direction: delta > 0.005 ? "up" : delta < -0.005 ? "down" : "flat" };
}

/** Marknadsinsikt för startsidan. Kräver ≥2 perioder (tystnadsregeln). */
export function marketInsight(series: { period: string; contracts: number; suppliers: number; participants: number }[]): string | null {
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const drop = Math.round(((first.contracts - last.contracts) / first.contracts) * 100);
  const partDrop = Math.round(((first.participants - last.participants) / first.participants) * 100);
  if (last.contracts < first.contracts) {
    return `Marknaden krymper: ${first.contracts} avtal i ${periodLabel(first.period)} har blivit ${last.contracts} i ${periodLabel(last.period)} (−${drop} %). Deltagarvolymen har minskat ${partDrop} % under samma tid.`;
  }
  return `${last.contracts} avtal i ${periodLabel(last.period)} (${first.contracts} i ${periodLabel(first.period)}).`;
}
