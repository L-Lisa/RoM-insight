import { PeriodWeights, RomResult } from "@/lib/types";
import { formatScore, periodLabel } from "@/lib/format";
import { WhatIfSlider } from "@/components/WhatIfSlider";
import { AF_TERMINATION_THRESHOLD, AF_TERMINATION_THRESHOLD_LABEL, AF_TERMINATION_MIN_MONTHS } from "@/lib/afRules";

/**
 * T5 "Vad krävs?" — riskzonen som handling, inte bara varning.
 * Guardrails punkt 11: ENDAST deterministisk aritmetik mot AF:s publika villkor.
 * Formeln (verifierad mot samtliga 7 084 publicerade värden):
 *   resultatmått = Σ((RR1+RR2) × vikt per nivå) / (2 × antal deltagare)
 * Vikterna är dynamiska per period och läses ur AF:s fil — saknas de för
 * perioden renderas komponenten INTE (hellre saknad funktion än fel råd).
 */

const THRESHOLD = AF_TERMINATION_THRESHOLD;

export function WhatIsNeeded({
  contracts,
  weights,
  period,
}: {
  contracts: RomResult[];
  weights: PeriodWeights | null;
  period: string;
}) {
  if (!weights) return null;

  const inZone = contracts.filter(
    (c) =>
      c.dataset_date === period &&
      (c.rating === null || c.rating === 1) &&
      c.weighted_score !== null &&
      c.weighted_score < THRESHOLD &&
      c.participants > 0,
  );
  if (!inZone.length) return null;

  return (
    <section>
      <h2 className="text-base font-medium mb-1">Vad krävs?</h2>
      <p className="text-sm text-[var(--text-dim)] mb-3 max-w-3xl">
        Avtal under {AF_TERMINATION_THRESHOLD_LABEL}-tröskeln med betyg 1 eller utan betyg, och ungefär vad som skulle krävas för att nå
        över tröskeln på nuvarande deltagarvolym.
      </p>
      <div className="space-y-3">
        {inZone.map((c) => {
          // Nuvarande viktade resultatsumma och vad som saknas till tröskeln
          const currentWeightedSum =
            ((c.rr1_a ?? 0) + (c.rr2_a ?? 0)) * weights.weight_a +
            ((c.rr1_b ?? 0) + (c.rr2_b ?? 0)) * weights.weight_b +
            ((c.rr1_c ?? 0) + (c.rr2_c ?? 0)) * weights.weight_c;
          const neededWeighted = THRESHOLD * 2 * c.participants - currentWeightedSum;
          if (neededWeighted <= 0) return null;
          // Ett resultat väger olika beroende på deltagarens nivå → intervall
          const fewest = Math.ceil(neededWeighted / weights.weight_c);
          const most = Math.ceil(neededWeighted / weights.weight_a);
          return (
            <div key={c.id} className="card p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{c.delivery_area}</p>
                <p className="text-xs text-[var(--text-dim)] tabular-nums">
                  viktat {formatScore(c.weighted_score)} · {c.participants} deltagare
                  {c.active_22_months === false && ` · avtalet har ännu inte varit aktivt i ${AF_TERMINATION_MIN_MONTHS} månader`}
                </p>
              </div>
              <p className="mt-2">
                För att nå över {AF_TERMINATION_THRESHOLD_LABEL} på nuvarande deltagarvolym krävs ungefär{" "}
                <strong>
                  {fewest === most ? fewest : `${fewest}–${most}`} fler godkända resultatredovisningar
                </strong>{" "}
                — färre om resultaten kommer i nivå C (väger {weights.weight_c.toFixed(2).replace(".", ",")}),
                fler om de kommer i nivå A (väger {weights.weight_a.toFixed(2).replace(".", ",")}).
                Både RR1 och RR2 räknas.
              </p>
              <WhatIfSlider
                currentWeightedSum={currentWeightedSum}
                participants={c.participants}
                weights={weights}
                start={fewest}
                max={most + 10}
              />
              <p className="text-xs text-[var(--text-dim)] mt-2">
                Beräkningsgrund: resultatmått = (RR1+RR2, viktade per nivå A/B/C) ÷ (2 × antal deltagare), med vikterna för{" "}
                {periodLabel(period)} ur Arbetsförmedlingens beräkningsfil. Formeln är verifierad mot
                samtliga publicerade värden. Informativ beräkning utifrån AF:s publicerade villkor — simulerar
                inte myndighetens beslut, och nästa periods deltagarvolym kommer att skilja sig.
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
