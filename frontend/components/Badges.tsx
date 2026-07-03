import { Tooltip } from "@/components/Tooltip";
import { explain } from "@/lib/tooltips";

/**
 * Färgsemantik (kravprofil §4e):
 * betyg = neutrala fyllnadsnivåer · amber = riskflagga · rött = ENDAST utgånget/hävt.
 * "Ej betygsatt ännu" är ett riktigt tillstånd — aldrig tomt fält (guardrails 14).
 */

export function RatingBadge({ rating }: { rating: number | null }) {
  if (rating === null || rating === undefined) {
    return (
      <Tooltip
        label="Ej betygsatt ännu"
        layers={explain.ejBetygsatt}
        className="text-xs text-[var(--text-dim)]"
      />
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 tabular-nums"
      aria-label={`Betyg ${rating} av 4`}
      title={`Betyg ${rating} av 4`}
    >
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-2 h-3.5 rounded-[2px]"
            style={{
              background: i <= rating ? "var(--rating-fill)" : "var(--line)",
              opacity: i <= rating ? 0.45 + rating * 0.13 : 1,
            }}
          />
        ))}
      </span>
      <span className="text-sm">{rating}</span>
    </span>
  );
}

export function RiskBadge({ risk }: { risk: boolean | null }) {
  if (risk === null) {
    return (
      <Tooltip label="ej publicerad" layers={explain.riskflagga} className="text-xs text-[var(--text-faint)]" />
    );
  }
  if (!risk) return <span className="text-[var(--text-faint)]">–</span>;
  return (
    <span
      className="inline-block text-xs font-medium px-2 py-0.5 rounded-[var(--radius-badge)]"
      style={{ background: "rgba(217,160,63,0.15)", color: "var(--risk)", border: "1px solid rgba(217,160,63,0.4)" }}
    >
      Riskflagga
    </span>
  );
}

export function ExitBadge() {
  return (
    <span
      className="inline-block text-xs font-medium px-2 py-0.5 rounded-[var(--radius-badge)]"
      style={{ background: "rgba(224,108,108,0.12)", color: "var(--terminated)", border: "1px solid rgba(224,108,108,0.35)" }}
    >
      Utgången ur statistiken
    </span>
  );
}

export function DirectionArrow({ direction }: { direction: "up" | "down" | "flat" | null }) {
  if (!direction) return null;
  const map = {
    up: { char: "↗", color: "var(--positive)", label: "förbättras" },
    down: { char: "↘", color: "var(--text-dim)", label: "försämras" },
    flat: { char: "→", color: "var(--text-dim)", label: "stabilt" },
  } as const;
  const d = map[direction];
  return (
    <span style={{ color: d.color }} aria-label={d.label} title={d.label}>
      {d.char}
    </span>
  );
}
