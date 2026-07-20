import { PeriodWeights, RomResult } from "@/lib/types";
import { formatScore } from "@/lib/format";

/**
 * Ren presentationskomponent: AF:s nivådata + formeln som ger exakt det
 * publicerade viktade resultatet. Används i "Visa källan"-popupen och inline
 * på profilsidan. Saknas nivådata eller vikter sägs det rakt ut — aldrig
 * gissad matte (guardrails 11).
 */

function fmtWeight(v: number): string {
  return v.toFixed(4).replace(".", ",");
}

export function SourceBreakdown({ row, weights }: { row: RomResult; weights: PeriodWeights | null }) {
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
  const matches = computed !== null && row.weighted_score !== null && Math.abs(computed - row.weighted_score) < 0.0005;

  if (!canCompute) {
    return (
      <p className="text-sm leading-relaxed mb-4">
        AF publicerade inte nivådata eller periodvikter för den här mätningen, så beräkningen kan inte
        visas steg för steg. Värdet {formatScore(row.weighted_score)} kommer ändå oförändrat ur
        Arbetsförmedlingens resultatuppföljning.
      </p>
    );
  }

  return (
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
          ) : row.weighted_score !== null ? (
            <span style={{ color: "var(--risk)" }}>
              ≠ AF:s publicerade {formatScore(row.weighted_score)}. Det ska inte hända — dubbelkolla gärna mot
              källfilen
            </span>
          ) : null}
        </p>
      </div>
    </>
  );
}
