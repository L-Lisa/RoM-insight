"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PeriodWeights, RomResult } from "@/lib/types";
import { periodLabel } from "@/lib/format";
import { ScoreBar } from "@/components/Badges";
import { SourceBreakdown } from "@/components/SourceBreakdown";

/**
 * "Visa källan" — klicka på ett viktat resultat och se AF:s rådata + formeln
 * som ger exakt det publicerade värdet. Formeln är verifierad mot samtliga
 * 7 084 publicerade värden (se metodsidan). Saknas nivådata eller vikter för
 * perioden sägs det rakt ut — aldrig gissad matte (guardrails 11).
 */

const AF_SOURCE_URL =
  "https://arbetsformedlingen.se/for-leverantorer/arbetsmarknadstjanster/rusta-och-matcha";

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

            <SourceBreakdown row={row} weights={weights} />

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
