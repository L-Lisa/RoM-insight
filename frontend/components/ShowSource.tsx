"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PeriodWeights, RomResult } from "@/lib/types";
import { formatScore, periodLabel } from "@/lib/format";
import { ScoreBar } from "@/components/Badges";

/**
 * "Visa källan" — klicka på ett viktat resultat och se AF:s rådata + formeln
 * som ger exakt det publicerade värdet. Formeln är verifierad mot samtliga
 * 7 084 publicerade värden (se metodsidan). Saknas nivådata eller vikter för
 * perioden sägs det rakt ut — aldrig gissad matte (guardrails 11).
 */

const AF_SOURCE_URL =
  "https://arbetsformedlingen.se/for-leverantorer/arbetsmarknadstjanster/rusta-och-matcha";

function fmtWeight(v: number): string {
  return v.toFixed(4).replace(".", ",");
}

export function ShowSource({ row, weights }: { row: RomResult; weights: PeriodWeights | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (row.weighted_score === null || row.weighted_score === undefined) {
    return <span className="text-[var(--text-faint)]">–</span>;
  }

  const levels = [
    { label: "A", desc: "närmast arbetsmarknaden", p: row.participants_a, rr1: row.rr1_a, rr2: row.rr2_a, w: weights?.weight_a },
    { label: "B", desc: "", p: row.participants_b, rr1: row.rr1_b, rr2: row.rr2_b, w: weights?.weight_b },
    { label: "C", desc: "längst ifrån", p: row.participants_c, rr1: row.rr1_c, rr2: row.rr2_c, w: weights?.weight_c },
  ];
  const hasLevels = levels.every((l) => l.p !== null && l.rr1 !== null && l.rr2 !== null);
  const total = levels.reduce((s, l) => s + (l.p ?? 0), 0);
  const canCompute = hasLevels && weights !== null && total > 0;

  const computed = canCompute
    ? levels.reduce((s, l) => s + ((l.rr1 ?? 0) + (l.rr2 ?? 0)) * (l.w ?? 0), 0) / (2 * total)
    : null;
  // AF publicerar tre decimaler — matchning inom avrundningsfelet
  const matches = computed !== null && Math.abs(computed - row.weighted_score) < 0.0005;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2 cursor-pointer"
        title="Visa källan bakom siffran"
        aria-haspopup="dialog"
      >
        <ScoreBar score={row.weighted_score} />
        <span
          className="no-print text-[10px] uppercase tracking-wider text-[var(--text-faint)] group-hover:text-[var(--compare-1)] group-focus-visible:text-[var(--compare-1)] transition-colors"
          aria-hidden
        >
          källa
        </span>
      </button>

      {open && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Källan bakom ${row.supplier}, ${row.delivery_area}`}
        >
          <div className="absolute inset-0" style={{ background: "rgba(4, 7, 14, 0.72)" }} onClick={() => setOpen(false)} />
          <div className="card relative w-full max-w-lg p-5 shadow-2xl text-left" style={{ background: "var(--bg-raised)" }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="mono-label mb-1">Visa källan</p>
                <h3 className="text-base font-medium leading-snug">
                  {row.supplier}{" "}
                  <span className="text-[var(--text-dim)] font-normal">
                    — {row.delivery_area}, {periodLabel(row.dataset_date)}
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Stäng"
                className="text-[var(--text-dim)] hover:text-[var(--text)] text-lg leading-none px-1"
              >
                ✕
              </button>
            </div>

            {canCompute ? (
              <>
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th className="mono-label py-2 text-left font-normal">Nivå</th>
                      <th className="mono-label py-2 text-right font-normal">Deltagare</th>
                      <th className="mono-label py-2 text-right font-normal">RR1</th>
                      <th className="mono-label py-2 text-right font-normal">RR2</th>
                      <th className="mono-label py-2 text-right font-normal">Vikt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line-soft)]">
                    {levels.map((l) => (
                      <tr key={l.label}>
                        <td className="py-2">
                          {l.label}
                          {l.desc && <span className="text-xs text-[var(--text-dim)]"> · {l.desc}</span>}
                        </td>
                        <td className="py-2 text-right tabular-nums">{l.p}</td>
                        <td className="py-2 text-right tabular-nums">{l.rr1}</td>
                        <td className="py-2 text-right tabular-nums">{l.rr2}</td>
                        <td className="py-2 text-right tabular-nums">{fmtWeight(l.w!)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-sm space-y-1.5 mb-4">
                  <p className="text-[var(--text-dim)]">
                    Resultatmått = Σ (RR1 + RR2) × vikt per nivå ÷ (2 × deltagare)
                  </p>
                  <p className="tabular-nums">
                    = ({levels.map((l, i) => (
                      <span key={l.label}>
                        {i > 0 && " + "}
                        {(l.rr1 ?? 0) + (l.rr2 ?? 0)}&thinsp;×&thinsp;{fmtWeight(l.w!)}
                      </span>
                    ))}) ÷ (2 × {total})
                  </p>
                  <p className="tabular-nums font-medium">
                    = {formatScore(computed)}{" "}
                    {matches ? (
                      <span style={{ color: "var(--positive)" }}>✓ stämmer med AF:s publicerade värde</span>
                    ) : (
                      <span style={{ color: "var(--risk)" }}>
                        ≠ AF:s publicerade {formatScore(row.weighted_score)} — det ska inte hända, rapportera gärna
                        via Hitta felet-garantin
                      </span>
                    )}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm leading-relaxed mb-4">
                AF publicerade inte nivådata eller periodvikter för den här mätningen, så beräkningen kan inte
                visas steg för steg. Värdet {formatScore(row.weighted_score)} kommer ändå oförändrat ur
                Arbetsförmedlingens resultatuppföljning.
              </p>
            )}

            <p className="text-xs text-[var(--text-dim)] leading-relaxed">
              Rådata: Arbetsförmedlingens resultatuppföljning, {periodLabel(row.dataset_date)} —{" "}
              <a href={AF_SOURCE_URL} className="link" rel="noopener noreferrer" target="_blank">
                hämta filen själv
              </a>
              . RR1 = första godkända resultatet (arbete eller studier), RR2 = godkänd uppföljning. Formeln är
              verifierad mot samtliga 7&nbsp;084 publicerade värden —{" "}
              <Link href="/metod" className="link">metodsidan</Link>. Hittar du ett fel?{" "}
              <Link href="/metod#hitta-felet" className="link">Hitta felet-garantin</Link>.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
