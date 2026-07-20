"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PeriodWeights } from "@/lib/types";
import { formatScore, isRankable, slugify } from "@/lib/format";
import { WhatIfSlider } from "@/components/WhatIfSlider";
import { requiredResults } from "@/lib/whatItTakes";
import { AF_TERMINATION_THRESHOLD, AF_TERMINATION_THRESHOLD_LABEL } from "@/lib/afRules";

/**
 * /vad-kravs: en leverantör väljer sitt avtal och ett mål, och ser vad som
 * krävs för att nå dit — deterministiskt ur AF:s formel (lib/whatItTakes).
 * Datahederlighet: bara VIKTAT resultat räknas fram. Betyg sätts av AF och
 * kan aldrig lovas — betygsavsnittet visar bara vad de betygsatta avtalen i
 * området faktiskt ligger på, som kontext, aldrig som ett löfte.
 */

export interface WktContract {
  supplier: string;
  area: string;
  /** Viktat resultat (0–1) eller null. */
  ws: number | null;
  /** Betyg 1–4 eller null. */
  r: number | null;
  /** Antal deltagare i perioden. */
  p: number;
  /** Viktad resultatsumma (täljaren) eller null när nivådata saknas. */
  sum: number | null;
  /** Högsta nåbara viktade resultat på nuvarande deltagarmix, eller null. */
  ceiling: number | null;
}

type Goal =
  | { kind: "threshold" }
  | { kind: "avg" }
  | { kind: "top" }
  | { kind: "competitor"; key: string };

const keyOf = (c: WktContract) => `${c.supplier}|${c.area}`;
/** Betygsregeln (isRankable) + krav på viktat värde för att kunna jämföras. */
const rankable = (c: WktContract) => isRankable({ rating: c.r }) && c.ws !== null;

export function VadKravsExplorer({
  contracts,
  weights,
  periodLabel: period,
  initialKey,
}: {
  contracts: WktContract[];
  weights: PeriodWeights | null;
  periodLabel: string;
  initialKey: string | null;
}) {
  const byKey = useMemo(() => new Map(contracts.map((c) => [keyOf(c), c])), [contracts]);
  const [selectedKey, setSelectedKey] = useState<string | null>(
    initialKey && byKey.has(initialKey) ? initialKey : null,
  );
  const [query, setQuery] = useState("");
  const [goal, setGoal] = useState<Goal>({ kind: "threshold" });

  const selected = selectedKey ? byKey.get(selectedKey) ?? null : null;

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    return contracts
      .filter((c) => c.supplier.toLowerCase().includes(q) || c.area.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          a.supplier.localeCompare(b.supplier, "sv") || a.area.localeCompare(b.area, "sv"),
      )
      .slice(0, 12);
  }, [query, contracts]);

  // Områdeskontext för valt avtal (endast betygsatta rankas — betygsregeln)
  const areaCtx = useMemo(() => {
    if (!selected) return null;
    const inArea = contracts.filter((c) => c.area === selected.area);
    const rated = inArea.filter(rankable);
    const ratedScores = rated.map((c) => c.ws as number);
    const avg = ratedScores.length ? ratedScores.reduce((s, v) => s + v, 0) / ratedScores.length : null;
    const top = ratedScores.length ? Math.max(...ratedScores) : null;
    const competitors = rated
      .filter((c) => keyOf(c) !== selectedKey && (selected.ws === null || (c.ws as number) > selected.ws))
      .sort((a, b) => (b.ws as number) - (a.ws as number));
    // Betygskontext: viktade spannet bland betyg 4-avtal (område, annars riket)
    const four = (rows: WktContract[]) => rows.filter((c) => c.r === 4 && c.ws !== null).map((c) => c.ws as number);
    const areaFour = four(inArea);
    const nationalFour = four(contracts);
    const fourScores = areaFour.length ? areaFour : nationalFour;
    return {
      avg,
      top,
      competitors,
      fourScope: areaFour.length ? "området" : "landet",
      fourMin: fourScores.length ? Math.min(...fourScores) : null,
      fourMax: fourScores.length ? Math.max(...fourScores) : null,
    };
  }, [selected, selectedKey, contracts]);

  function selectContract(key: string) {
    setSelectedKey(key);
    setQuery("");
    setGoal({ kind: "threshold" });
    // Uppdatera delbara URL:en UTAN navigering (history.replaceState) — router.replace
    // hade triggat en RSC-runda och blinkat route-loadern över utforskaren.
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/vad-kravs?avtal=${encodeURIComponent(key)}`);
    }
  }

  // Målets viktade värde
  const targetScore: number | null = useMemo(() => {
    if (!selected || !areaCtx) return null;
    switch (goal.kind) {
      case "threshold":
        return AF_TERMINATION_THRESHOLD;
      case "avg":
        return areaCtx.avg;
      case "top":
        return areaCtx.top;
      case "competitor": {
        const c = byKey.get(goal.key);
        return c?.ws ?? null;
      }
    }
  }, [goal, selected, areaCtx, byKey]);

  const canCompute = selected && weights && selected.sum !== null && selected.p > 0;
  const req =
    canCompute && targetScore !== null
      ? requiredResults(selected!.sum!, selected!.p, weights!, targetScore)
      : null;
  // Går målet ens att nå på nuvarande deltagarmix? (taket = deltagarviktat
  // snitt av nivåvikterna). Inträffar aldrig med dagens data — försiktighet
  // om framtida siffror eller ett delat konkurrentmål skulle spränga taket.
  const unreachable =
    req !== null && targetScore !== null && selected!.ceiling !== null && targetScore > selected!.ceiling + 1e-9;

  const goalOptions: { goal: Goal; label: string; disabled?: boolean; hint?: string }[] = selected && areaCtx
    ? [
        {
          goal: { kind: "threshold" },
          label: `Ur riskzonen (${AF_TERMINATION_THRESHOLD_LABEL})`,
          disabled: selected.ws !== null && selected.ws >= AF_TERMINATION_THRESHOLD,
          hint: selected.ws !== null && selected.ws >= AF_TERMINATION_THRESHOLD ? "redan över" : undefined,
        },
        {
          goal: { kind: "avg" },
          label: "Snitt (betygsatta)",
          disabled: areaCtx.avg === null || (selected.ws !== null && selected.ws >= areaCtx.avg),
          hint: areaCtx.avg === null ? "inga betygsatta avtal" : selected.ws !== null && selected.ws >= areaCtx.avg ? "redan över" : undefined,
        },
        {
          goal: { kind: "top" },
          label: "Bäst betygsatt i området",
          disabled: areaCtx.top === null || (selected.ws !== null && selected.ws >= areaCtx.top),
          hint: selected.ws !== null && areaCtx.top !== null && selected.ws >= areaCtx.top ? "du är bäst" : undefined,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Val av avtal */}
      <div className="relative max-w-xl">
        <label className="mono-label block mb-1">Välj ditt avtal (eller en konkurrent)</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök leverantör eller område…"
          aria-label="Sök avtal"
          className="w-full rounded-lg px-4 py-2.5 text-sm outline-none border border-[var(--line)] bg-[var(--bg-raised)] placeholder:text-[var(--text-faint)] focus:border-[var(--compare-1)]"
        />
        {matches.length > 0 && (
          <ul className="absolute z-40 mt-1 w-full card divide-y divide-[var(--line-soft)] overflow-hidden max-h-96 overflow-y-auto">
            {matches.map((c) => {
              const k = keyOf(c);
              return (
                <li key={k}>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--bg-hover)]"
                    onClick={() => selectContract(k)}
                  >
                    {c.supplier} <span className="text-[var(--text-dim)]">— {c.area}</span>
                    <span className="text-xs text-[var(--text-faint)] tabular-nums">
                      {" "}· viktat {formatScore(c.ws)}
                      {c.r !== null ? ` · betyg ${c.r}` : " · ej betygsatt"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!selected && (
        <p className="text-sm text-[var(--text-dim)] max-w-2xl">
          Sök upp ett avtal ovan. Du ser då dess läge i {period} och kan räkna ut vad som skulle krävas för att
          nå tröskeln, områdets snitt eller ikapp en konkurrent — utifrån Arbetsförmedlingens egen formel.
        </p>
      )}

      {selected && (
        <>
          {/* Nuläge */}
          <div className="card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-medium">
                <Link href={`/leverantorer/${slugify(selected.supplier)}`} className="hover:text-[var(--compare-1)]">
                  {selected.supplier}
                </Link>{" "}
                <span className="text-[var(--text-dim)] font-normal">— {selected.area}</span>
              </h2>
              <p className="text-sm text-[var(--text-dim)] tabular-nums">
                viktat {formatScore(selected.ws)}
                {selected.r !== null ? ` · betyg ${selected.r}` : " · ej betygsatt"} · {selected.p} deltagare · {period}
              </p>
            </div>
          </div>

          {!canCompute ? (
            <p className="text-sm text-[var(--text-dim)] max-w-2xl">
              För det här avtalet saknar Arbetsförmedlingens fil nivådata (A/B/C) eller periodvikter, och då kan
              vi inte räkna fram steg för steg utan att gissa. Kolla i stället avtalets historik och trend på{" "}
              <Link href={`/leverantorer/${slugify(selected.supplier)}`} className="link">profilsidan</Link>.
            </p>
          ) : (
            <>
              {selected.r === null && (
                <p className="text-xs text-[var(--text-dim)] max-w-2xl">
                  Det här avtalet har ännu inget betyg (under Arbetsförmedlingens betygströskel), så dess viktade
                  resultat är inte direkt jämförbart med de betygsatta avtalen. Målen nedan är riktmärken, inte
                  en rankning.
                </p>
              )}
              {/* Målval */}
              <div>
                <p className="mono-label mb-2">Vad vill du nå?</p>
                <div className="flex flex-wrap gap-2">
                  {goalOptions.map((o, i) => {
                    const active = goal.kind === o.goal.kind && goal.kind !== "competitor";
                    return (
                      <button
                        key={i}
                        disabled={o.disabled}
                        onClick={() => setGoal(o.goal)}
                        className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                          active ? "bg-[var(--bg-hover)]" : "hover:bg-[var(--bg-hover)]"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                        style={{ borderColor: active ? "var(--signal)" : "var(--line)" }}
                      >
                        {o.label}
                        {o.hint && <span className="text-xs text-[var(--text-faint)]"> · {o.hint}</span>}
                      </button>
                    );
                  })}
                  {areaCtx && areaCtx.competitors.length > 0 && (
                    <select
                      value={goal.kind === "competitor" ? goal.key : ""}
                      onChange={(e) => e.target.value && setGoal({ kind: "competitor", key: e.target.value })}
                      className="text-sm px-3 py-1.5 rounded-full border bg-[var(--bg-raised)] outline-none focus:border-[var(--compare-1)]"
                      style={{ borderColor: goal.kind === "competitor" ? "var(--signal)" : "var(--line)" }}
                      aria-label="Kom ikapp en konkurrent"
                    >
                      <option value="">Kom ikapp en konkurrent…</option>
                      {areaCtx.competitors.map((c) => (
                        <option key={keyOf(c)} value={keyOf(c)}>
                          {c.supplier} ({formatScore(c.ws)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Resultat */}
              {targetScore !== null && (
                <div className="card p-5">
                  {unreachable ? (
                    <p className="text-sm text-[var(--text-dim)]">
                      Målet {formatScore(targetScore)} går inte att nå på nuvarande deltagarvolym och nivåmix —
                      även om varje deltagare nådde både första resultat och godkänd uppföljning skulle det
                      viktade måttet toppa på {formatScore(selected.ceiling)}. Det skulle kräva fler deltagare
                      eller en annan nivåfördelning.
                    </p>
                  ) : req ? (
                    <>
                      <p className="text-sm">
                        Från viktat <strong className="tabular-nums">{formatScore(selected.ws)}</strong> till{" "}
                        <strong className="tabular-nums">{formatScore(targetScore)}</strong> på nuvarande
                        deltagarvolym krävs ungefär{" "}
                        <strong>
                          {req.fewest === req.most ? req.fewest : `${req.fewest}–${req.most}`} fler godkända
                          resultatredovisningar
                        </strong>
                        . Färre om resultaten kommer i nivå C (deltagare längst från arbetsmarknaden, väger{" "}
                        {weights!.weight_c.toFixed(2).replace(".", ",")}), fler i nivå A (väger{" "}
                        {weights!.weight_a.toFixed(2).replace(".", ",")}). Både RR1 och RR2 räknas.
                      </p>
                      <WhatIfSlider
                        key={`${selectedKey}|${goal.kind}|${targetScore}`}
                        currentWeightedSum={selected.sum!}
                        participants={selected.p}
                        weights={weights!}
                        start={req.fewest}
                        max={req.most + 10}
                        target={targetScore}
                      />
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--positive)" }}>
                      Det här avtalet ligger redan på eller över målet ({formatScore(targetScore)}). Välj ett
                      högre mål eller en konkurrent som ligger före.
                    </p>
                  )}
                </div>
              )}

              {/* Betyg-hederlighet */}
              {areaCtx && areaCtx.fourMin !== null && (
                <div className="card p-4 text-sm leading-relaxed text-[var(--text-dim)]">
                  <span className="mono-label block mb-1">Och fyra stjärnor?</span>
                  Betyget sätts av Arbetsförmedlingen som en relativ bedömning och går inte att räkna fram — vi
                  lovar det aldrig. Som riktmärke: de avtal i {areaCtx.fourScope} som har betyg 4 ligger på viktat{" "}
                  <span className="tabular-nums text-[var(--text)]">
                    {formatScore(areaCtx.fourMin)}
                    {areaCtx.fourMax !== areaCtx.fourMin ? `–${formatScore(areaCtx.fourMax)}` : ""}
                  </span>
                  . Betyget väger dessutom in deltagarnas nivåmix, inte bara resultatet.
                </div>
              )}

              <p className="text-xs text-[var(--text-dim)] max-w-3xl">
                Beräkningsgrund: resultatmått = (RR1+RR2, viktade per nivå A/B/C) ÷ (2 × antal deltagare), med
                vikterna för {period} ur Arbetsförmedlingens beräkningsfil. Formeln är verifierad mot samtliga
                publicerade värden. Informativ beräkning utifrån AF:s publicerade villkor — den simulerar inte
                myndighetens beslut, och nästa periods deltagarvolym kommer att skilja sig.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
