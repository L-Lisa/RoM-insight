import { getAllIssues } from "@/lib/newsletter";
import { formatScore, periodLabel } from "@/lib/format";

export const revalidate = 3600;

import { SITE_URL } from "@/lib/site";
const BASE = SITE_URL;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  const issues = await getAllIssues();

  const items = issues
    .map((i) => {
      const title = `Rusta & matcha i siffror — ${periodLabel(i.period)}`;
      const lift = i.lifts[0]
        ? ` Störst lyft: ${i.lifts[0].supplier} (${formatScore(i.lifts[0].from)} → ${formatScore(i.lifts[0].to)}).`
        : "";
      const desc =
        `${i.contractsCurr} aktiva avtal (${i.contractsCurr - i.contractsPrev >= 0 ? "+" : ""}${i.contractsCurr - i.contractsPrev} sedan ${periodLabel(i.prevPeriod)}). ` +
        `${i.ratingChanges} betygsändringar, ${i.left} avtal lämnade statistiken, riskzonen ${i.riskPrev} → ${i.riskCurr}.${lift} ` +
        `${i.lowestRatingShare} % av betygsatta avtal har lägsta betyg. Källa: Arbetsförmedlingen.`;
      // AF släpper ~28:e i månaden — numret dateras till periodens månad, publiceringsdatumet är släppdagen
      return `    <item>
      <title>${esc(title)}</title>
      <link>${BASE}/marknadsbrevet/${i.slug}</link>
      <guid isPermaLink="true">${BASE}/marknadsbrevet/${i.slug}</guid>
      <pubDate>${new Date(i.period + "T08:00:00Z").toUTCString()}</pubDate>
      <description>${esc(desc)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Marknadsbrevet — RoM Insight</title>
    <link>${BASE}/marknadsbrevet</link>
    <description>Rusta och matcha-marknaden i siffror, varannan månad. Data: Arbetsförmedlingen.</description>
    <language>sv-SE</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
