import { getSupplierBySlug, getSuppliers, getSupplierResults } from "@/lib/queries";
import { formatScore, periodLabel, slugify } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

/**
 * Bevakning per leverantör — RSS utan e-postbeslut. Ett inlägg per AF-släpp
 * med leverantörens siffror; prenumeranter får notis automatiskt när ny
 * period importeras. Deterministiskt ur DB:n, samma mönster som
 * /marknadsbrevet/rss.
 */

export const revalidate = 3600;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ supplier: string }> }
) {
  const { supplier } = await params;
  let decoded: string;
  try {
    decoded = decodeURIComponent(supplier);
  } catch {
    // Trasig procent-kodning från externa RSS-läsare → 404, inte 500
    return new Response("Not found", { status: 404 });
  }
  let sup = await getSupplierBySlug(decoded);
  if (!sup) {
    const all = await getSuppliers();
    sup = all.find((s) => s.name === decoded || s.slug === slugify(decoded)) ?? null;
  }
  if (!sup) return new Response("Not found", { status: 404 });

  const rows = await getSupplierResults(sup.name);
  if (!rows.length) return new Response("Not found", { status: 404 });

  const name = sup.name;
  const slug = slugify(name);
  const profileUrl = `${SITE_URL}/leverantorer/${slug}`;
  const periods = Array.from(new Set(rows.map((r) => r.dataset_date))).sort().reverse();

  const items = periods
    .map((p) => {
      const pr = rows.filter((r) => r.dataset_date === p);
      const parts = pr.map(
        (r) =>
          `${r.delivery_area}: viktat resultat ${formatScore(r.weighted_score)}` +
          (r.rating !== null ? `, betyg ${r.rating}` : ", ej betygsatt ännu")
      );
      const title = `${name} — ${periodLabel(p)}: ${pr.length} avtal`;
      const desc = `${parts.join(" · ")}. Källa: Arbetsförmedlingen.`;
      // AF släpper ~28:e i månaden — inlägget dateras som marknadsbrevets
      return `    <item>
      <title>${esc(title)}</title>
      <link>${profileUrl}</link>
      <guid isPermaLink="false">${esc(`${slug}-${p}`)}</guid>
      <pubDate>${new Date(p + "T08:00:00Z").toUTCString()}</pubDate>
      <description>${esc(desc)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(`${name} — bevakning via RoM Insight`)}</title>
    <link>${profileUrl}</link>
    <description>${esc(`Nya siffror för ${name} vid varje AF-släpp (varannan månad). Data: Arbetsförmedlingen.`)}</description>
    <language>sv-SE</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
