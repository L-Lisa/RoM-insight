/** Kanonisk sajt-URL — EN källa. Env-varn vinner (preview/staging); fallbacken
 *  är produktionsdomänen. Byt ALDRIG denna i enskilda filer. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rustaochmatcha-insights.se";
