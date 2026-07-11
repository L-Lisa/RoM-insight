import { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ro-m-insight.vercel.app";

/**
 * AI-crawlers är uttryckligen välkomna (GEO, seo-ai-synlighet.md §4):
 * innehållet vill bli citerat — trafiken kommer via attributionen.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "CCBot", allow: "/" },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
