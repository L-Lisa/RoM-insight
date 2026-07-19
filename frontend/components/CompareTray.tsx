"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCompare, setCompare, subscribeCompare, toggleCompare, MAX_COMPARE } from "@/lib/compare";

/**
 * Jämförelsebrickan: fast panel nere till höger med valda avtal.
 * Döljs på /jamfor (sidan har egen väljare, seedad via ?keys=) och vid tomt val.
 */
export function CompareTray() {
  const [keys, setKeys] = useState<string[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const sync = () => setKeys(getCompare());
    sync();
    return subscribeCompare(sync);
  }, []);

  if (!keys.length || pathname === "/jamfor") return null;

  return (
    <div
      className="no-print fixed bottom-4 right-4 z-40 card p-3 shadow-2xl max-w-sm"
      style={{ background: "var(--bg-raised)" }}
      role="region"
      aria-label="Valda avtal för jämförelse"
    >
      <p className="mono-label mb-2">Jämförelsen · {keys.length} av {MAX_COMPARE}</p>
      <ul className="space-y-1 mb-3 max-h-40 overflow-y-auto">
        {keys.map((k) => {
          const [supplier, area] = k.split("|");
          return (
            <li key={k} className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => toggleCompare(k)}
                aria-label={`Ta bort ${supplier} — ${area}`}
                className="text-[var(--text-faint)] hover:text-[var(--terminated)] shrink-0"
              >
                ✕
              </button>
              <span className="truncate">
                {supplier} <span className="text-[var(--text-dim)]">— {area}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-3">
        <Link
          href={`/jamfor?keys=${encodeURIComponent(keys.join(","))}`}
          className="text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-[var(--bg-hover)]"
          style={{ borderColor: "var(--signal)", color: "var(--signal)" }}
        >
          Se i konstellationen →
        </Link>
        <button
          type="button"
          onClick={() => setCompare([])}
          className="text-xs text-[var(--text-dim)] hover:text-[var(--text)]"
        >
          Rensa
        </button>
      </div>
    </div>
  );
}
