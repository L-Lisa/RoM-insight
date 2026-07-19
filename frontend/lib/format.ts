const MONTHS_SV = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

/** "2026-05-01" → "maj 2026" */
export function periodLabel(datasetDate: string): string {
  const [y, m] = datasetDate.split("-");
  return `${MONTHS_SV[parseInt(m, 10) - 1]} ${y}`;
}

/** Kort variant för grafaxlar: "maj 26" */
export function periodShort(datasetDate: string): string {
  const [y, m] = datasetDate.split("-");
  return `${MONTHS_SV[parseInt(m, 10) - 1].slice(0, 3)} ${y.slice(2)}`;
}

export function formatScore(v: number | null | undefined): string {
  if (v === null || v === undefined) return "–";
  return v.toFixed(3).replace(".", ",");
}

export function formatPercent(v: number | null | undefined): string {
  if (v === null || v === undefined) return "–";
  return `${Math.round(v * 100)} %`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/å/g, "a").replace(/ä/g, "a").replace(/ö/g, "o").replace(/é/g, "e").replace(/ü/g, "u")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function areaSlug(area: string): string {
  return slugify(area);
}

/** Betygsregeln: endast betygsatta avtal rankas i viktat resultat-mått
 *  (topplistor, lyft/tapp, percentiler, områdessnitt). Under AF:s betygsvillkor
 *  (minst 18 deltagare, 12 månaders verksamhet) är måttet inte jämförbart.
 *  Använd ALLTID denna predikat för rankningsbeslut, aldrig inline-checkar. */
export const isRankable = (r: { rating: number | null }): boolean => r.rating !== null;
