/** Kanonisk sajt-URL — EN källa. Env-varn vinner (preview/staging); fallbacken
 *  är produktionsdomänen. Byt ALDRIG denna i enskilda filer. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rustaochmatcha-insights.se";

/** Kontaktväg — EN källa, används av om-sidan och Snabbguiden.
 *  Lisas beslut 2026-07-21: meddelande via KarriärSmedens LinkedIn-sida,
 *  inte mejl (hej@rominsight.se var en död brevlåda — domänen köptes aldrig). */
export const CONTACT_LINKEDIN = "https://www.linkedin.com/company/karriarsmeden";
