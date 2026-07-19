"use client";

import { useEffect, useRef, useState } from "react";
import { TwoLayerText } from "@/lib/tooltips";

/**
 * K4: tvålagerstooltip — AF:s formella text + "På ren svenska".
 * Tooltipen är avläsbar information → WCAG AA (solid bakgrund, ej glas).
 * Panelen positioneras fixed vid hover/fokus så att tabellcontainrar med
 * overflow-x-auto aldrig klipper den (buggen på /riskzon-rubriken).
 * Nära viewportens överkant flippar panelen till under ankaret; vid
 * scroll/resize stängs den (fixed koordinater skulle annars bli stela).
 */

const PANEL_W = 320; // = w-80

interface PanelPos {
  left: number;
  top: number;
  below: boolean;
}

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
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<PanelPos | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const half = Math.min(PANEL_W / 2 + 8, window.innerWidth / 2);
    const left = Math.min(Math.max(r.left + r.width / 2, half), window.innerWidth - half);
    // Flippa till under ankaret när panelen inte får plats ovanför
    const below = r.top < 180;
    setPos({ left, top: below ? r.bottom + 8 : r.top - 8, below });
  };
  const hide = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-center gap-1 cursor-help focus:outline-none ${className ?? ""}`}
      tabIndex={0}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {label}
      <span
        className={`transition-colors ${pos ? "text-[var(--text-dim)]" : "text-[var(--text-faint)]"}`}
        aria-hidden
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1" fill="none" />
          <text x="6" y="9" textAnchor="middle" fontSize="7" fontFamily="sans-serif">i</text>
        </svg>
      </span>
      {pos && (
        <span
          className={`pointer-events-none fixed z-50 w-80 -translate-x-1/2 ${pos.below ? "" : "-translate-y-full"} rounded-lg px-4 py-3 text-xs font-normal normal-case tracking-normal shadow-xl whitespace-normal text-left leading-relaxed border border-[var(--line)]`}
          style={{ background: "var(--bg-raised)", color: "var(--text)", left: pos.left, top: pos.top, maxWidth: "calc(100vw - 16px)" }}
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
        </span>
      )}
    </span>
  );
}
