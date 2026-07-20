import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import { DataStamp } from "@/components/DataStamp";
import { getLatestPeriod, getPeriodRows } from "@/lib/queries";
import { periodLabel } from "@/lib/format";
import { AF_RATING_MIN_MONTHS, AF_RATING_MIN_PARTICIPANTS } from "@/lib/afRules";

export const revalidate = 3600;

export const metadata = {
  title: "Metod & källor",
  description:
    "Hur RoM Insight hämtar, kontrollerar och visar Arbetsförmedlingens data för Rusta och matcha, och hur du dubbelkollar siffrorna mot källfilen.",
};

export default async function MethodPage() {
  const latest = await getLatestPeriod();
  const rows = latest ? await getPeriodRows(latest) : [];
  const unratedPct = rows.length ? Math.round((rows.filter((r) => r.rating === null).length / rows.length) * 100) : null;

  // schema.org Dataset — gör datan hittbar i Google Dataset Search (seo-ai-synlighet.md §2)
  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Rusta och matcha: betyg och viktade resultat per leverantör och leveransområde",
    description:
      "Arbetsförmedlingens öppna statistik för Rusta och matcha, samlad per avtal (leverantör × leveransområde): betyg 1–4 från januari 2025, viktade resultatmått med nivådata (A/B/C) från mars 2025, uppdaterad varannan månad. Oförändrade värden ur källfilerna, med spårbar metod.",
    url: `${SITE_URL}/metod`,
    isBasedOn: "https://arbetsformedlingen.se/for-leverantorer/arbetsmarknadstjanster/rusta-och-matcha",
    creator: { "@type": "Organization", name: "RoM Insight" },
    spatialCoverage: "Sverige",
    temporalCoverage: `2025-01/${latest ? latest.slice(0, 7) : ".."}`,
    inLanguage: "sv",
  };

  return (
    <div className="max-w-3xl space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Metod &amp; källor</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Varje siffra på sajten ska vara spårbar till en namngiven fil från Arbetsförmedlingen. Så här funkar det.
        </p>
        <div className="mt-2"><DataStamp period={latest} /></div>
      </div>

      <Section title="Datakällan">
        <p>
          All statistik kommer från Arbetsförmedlingens öppna filer för Rusta och matcha:{" "}
          <em>betygsfilen</em> (uppdateras varannan månad, historik från januari 2025) och{" "}
          <em>resultatuppföljningen</em> (viktat resultatmått, deltagare och resultat per avtal, historik från
          mars 2025). Filerna publiceras på{" "}
          <a
            href="https://arbetsformedlingen.se/for-leverantorer/arbetsmarknadstjanster/rusta-och-matcha"
            className="link"
            rel="noopener noreferrer"
            target="_blank"
          >
            AF:s leverantörssida
          </a>
          . Vi hittar inte på, härleder inte och &quot;förbättrar&quot; inte värden. Det som visas är det AF publicerat,
          med källfil och period angiven.
        </p>
      </Section>

      <Section title="Vad måtten betyder">
        <dl className="space-y-4 text-sm">
          <Term t="Betyg (1–4)">
            AF:s omdöme om hur väl leverantören stödjer deltagare till arbete eller studier, jämfört med andra och
            med hänsyn till deltagarnas avstånd till arbetsmarknaden. Kräver minst {AF_RATING_MIN_PARTICIPANTS} deltagare
            och {AF_RATING_MIN_MONTHS} månaders verksamhet.
            {unratedPct !== null && latest ? ` Därför visar ${unratedPct} % av avtalen i ${periodLabel(latest)} "ej betygsatt ännu".` : ""} Det
            är ett tillstånd, inte ett underbetyg.
          </Term>
          <Term t="Viktat resultatmått">
            Andel deltagare (påbörjade 11–22 månader före mätningen) med godkänt resultat till arbete eller studier,
            viktat efter deltagarnas nivå A/B/C. Viktningen justerar för individernas avstånd till arbetsmarknaden,{" "}
            <strong>inte</strong> för den lokala arbetsmarknaden. AF delar inte upp resultatet i arbete respektive
            studier, så det gör inte vi heller.
          </Term>
          <Term t="AF:s riskflagga">
            Kolumnen &quot;Riskerar hävning&quot; ur AF:s fil. AF publicerar den bara vissa perioder; när den saknas visar vi
            &quot;ej publicerad&quot;, aldrig ett antaget värde.
          </Term>
          <Term t="Percentil (vår beräkning)">
            Avtalets viktade resultat rankat mot samtliga betygsatta avtal i samma period. Detta är RoM Insights
            beräkning på AF:s siffror, inte ett AF-mått; därför märks den alltid som vår.
          </Term>
          <Term t="Varför rankas bara betygsatta avtal?">
            Viktat resultatmått delas med två gånger antalet deltagare. För avtal med en handfull deltagare ger det
            extremvärden som ser imponerande eller katastrofala ut men bara är brus: i maj 2026 hade det
            &quot;bästa&quot; avtalet utan betyg måttet 1,15 på 2 deltagare. AF sätter av samma skäl inget betyg under
            {AF_RATING_MIN_PARTICIPANTS} deltagare och {AF_RATING_MIN_MONTHS} månaders verksamhet, och rankar aldrig dessa avtal. Därför gäller på RoM Insight:
            topplistor, lyft/tapp, percentiler och områdessnitt räknas enbart på betygsatta avtal. Avtal utan betyg
            visas med alla sina siffror i tabellerna — de rankas bara inte.
          </Term>
          <Term t="Händelser och arkiv (vår sammanställning)">
            Skillnaden mellan två på varandra följande släpp: betygsändringar, nya avtal, avtal som lämnat
            statistiken. Varför ett avtal lämnat statistiken framgår inte av filerna, så vi anger ingen orsak.
          </Term>
          <Term t="Radarn (vår bevakning av söktjänsten)">
            Veckovisa ögonblicksbilder av{" "}
            <a
              href="https://arbetsformedlingen.se/for-arbetssokande/extra-stod/stod-a-o/rusta-och-matcha/sok-leverantor-inom-rusta-och-matcha"
              className="link"
              rel="noopener noreferrer"
              target="_blank"
            >
              Arbetsförmedlingens söktjänst &quot;Sök leverantör inom rusta och matcha&quot;
            </a>{" "}
            — de leverantörer och kontor arbetssökande kan välja mellan just nu. Statistikfilerna släpar
            upp till två månader; söktjänsten ändras när AF agerar. Radarn jämför senaste kontrollen av
            söktjänsten med senaste statistiken: leverantörer med avtal som inte syns alls, och leverantörer
            utan synligt kontor i sina avtalsområden (kontor mappas till område via AF:s kommunlista; kan en
            kontorsort inte mappas görs inget påstående). Att en leverantör saknas kan bero på avtal som löpt
            ut, eget utträde, namnbyte eller hävning; AF publicerar inte orsaken och vi påstår ingen. Namnbyten
            matchas mot vår namnvariantlista innan något visas som försvunnet. Varje kontroll anges med datum.
          </Term>
        </dl>
      </Section>

      <Section title="Revisioner">
        <p>
          Arbetsförmedlingen reviderar historiska perioder retroaktivt när sena resultatersättningar godkänns.
          Vi använder den senaste tillgängliga revisionen per period.
        </p>
      </Section>

      <Section title="Kvalitetskontroller">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Schemakontroll: avviker AF-filens struktur stoppas importen.</li>
          <li>Unikhetsspärr i databasen: dubbelimport är tekniskt omöjlig.</li>
          <li>Rimlighetsregler per rad (deltagare ≥ resultat, betyg 1–4 eller saknas, resultat 0–1).</li>
          <li>Avstämning mot källan: radantal och kontrollsummor jämförs mot filen, slumpade rader verifieras fält för fält.</li>
          <li>Ny data granskas manuellt (diff-rapport) innan den publiceras — automatiken förbereder, en människa släpper.</li>
        </ul>
      </Section>

      <Section title="Dubbelkolla gärna själv" id="hitta-felet">
        <p>
          Sajten är under utveckling och ingen är perfekt. Även om allt vi visar bygger direkt på
          Arbetsförmedlingens egna dokument kan saker bli fel på vägen. Ser en siffra konstig ut: gå till källan
          och jämför.
        </p>
        <p className="text-sm mt-3">
          Ladda ner Arbetsförmedlingens betygsfil (
          <a
            href="https://arbetsformedlingen.se/for-leverantorer/arbetsmarknadstjanster/rusta-och-matcha"
            className="link"
            rel="noopener noreferrer"
            target="_blank"
          >
            Betyg Rusta och matcha januari 2025 – maj 2026, xlsx
          </a>
          ) och stäm av direkt mot den.
        </p>
      </Section>

      <p className="text-sm">
        Frågor om metoden? <Link href="/om" className="link">Om sajten</Link> berättar vem som står bakom.
      </p>
    </div>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id}>
      <h2 className="text-base font-medium mb-3">{title}</h2>
      <div className="text-sm leading-relaxed text-[var(--text)] space-y-3">{children}</div>
    </section>
  );
}

function Term({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-medium">{t}</dt>
      <dd className="text-[var(--text-dim)] mt-0.5">{children}</dd>
    </div>
  );
}
