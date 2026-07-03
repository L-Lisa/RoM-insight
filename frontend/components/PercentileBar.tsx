/**
 * T1: percentilposition med liten distributionskurva.
 * RoM Insights beräkning (inte AF:s) — visas alltid ihop med det viktade måttet.
 * Server-renderad SVG; markerad linje klarar 3:1 mot bakgrunden (WCAG-grafik).
 */
export function PercentileBar({
  value,
  allScores,
  percentile,
}: {
  value: number;
  allScores: number[];
  percentile: number;
}) {
  if (!allScores.length) return null;

  const max = Math.max(...allScores, value, 0.6);
  const bins = 24;
  const counts = new Array(bins).fill(0);
  for (const s of allScores) {
    const i = Math.min(bins - 1, Math.floor((s / max) * bins));
    counts[i]++;
  }
  const peak = Math.max(...counts);
  const W = 220;
  const H = 44;
  const bw = W / bins;
  const x = Math.min(W - 2, (value / max) * W);

  return (
    <div className="flex items-center gap-3">
      <svg width={W} height={H} role="img" aria-label={`Bättre än ${percentile} % av alla avtal i perioden`}>
        {counts.map((c, i) => {
          const h = peak ? (c / peak) * (H - 10) : 0;
          return (
            <rect
              key={i}
              x={i * bw + 0.5}
              y={H - h}
              width={bw - 1}
              height={h}
              fill="var(--line)"
            />
          );
        })}
        <line x1={x} x2={x} y1={2} y2={H} stroke="var(--signal)" strokeWidth={2.5} />
      </svg>
      <div>
        <p className="text-lg font-semibold tabular-nums">{percentile} %</p>
        <p className="text-xs text-[var(--text-dim)]">bättre än så stor andel av alla avtal i perioden</p>
      </div>
    </div>
  );
}
