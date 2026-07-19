import { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
const BASE = SITE_URL;

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
