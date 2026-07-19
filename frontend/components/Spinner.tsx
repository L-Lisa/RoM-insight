/**
 * Liten, diskret laddningsindikator för ytor som hämtar data client-side.
 * CSS-only (globals.css .spinner): rotation i --rating-fill;
 * prefers-reduced-motion ger en stilla puls i stället. Aldrig stora ytor,
 * ingen blinkning.
 */
export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-[var(--text-dim)]" role="status">
      <span className="spinner shrink-0" aria-hidden />
      {label}
    </span>
  );
}
