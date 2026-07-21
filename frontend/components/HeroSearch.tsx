"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Hero-söket: "Hur går det för er?" — skriv företagsnamn, välj i listan,
 * landa direkt på profilsidan. Deterministisk filtrering över senaste
 * periodens leverantörer (skickas ner från servern, inga API-anrop).
 */

type Item = { name: string; slug: string };

export function HeroSearch({ suppliers }: { suppliers: Item[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const query = q.trim().toLowerCase();
  const matches =
    query.length >= 2
      ? suppliers
          .filter((s) => s.name.toLowerCase().includes(query))
          .sort((a, b) => a.name.toLowerCase().indexOf(query) - b.name.toLowerCase().indexOf(query))
          .slice(0, 8)
      : [];

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (slug: string) => {
    setOpen(false);
    router.push(`/leverantorer/${slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!matches.length) return;
    // Stängd lista: piltangent öppnar igen, Enter navigerar aldrig "i blindo"
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = matches[active] ?? matches[0];
      if (pick) go(pick.slug);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative max-w-md">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"
      >
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls="hero-search-list"
        aria-autocomplete="list"
        aria-activedescendant={open && matches.length > 0 ? `hero-opt-${active}` : undefined}
        aria-label="Hur går det för er? Sök ert företag"
        placeholder="Hur går det för er? Sök ert företag …"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg-raised)] pl-9 pr-3 py-2.5 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--signal)]"
      />
      {open && matches.length > 0 && (
        <ul
          id="hero-search-list"
          role="listbox"
          aria-label="Leverantörsförslag"
          className="card absolute z-20 mt-1 w-full overflow-hidden py-1 shadow-2xl"
          style={{ background: "var(--bg-raised)" }}
        >
          {matches.map((s, i) => (
            // ARIA: option är själva det interaktiva elementet (nästlad button
            // görs presentational av skärmläsare) — därav li med onClick.
            <li
              key={s.slug}
              id={`hero-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(s.slug)}
              className={`cursor-pointer px-3 py-2 text-sm truncate ${i === active ? "bg-[var(--bg-hover)]" : ""}`}
            >
              {s.name}
            </li>
          ))}
        </ul>
      )}
      {open && query.length >= 2 && matches.length === 0 && (
        <p
          className="card absolute z-20 mt-1 w-full px-3 py-2 text-sm text-[var(--text-dim)] shadow-2xl"
          style={{ background: "var(--bg-raised)" }}
        >
          Ingen träff i senaste perioden — se{" "}
          <a href="/leverantorer" className="link">alla leverantörer</a> (även utgångna).
        </p>
      )}
    </div>
  );
}
