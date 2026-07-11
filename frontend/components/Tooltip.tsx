import { TwoLayerText } from "@/lib/tooltips";

/**
 * K4: tvålagerstooltip — AF:s formella text + "På ren svenska".
 * Tooltipen är avläsbar information → WCAG AA (solid bakgrund, ej glas).
 */
export function Tooltip({
  label,
  text,
  layers,
  className,
}: {
  label: string;
  text?: string;
  layers?: TwoLayerText;
  className?: string;
}) {
  return (
    <span
      className={`relative group inline-flex items-center gap-1 cursor-help focus:outline-none ${className ?? ""}`}
      tabIndex={0}
    >
      {label}
      <span className="text-[var(--text-faint)] group-hover:text-[var(--text-dim)] transition-colors" aria-hidden>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1" fill="none" />
          <text x="6" y="9" textAnchor="middle" fontSize="7" fontFamily="sans-serif">i</text>
        </svg>
      </span>
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-80 rounded-lg px-4 py-3 text-xs font-normal normal-case tracking-normal opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 shadow-xl whitespace-normal text-left leading-relaxed border border-[var(--line)]"
        style={{ background: "var(--bg-raised)", color: "var(--text)" }}
        role="tooltip"
      >
        {layers ? (
          <>
            <span className="block text-[var(--text-dim)] mb-2">{layers.af}</span>
            <span className="block">{layers.plain}</span>
          </>
        ) : (
          text
        )}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--line)]" />
      </span>
    </span>
  );
}
