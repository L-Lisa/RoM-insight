/** Kanonisk sajt-URL — EN källa. Env-varn vinner (preview/staging); fallbacken
 *  är produktionsdomänen. Byt ALDRIG denna i enskilda filer. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rustaochmatcha-insights.se";

/** Kontaktadress — EN källa, används av om-sidan och Snabbguiden.
 *  OBS: adressen förutsätter att brevlådan finns — verifiera vid domänbyte. */
export const CONTACT_EMAIL = "hej@rominsight.se";
