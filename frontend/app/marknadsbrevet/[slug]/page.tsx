import { notFound } from "next/navigation";
import Link from "next/link";
import { getIssue, Mover } from "@/lib/newsletter";
import { formatScore, periodLabel, slugify } from "@/lib/format";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const issue = await getIssue(slug);
  if (!issue) return { title: "Marknadsbrevet" };
  const title = `Rusta & matcha i siffror — ${periodLabel(issue.period)}`;
  const og = `/og?${new URLSearchParams({
    title,
    kpi: `${issue.lowestRatingShare} %`,
    sub: `av de betygsatta avtalen har lägsta betyg · ${issue.contractsCurr} aktiva avtal · riskzonen ${issue.riskPrev} → ${issue.riskCurr}`,
    period: periodLabel(issue.period),
  })}`;
  return {
    title,
    description: `${issue.contractsCurr} aktiva avtal, ${issue.ratingChanges} betygsändringar, ${issue.left} lämnade statistiken. Marknadsbrevet från RoM Insight.`,
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function IssuePage({ params }: Props) {
  const { slug } = await params;
  const issue = await getIssue(slug);
  if (!issue) notFound();

  const delta = issue.contractsCurr - issue.contractsPrev;

  return (
    <article className="max-w-3xl space-y-8">
      <div>
        <Link href="/marknadsbrevet" className="text-sm text-[var(--text-dim)] hover:text-[var(--text)]">
          ← Alla nummer
        </Link>
        <p className="mono-label mt-3">{periodLabel(issue.period)}</p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          Rusta &amp; matcha i siffror — {periodLabel(issue.period)}
        </h1>
        <p className="text-sm text-[var(--text-dim)] mt-2">
          Sammanställt ur Arbetsförmedlingens släpp, jämfört med {periodLabel(issue.prevPeriod)}. Varje siffra
          är spårbar till källfilen.
        </p>
      </div>

      <Section title="1. Störst lyft">
        <MoverList movers={issue.lifts} />
      </Section>

      <Section title="2. Största tapp">
        <MoverList movers={issue.drops} />
      </Section>

      <Section title="3. Riskzonen">
        <p>
          {issue.riskCurr} avtal uppfyller nu riskkriterierna som kan läsas ur filen (betyg 1 eller saknas samt
          viktat resultat under 0,2) — {issue.riskPrev > issue.riskCurr ? "ner" : issue.riskPrev < issue.riskCurr ? "upp" : "oförändrat"} från{" "}
          {issue.riskPrev} i {periodLabel(issue.prevPeriod)}. AF:s fullständiga prövning kräver därtill 22 månaders
          aktivt avtal och brister vid två uppföljningar i rad.{" "}
          <Link href="/riskzon" className="link">Hela riskzonen →</Link>
        </p>
      </Section>

      <Section title="4. Marknadsförändringar">
        <p>
          {issue.contractsCurr} aktiva avtal ({delta >= 0 ? "+" : ""}{delta} sedan {periodLabel(issue.prevPeriod)}).{" "}
          {issue.entered} nya i statistiken, {issue.left} lämnade — varför framgår inte av AF:s filer.{" "}
          {issue.ratingChanges} avtal fick ändrat betyg.{" "}
          <Link href="/handelser" className="link">Alla händelser →</Link>
        </p>
      </Section>

      <Section title="5. Siffran att minnas">
        <p className="text-3xl font-semibold tabular-nums">{issue.lowestRatingShare} %</p>
        <p className="mt-1">
          Så stor andel av de {issue.ratedCount} betygsatta avtalen har lägsta betyget ({issue.lowestRatingCount} avtal)
          — och betyg 1 är ett av kriterierna i Arbetsförmedlingens hävningsprövning.
        </p>
      </Section>

      <footer className="text-xs text-[var(--text-dim)] border-t border-[var(--line)] pt-4 leading-relaxed">
        Källa: Arbetsförmedlingens resultatuppföljning och betyg för Rusta och matcha, perioderna{" "}
        {periodLabel(issue.prevPeriod)} och {periodLabel(issue.period)}. Viktat resultatmått justerar för
        deltagarnas nivå (A/B/C), inte för lokal arbetsmarknad — läs{" "}
        <Link href="/metod" className="link">vår metodsida</Link>. Hittar du ett fel? Säg till — vi rättar öppet.
        Sammanställningen är automatiskt beräknad ur källfilerna.
      </footer>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-medium mb-2">{title}</h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function MoverList({ movers }: { movers: Mover[] }) {
  if (!movers.length) return <p className="text-[var(--text-dim)]">Kräver två perioder med jämförbara avtal.</p>;
  return (
    <ul className="space-y-1.5">
      {movers.map((m) => (
        <li key={`${m.supplier}|${m.delivery_area}`}>
          <Link href={`/leverantorer/${slugify(m.supplier)}`} className="hover:text-[var(--compare-1)]">
            {m.supplier}
          </Link>{" "}
          <span className="text-[var(--text-dim)]">({m.delivery_area}):</span>{" "}
          <span className="tabular-nums">
            {formatScore(m.from)} → {formatScore(m.to)} ({m.delta >= 0 ? "+" : "−"}{formatScore(Math.abs(m.delta))})
          </span>
        </li>
      ))}
    </ul>
  );
}
