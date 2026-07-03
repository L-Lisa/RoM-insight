import { SupplierDirectory, DirectoryEntry } from "@/components/SupplierDirectory";
import { DataStamp } from "@/components/DataStamp";
import { getLatestPeriod, getPeriodRows, getSuppliers } from "@/lib/queries";
import { slugify } from "@/lib/format";

export const revalidate = 3600;

export const metadata = {
  title: "Leverantörer",
  description:
    "Alla Rusta och matcha-leverantörer: betyg, viktade resultat och trender per leveransområde. Sökbar katalog, grupperad efter status.",
};

export default async function LeverantorerPage() {
  const [suppliers, latest] = await Promise.all([getSuppliers(), getLatestPeriod()]);
  const latestRows = latest ? await getPeriodRows(latest) : [];

  const active = new Map<string, { areas: number; bestRating: number | null }>();
  for (const r of latestRows) {
    const cur = active.get(r.supplier) ?? { areas: 0, bestRating: null };
    cur.areas += 1;
    if (r.rating !== null && (cur.bestRating === null || r.rating > cur.bestRating)) cur.bestRating = r.rating;
    active.set(r.supplier, cur);
  }

  const entries: DirectoryEntry[] = suppliers.map((s) => {
    const a = active.get(s.name);
    if (!a) return { name: s.name, slug: s.slug || slugify(s.name), group: "exited" as const, areas: 0, bestRating: null };
    return {
      name: s.name,
      slug: s.slug || slugify(s.name),
      group: a.bestRating === null ? ("unrated" as const) : ("active" as const),
      areas: a.areas,
      bestRating: a.bestRating,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leverantörer</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">
          {entries.filter((e) => e.group !== "exited").length} leverantörer i senaste statistiken ·{" "}
          {entries.filter((e) => e.group === "exited").length} utgångna
        </p>
        <div className="mt-2">
          <DataStamp period={latest} />
        </div>
      </div>
      <SupplierDirectory entries={entries} />
    </div>
  );
}
