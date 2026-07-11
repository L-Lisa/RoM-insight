import Link from "next/link";
import { DataStamp } from "@/components/DataStamp";
import { getLatestPeriod } from "@/lib/queries";

export const revalidate = 3600;

export const metadata = {
  title: "Metod & källor",
  description:
    "Hur RoM Insight hämtar, kontrollerar och visar Arbetsförmedlingens data för Rusta och matcha — inklusive Hitta felet-garantin och rättelseloggen.",
};

export default async function MethodPage() {
  const latest = await getLatestPeriod();

  return (
    <div className="max-w-3xl space-y-10">
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
          . Vi hittar inte på, härleder inte och &quot;förbättrar&quot; inte värden — det som visas är det AF publicerat,
          med källfil och period angiven.
        </p>
      </Section>

      <Section title="Vad måtten betyder">
        <dl className="space-y-4 text-sm">
          <Term t="Betyg (1–4)">
            AF:s omdöme om hur väl leverantören stödjer deltagare till arbete eller studier, jämfört med andra och
            med hänsyn till deltagarnas avstånd till arbetsmarknaden. Kräver minst 18 deltagare och 12 månaders
            verksamhet — därför visar ungefär var fjärde avtal &quot;ej betygsatt ännu&quot;. Det är ett tillstånd, inte ett
            underbetyg.
          </Term>
          <Term t="Viktat resultatmått">
            Andel deltagare (påbörjade 11–22 månader före mätningen) med godkänt resultat till arbete eller studier,
            viktat efter deltagarnas nivå A/B/C. Viktningen justerar för individernas avstånd till arbetsmarknaden —{" "}
            <strong>inte</strong> för den lokala arbetsmarknaden. AF delar inte upp resultatet i arbete respektive
            studier, så det gör inte vi heller.
          </Term>
          <Term t="AF:s riskflagga">
            Kolumnen &quot;Riskerar hävning&quot; ur AF:s fil. AF publicerar den bara vissa perioder; när den saknas visar vi
            &quot;ej publicerad&quot; — aldrig ett antaget värde.
          </Term>
          <Term t="Percentil (vår beräkning)">
            Avtalets viktade resultat rankat mot samtliga avtal i samma period. Detta är RoM Insights beräkning på
            AF:s siffror, inte ett AF-mått — därför märks den alltid som vår.
          </Term>
          <Term t="Händelser och arkiv (vår sammanställning)">
            Skillnaden mellan två på varandra följande släpp: betygsändringar, nya avtal, avtal som lämnat
            statistiken. Varför ett avtal lämnat statistiken framgår inte av filerna, så vi anger ingen orsak.
          </Term>
        </dl>
      </Section>

      <Section title="Revisioner">
        <p>
          Arbetsförmedlingen reviderar historiska perioder retroaktivt när sena resultatersättningar godkänns.
          Vi använder den senaste tillgängliga revisionen per period. Bekräftade avvikelser dokumenteras i
          rättelseloggen nedan.
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

      <Section title="Hitta felet-garantin" id="hitta-felet">
        <blockquote className="card p-5 text-sm leading-relaxed">
          Vi lägger stor möda på att varje siffra ska stämma med Arbetsförmedlingens källdata — automatiska
          kontroller, manuell granskning före publicering och öppen rättelselogg. Hittar du ändå ett fel har du
          gjort oss en tjänst: vi rättar inom 48 timmar, krediterar dig om du vill, och bjuder på biobiljetter.
        </blockquote>
        <p className="text-sm mt-3">
          Rapportera fel:{" "}
          <a className="link" href="mailto:hej@rominsight.se?subject=Felrapport%20RoM%20Insight">
            hej@rominsight.se
          </a>{" "}
          — ange sida, leverantör och period så går det fort.
        </p>
      </Section>

      <Section title="Rättelselogg" id="rattelser">
        <p className="text-sm text-[var(--text-dim)]">
          Inga rättelser ännu. Bekräftade fel listas här med datum, vad som var fel och vad som rättats.
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
