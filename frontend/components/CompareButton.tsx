"use client";

import { useEffect, useState } from "react";
import { getCompare, subscribeCompare, toggleCompare, MAX_COMPARE } from "@/lib/compare";

/** Radknapp: lägg till/ta bort ett avtal i jämförelsen (brickan följer med överallt). */
export function CompareButton({ supplier, area }: { supplier: string; area: string }) {
  const key = `${supplier}|${area}`;
  const [state, setState] = useState<{ selected: boolean; full: boolean }>({ selected: false, full: false });

  useEffect(() => {
    const sync = () => {
      const keys = getCompare();
      setState({ selected: keys.includes(key), full: keys.length >= MAX_COMPARE });
    };
    sync();
    return subscribeCompare(sync);
  }, [key]);

  const blocked = state.full && !state.selected;
  return (
    <button
      type="button"
      onClick={() => toggleCompare(key)}
      title={
        state.selected
          ? "Ta bort ur jämförelsen"
          : blocked
            ? `Max ${MAX_COMPARE} avtal i jämförelsen — ta bort ett först`
            : "Lägg till i jämförelsen"
      }
      aria-pressed={state.selected}
      className="no-print inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs leading-none transition-colors"
      style={{
        borderColor: state.selected ? "var(--signal)" : "var(--line)",
        color: state.selected ? "var(--signal)" : blocked ? "var(--text-faint)" : "var(--text-dim)",
        background: state.selected ? "rgba(74,222,185,0.1)" : "transparent",
        cursor: blocked ? "not-allowed" : "pointer",
      }}
    >
      {state.selected ? "✓" : "+"}
    </button>
  );
}
