"use client";

import { useState } from "react";
import { PeriodWeights } from "@/lib/types";
import { formatScore } from "@/lib/format";
import { AF_TERMINATION_THRESHOLD } from "@/lib/afRules";

/**
 * T5 interaktiv: dra i antalet ytterligare godkända resultatredovisningar och
 * se det viktade måttet räknas om live. Samma verifierade formel som resten av
 * "Vad krävs?" — ett resultat väger olika per nivå (A lägst, C högst), därför
 * ett spann. `target` är målet i viktat resultat (0,2-tröskeln som standard;
 * områdessnitt/konkurrent/topp på /vad-kravs).
 */

export function WhatIfSlider({
  currentWeightedSum,
  participants,
  weights,
  start,
  max,
  target = AF_TERMINATION_THRESHOLD,
}: {
  currentWeightedSum: number;
  participants: number;
  weights: PeriodWeights;
  start: number;
  max: number;
  target?: number;
}) {
  const [n, setN] = useState(start);
  const lo = (currentWeightedSum + n * weights.weight_a) / (2 * participants);
  const hi = (currentWeightedSum + n * weights.weight_c) / (2 * participants);
  const guaranteed = lo >= target;
  const possible = hi >= target;
  // AF:s tröskel skrivs "0,2" i prosa överallt — undvik formatScores "0,200" här.
  const targetLabel = target === AF_TERMINATION_THRESHOLD ? "tröskeln" : formatScore(target);

  return (
    <div className="no-print mt-3 pt-3 border-t border-[var(--line-soft)]">
      <label className="flex items-center gap-3 text-sm">
        <span className="mono-label shrink-0">Testa själv</span>
        <input
          type="range"
          min={0}
          max={max}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          aria-label="Antal ytterligare godkända resultatredovisningar"
          className="flex-1"
          style={{ accentColor: "var(--signal)" }}
        />
        <span className="tabular-nums w-12 text-right shrink-0">+{n}</span>
      </label>
      <p className="text-sm mt-2 tabular-nums">
        → viktat <strong>{formatScore(lo)}</strong>
        {hi > lo && (
          <>
            {" "}till <strong>{formatScore(hi)}</strong>
          </>
        )}{" "}
        <span className="text-xs text-[var(--text-dim)]">(alla i nivå A resp. nivå C)</span>{" "}
        {guaranteed ? (
          <span style={{ color: "var(--positive)" }}>✓ når {targetLabel} oavsett nivå</span>
        ) : possible ? (
          <span style={{ color: "var(--risk)" }}>kan räcka — beror på deltagarnas nivå</span>
        ) : (
          <span className="text-[var(--text-dim)]">fortfarande under {targetLabel}</span>
        )}
      </p>
    </div>
  );
}
