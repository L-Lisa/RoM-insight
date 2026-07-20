import { PeriodWeights, RomResult } from "./types";

/**
 * "Vad krävs?"-matematiken — EN definition, delad mellan riskzonskorten
 * (WhatIsNeeded) och /vad-kravs. Guardrails punkt 11: enbart deterministisk
 * aritmetik mot AF:s publika formel, verifierad mot samtliga 7 084 publicerade
 * värden:
 *   resultatmått = Σ((RR1+RR2) × vikt per nivå) ÷ (2 × antal deltagare)
 * Vikterna är dynamiska per period och läses ur AF:s fil.
 *
 * VIKTIGT: bara det VIKTADE resultatet går att räkna fram. Betyg sätts av AF
 * som en relativ bedömning och går ALDRIG att lova via den här matematiken —
 * ytorna som visar mål måste hålla isär "nå ett viktat värde" (räknebart) och
 * "få fyra stjärnor" (AF:s omdöme, ej räknebart).
 */

/** Nuvarande viktade resultatsumma (täljaren före ÷ 2×deltagare). Null om
 *  nivådata saknas — då kan inget räknas och ytan ska säga det rakt ut. */
export function weightedSum(c: RomResult, weights: PeriodWeights): number | null {
  const levels = [c.rr1_a, c.rr2_a, c.rr1_b, c.rr2_b, c.rr1_c, c.rr2_c];
  if (levels.some((v) => v === null || v === undefined)) return null;
  return (
    ((c.rr1_a ?? 0) + (c.rr2_a ?? 0)) * weights.weight_a +
    ((c.rr1_b ?? 0) + (c.rr2_b ?? 0)) * weights.weight_b +
    ((c.rr1_c ?? 0) + (c.rr2_c ?? 0)) * weights.weight_c
  );
}

export interface Requirement {
  /** Viktad summa som saknas upp till målet. */
  neededWeighted: number;
  /** Färst godkända resultat som räcker (alla i nivå C, som väger tyngst). */
  fewest: number;
  /** Flest som kan behövas (alla i nivå A, som väger lättast). */
  most: number;
}

/**
 * Hur många fler godkända resultatredovisningar (RR1 eller RR2) som krävs för
 * att lyfta det viktade resultatet från `currentWeightedSum` till `targetScore`,
 * på nuvarande deltagarvolym. Ett resultat väger olika per nivå → ett spann.
 * Returnerar null om målet redan är nått (eller deltagarvolymen är 0).
 */
export function requiredResults(
  currentWeightedSum: number,
  participants: number,
  weights: PeriodWeights,
  targetScore: number,
): Requirement | null {
  if (participants <= 0) return null;
  const neededWeighted = targetScore * 2 * participants - currentWeightedSum;
  if (neededWeighted <= 0) return null;
  return {
    neededWeighted,
    fewest: Math.ceil(neededWeighted / weights.weight_c),
    most: Math.ceil(neededWeighted / weights.weight_a),
  };
}
