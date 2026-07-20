import { MetadataRoute } from "next";
import { getLatestPeriod, getPeriodRows, getSuppliers } from "@/lib/queries";

export const revalidate = 3600;

import { SITE_URL } from "@/lib/site";
const BASE = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [suppliers, latest] = await Promise.all([getSuppliers(), getLatestPeriod()]);
  const rows = latest ? await getPeriodRows(latest) : [];
  const areas = Array.from(new Set(rows.map((r) => r.delivery_area)));

  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/leverantorer`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/marknad`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/riskzon`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/vad-kravs`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/leveransomraden`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/jamfor`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/handelser`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/arkiv`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/marknadsbrevet`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/metod`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/om`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/guide/vad-betyder-betyg`, changeFrequency: "monthly", priority: 0.8 },
    ...suppliers.map((s) => ({
      url: `${BASE}/leverantorer/${s.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...areas.map((a) => ({
      url: `${BASE}/leveransomraden/${encodeURIComponent(a)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
