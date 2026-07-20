import Link from "next/link";
import { DataStamp } from "@/components/DataStamp";
import { periodLabel } from "@/lib/format";
import { getLatestPeriod, getPeriodRows } from "@/lib/queries";
import {
  AF_RATING_MIN_MONTHS,
  AF_RATING_MIN_PARTICIPANTS,
  AF_TERMINATION_MIN_MONTHS,
  AF_TERMINATION_THRESHOLD_LABEL,
} from "@/lib/afRules";

export const revalidate = 3600;

export const metadata = {
  title: "Vad betyder betygen i rusta och matcha?",
  description:
    "Arbetsförmedlingens betyg 1–4 för Rusta och matcha-leverantörer förklarade: vad de mäter, varför vissa leverantörer saknar betyg och hur du jämför rättvist.",
};

/**
 * Förklaringssida (SEO-planens §3 + FAQPage-schema §2). Varje svar bygger på
 * formuleringar som redan är verifierade mot AF:s betygsmodell — inga nya påståenden.
 */

function buildFaq(unratedShareText: string): { q: string; a: string; links?: { href: string; label: string }[] }[] {
  return [
  {
    q: "Vad betyder betygen 1–4?",
    a: "Betyget är Arbetsförmedlingens omdöme om hur väl leverantören har lyckats stödja sina deltagare till arbete eller studier, jämfört med andra leverantörer och med hänsyn till deltagarnas avstånd till arbetsmarknaden. Skalan är 1–4 där 4 är högst. Betyget sätts per avtal, alltså per leverantör och leveransområde — samma leverantör kan ha betyg 4 i ett område och betyg 2 i ett annat.",
    links: [{ href: "/leverantorer", label: "Se alla leverantörers betyg" }],
  },
  {
    q: "Varför har min leverantör inget betyg?",
    a: `”Ej betygsatt ännu” betyder att avtalet inte nått Arbetsförmedlingens tröskel: minst ${AF_RATING_MIN_PARTICIPANTS} deltagare och ${AF_RATING_MIN_MONTHS} månaders verksamhet. Det är ett tillstånd, inte ett underbetyg.${unratedShareText} Oftast beror det på att avtalet är nytt eller litet.`,
  },
  {
    q: "Är betyg 4 hos en leverantör jämförbart med betyg 4 hos en annan?",
    a: "Delvis. Betyget tar hänsyn till deltagarnas avstånd till arbetsmarknaden (nivå A, B och C), men inte till hur den lokala arbetsmarknaden ser ut. Ett resultat i ett område är därför inte automatiskt jämförbart med samma siffra i ett annat. Rättvisast är att jämföra avtal inom samma leveransområde, eller mot områdets snitt på leverantörens profilsida.",
    links: [{ href: "/leveransomraden", label: "Jämför inom ditt område" }],
  },
  {
    q: "Hur ofta uppdateras betygen?",
    a: "Arbetsförmedlingen publicerar nya filer varannan månad. RoM Insight hämtar varje släpp och visar alltid vilken period en siffra kommer från. Mellan släppen bevakar Radarn varje vecka vilka leverantörer som syns i AF:s söktjänst.",
    links: [{ href: "/handelser", label: "Se senaste ändringarna" }],
  },
  {
    q: "Vad är riskflaggan och riskzonen?",
    a: `Riskflaggan är Arbetsförmedlingens egen markering ”riskerar hävning” ur deras fil. Riskzonen på RoM Insight är vår sammanställning av avtal som möter AF:s publika hävningskriterier: betyg 1 eller saknas, resultatmått under ${AF_TERMINATION_THRESHOLD_LABEL}, i två uppföljningar i rad, för avtal som varit aktiva minst ${AF_TERMINATION_MIN_MONTHS} månader. Att ett avtal ligger i riskzonen betyder inte att det kommer hävas, bara att det möter de publika kriterierna just nu.`,
    links: [{ href: "/riskzon", label: "Se riskzonen" }],
  },
  ];
}

export default async function GuideRatingsPage() {
  const latest = await getLatestPeriod();
  const rows = latest ? await getPeriodRows(latest) : [];
  const unratedPct = rows.length ? Math.round((rows.filter((r) => r.rating === null).length / rows.length) * 100) : null;
  const FAQ = buildFaq(
    unratedPct !== null && latest ? ` I ${periodLabel(latest)} gäller det ${unratedPct} % av avtalen.` : "",
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="max-w-3xl space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vad betyder betygen i rusta och matcha?</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1 max-w-2xl">
          Arbetsförmedlingens betygsmodell förklarad på ren svenska: vad siffrorna mäter, vad de inte mäter,
          och hur du jämför rättvist.
        </p>
        <div className="mt-2"><DataStamp period={latest} /></div>
      </div>

      <dl className="space-y-8">
        {FAQ.map((f) => (
          <div key={f.q}>
            <dt className="text-base font-medium mb-2">{f.q}</dt>
            <dd className="text-sm leading-relaxed text-[var(--text-dim)]">
              {f.a}
              {f.links && (
                <span className="block mt-2">
                  {f.links.map((l) => (
                    <Link key={l.href} href={l.href} className="link text-sm mr-4">
                      {l.label} →
                    </Link>
                  ))}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <p className="text-sm">
        Djupare detaljer (formeln, källfilerna och kvalitetskontrollerna) finns på{" "}
        <Link href="/metod" className="link">metodsidan</Link>.
      </p>
    </div>
  );
}
