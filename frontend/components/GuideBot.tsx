"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";
import { getCompare, subscribeCompare } from "@/lib/compare";

/**
 * Snabbguiden: deterministisk "chatbot" — färdiga frågor med skrivna svar,
 * ingen AI och inga API-anrop. Fritext matchas mot nyckelord; träffas inget
 * hänvisar guiden till Lisa (skräddarsydda analyser). Fast knapp nere till
 * vänster (Jämförelsebrickan äger nere till höger). Döljs i print.
 */

type Topic = {
  id: string;
  chip: string;
  keywords: string[];
  answer: React.ReactNode;
};

const TOPICS: Topic[] = [
  {
    id: "vad-ar-sajten",
    chip: "Vad är det här för sajt?",
    keywords: ["sajt", "rom insight", "syfte", "vad gör ni"],
    answer: (
      <>
        RoM Insight sparar Arbetsförmedlingens betyg och resultat för Rusta och matcha över tid, så att
        trender per leverantör och leveransområde blir synliga — AF:s egna filer visar bara en ögonblicksbild.
        All data kommer oavkortad ur AF:s publicerade filer. Läs mer på{" "}
        <Link href="/om" className="link">om-sidan</Link> och{" "}
        <Link href="/metod" className="link">metodsidan</Link>.
      </>
    ),
  },
  {
    id: "hitta-leverantor",
    chip: "Hur hittar jag en leverantör?",
    keywords: ["hitta", "kommun", "sök", "söka", "valbar", "välja"],
    answer: (
      <>
        Sök på namn bland <Link href="/leverantorer" className="link">alla leverantörer</Link>, eller sök din
        kommun på <Link href="/leveransomraden" className="link">områdessidan</Link> för att se vilka som är
        valbara just där. Varje leverantör har en profilsida med betyg, resultat och kontor.
      </>
    ),
  },
  {
    id: "betyg-viktat",
    chip: "Vad betyder betygen och viktat resultat?",
    keywords: ["betyg", "viktat", "stjärn", "poäng", "mått"],
    answer: (
      <>
        Betyget (1–4) är Arbetsförmedlingens omdöme om leverantören, jämfört med andra och med hänsyn till
        deltagarnas avstånd till arbetsmarknaden. Viktat resultat är andelen deltagare med godkänt resultat
        (arbete eller studier), viktad efter nivå A/B/C.{" "}
        <Link href="/guide/vad-betyder-betyg" className="link">Guiden förklarar båda</Link>, och på{" "}
        <Link href="/metod" className="link">metodsidan</Link> finns hela formeln.
      </>
    ),
  },
  {
    id: "forbattra",
    chip: "Hur kan vi förbättra vårt resultat?",
    keywords: ["förbättra", "lyfta", "krävs", "höja", "bättre", "mål"],
    answer: (
      <>
        Räknesnurran på <Link href="/vad-kravs" className="link">Vad krävs?</Link> visar hur många fler
        godkända resultat ett avtal behöver för att nå ett valt mål — beräknat med samma formel och vikter
        som AF använder.
      </>
    ),
  },
  {
    id: "radarn-riskzon",
    chip: "Vad är Radarn och riskzonen?",
    keywords: ["radar", "riskzon", "hävning", "försvunn", "varning", "händelse"],
    answer: (
      <>
        <Link href="/handelser" className="link">Radarn</Link> jämför statistiken med AF:s söktjänst och
        flaggar leverantörer som har avtal men inte syns där.{" "}
        <Link href="/riskzon" className="link">Riskzonen</Link> listar avtal som uppfyller AF:s publika
        kriterier för risk för hävning. Båda är fakta med källor — inga påståenden om enskilda fall.
      </>
    ),
  },
  {
    id: "lita-pa",
    chip: "Kan jag lita på siffrorna?",
    keywords: ["lita", "källa", "stämmer", "fel", "korrekt", "kontroll"],
    answer: (
      <>
        All data kommer ur Arbetsförmedlingens publicerade filer, och beräkningarna kan kontrolleras: klicka
        på &rdquo;källa&rdquo; vid ett viktat resultat så visas AF:s rådata och formeln med talen insatta.
        Dubbelkolla gärna själv — <Link href="/metod#hitta-felet" className="link">så gör du</Link>.
      </>
    ),
  },
  {
    id: "anlita",
    chip: "Kan jag anlita er för en analys?",
    keywords: ["anlita", "analys", "hjälp", "uppdrag", "konsult", "rapport", "kontakt", "pris"],
    answer: (
      <>
        Ja. Lisa som driver sajten tar fram skräddarsydda analyser — till exempel en genomgång av ert
        leveransområde, en konkurrentjämförelse eller ett underlag inför en etablering i nya områden. Mejla{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="link">{CONTACT_EMAIL}</a> och beskriv vad du behöver.
      </>
    ),
  },
];

const FALLBACK: React.ReactNode = (
  <>
    Jag är en enkel guide utan AI och kan bara de vanligaste frågorna — välj gärna en av dem ovan. Behöver du
    ett större svar? Lisa som driver sajten tar fram skräddarsydda analyser av marknaden, ett område eller en
    enskild leverantör: mejla <a href={`mailto:${CONTACT_EMAIL}`} className="link">{CONTACT_EMAIL}</a>.
  </>
);

/** Matchar en fritextfråga mot ett ämne. Exakt chip-text vinner alltid;
 *  annars poängsätts ämnena på nyckelordsträffar i ordbörjan (så "ort"
 *  aldrig kan träffa "rapport", men "försvunn" träffar "försvunnit"). */
function matchTopic(input: string): Topic | null {
  const q = input.trim().toLowerCase();
  const exact = TOPICS.find((t) => t.chip.toLowerCase() === q);
  if (exact) return exact;

  const atWordStart = (keyword: string) =>
    new RegExp(`(^|[^a-zåäö])${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(q);

  let best: Topic | null = null;
  let bestScore = 0;
  for (const topic of TOPICS) {
    const score = topic.keywords.filter(atWordStart).length;
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }
  return best;
}

type Exchange = { question: string; answer: React.ReactNode };

export function GuideBot() {
  const [open, setOpen] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [input, setInput] = useState("");
  const [hasCompare, setHasCompare] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    // Jämförelsebrickan äger nere till höger; på smala skärmar täcker den
    // nästan hela bredden — då kliver guide-knappen undan (se render).
    const sync = () => setHasCompare(getCompare().length > 0);
    sync();
    return subscribeCompare(sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    // Fokus in i panelen vid öppning, tillbaka till knappen vid stängning.
    if (open) {
      inputRef.current?.focus();
      wasOpen.current = true;
    } else if (wasOpen.current) {
      triggerRef.current?.focus();
      wasOpen.current = false;
    }
  }, [open]);

  useEffect(() => {
    // Nya svar ska synas direkt — scrolla loggen till botten.
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [exchanges]);

  const ask = (question: string, answer: React.ReactNode) => {
    setExchanges((prev) => [...prev, { question, answer }]);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    const topic = matchTopic(q);
    ask(q, topic ? topic.answer : FALLBACK);
    setInput("");
  };

  return (
    <div className={`no-print fixed bottom-4 left-4 z-40 ${hasCompare && !open ? "hidden sm:block" : ""}`}>
      {open && (
        <div
          id="guidebot-panel"
          role="dialog"
          aria-label="Snabbguiden — vanliga frågor"
          className="card mb-2 w-[22rem] max-w-[calc(100vw-2rem)] shadow-2xl flex flex-col"
          style={{ background: "var(--bg-raised)" }}
        >
          <div className="flex items-start justify-between p-3 border-b border-[var(--line)]">
            <div>
              <p className="text-sm font-medium">Snabbguiden</p>
              <p className="text-xs text-[var(--text-dim)]">Färdiga svar, ingen AI.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Stäng guiden"
              className="text-[var(--text-faint)] hover:text-[var(--text)] px-1"
            >
              ✕
            </button>
          </div>

          <div ref={logRef} aria-live="polite" className="overflow-y-auto max-h-72 p-3 space-y-3 text-sm">
            {exchanges.length === 0 && (
              <p className="text-[var(--text-dim)]">Vad undrar du? Välj en fråga nedan eller skriv själv.</p>
            )}
            {exchanges.map((ex, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-xs text-[var(--text-dim)]">Du: {ex.question}</p>
                <div className="rounded-lg border border-[var(--line)] p-2.5 leading-relaxed">{ex.answer}</div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[var(--line)] space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => ask(t.chip, t.answer)}
                  className="text-xs rounded-full border border-[var(--line)] px-2.5 py-1 hover:bg-[var(--bg-hover)] transition-colors text-left"
                >
                  {t.chip}
                </button>
              ))}
            </div>
            <form onSubmit={onSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Skriv en fråga …"
                aria-label="Skriv en fråga till guiden"
                className="flex-1 min-w-0 rounded-lg border border-[var(--line)] bg-transparent px-2.5 py-1.5 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--signal)]"
              />
              <button
                type="submit"
                className="text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-[var(--bg-hover)]"
                style={{ borderColor: "var(--signal)", color: "var(--signal)" }}
              >
                Fråga
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="guidebot-panel"
        aria-label={open ? "Stäng Snabbguiden" : "Öppna Snabbguiden — vanliga frågor"}
        className="card px-3.5 py-2 text-sm font-medium shadow-2xl hover:bg-[var(--bg-hover)] transition-colors"
        style={{ background: "var(--bg-raised)" }}
      >
        {open ? "Stäng guiden" : "Ny här? Fråga guiden"}
      </button>
    </div>
  );
}
