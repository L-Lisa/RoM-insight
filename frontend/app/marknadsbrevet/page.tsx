import Link from "next/link";
import { DataStamp } from "@/components/DataStamp";
import { getAllIssues } from "@/lib/newsletter";
import { formatScore, periodLabel } from "@/lib/format";

export const revalidate = 3600;

export const metadata = {
  title: "Marknadsbrevet",
  description:
    "Rusta och matcha-marknaden i siffror, varannan månad: störst lyft, största tapp, riskzonen och marknadsförändringar — samma dag som Arbetsförmedlingen släpper ny data.",
  alternates: { types: { "application/rss+xml": "/marknadsbrevet/rss" } },
};

export default async function NewsletterArchivePage() {
  const issues = await getAllIssues();
  const latest = issues[0]?.period ?? null;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marknadsbrevet</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          Rusta och matcha-marknaden i siffror — ett nummer per AF-släpp, varannan månad. Nästa nummer
          publiceras samma dag som Arbetsförmedlingens nästa släpp (slutet av juli).
        </p>
        <p className="text-sm mt-2">
          Följ via{" "}
          <a href="/marknadsbrevet/rss" className="link">
            RSS
          </a>{" "}
          — e-postprenumeration kommer.
        </p>
        <div className="mt-2"><DataStamp period={latest} /></div>
      </div>

      <div className="space-y-4">
        {issues.map((i) => (
          <Link key={i.slug} href={`/marknadsbrevet/${i.slug}`} className="card p-5 block hover:bg-[var(--bg-hover)] transition-colors">
            <p className="mono-label">{periodLabel(i.period)}</p>
            <h2 className="text-lg font-medium mt-1">
              Rusta &amp; matcha i siffror — {periodLabel(i.period)}
            </h2>
            <p className="text-sm text-[var(--text-dim)] mt-2">
              {i.contractsCurr} aktiva avtal ({i.contractsCurr - i.contractsPrev >= 0 ? "+" : ""}
              {i.contractsCurr - i.contractsPrev} sedan {periodLabel(i.prevPeriod)}) · {i.ratingChanges} betygsändringar ·{" "}
              {i.left} avtal lämnade statistiken · riskzonen {i.riskPrev} → {i.riskCurr}
              {i.lifts[0] && (
                <> · störst lyft: {i.lifts[0].supplier} ({formatScore(i.lifts[0].from)} → {formatScore(i.lifts[0].to)})</>
              )}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
