import { CompareExplorer, ContractOption } from "@/components/CompareExplorer";
import { DataStamp } from "@/components/DataStamp";
import { getLatestPeriod, getPeriodRows, getPeriods, getTopContracts } from "@/lib/queries";

export const revalidate = 3600;

export const metadata = {
  title: "Jämför avtal",
  description:
    "Jämför Rusta och matcha-leverantörers viktade resultat över tid, per avtal och leveransområde. Upp till sex avtal i samma graf.",
};

interface Props {
  searchParams: Promise<{ keys?: string }>;
}

export default async function ComparePage({ searchParams }: Props) {
  const { keys } = await searchParams;
  const [periods, latest] = await Promise.all([getPeriods(), getLatestPeriod()]);
  const rows = latest ? await getPeriodRows(latest) : [];

  const options: ContractOption[] = rows
    .map((r) => ({ key: `${r.supplier}|${r.delivery_area}`, supplier: r.supplier, delivery_area: r.delivery_area }))
    .sort((a, b) => a.supplier.localeCompare(b.supplier, "sv"));

  let initialKeys: string[];
  if (keys) {
    const requested = decodeURIComponent(keys).split(",");
    const valid = new Set(options.map((o) => o.key));
    initialKeys = requested.filter((k) => valid.has(k));
  } else {
    const top5 = latest ? await getTopContracts(latest, 5) : [];
    initialKeys = top5.map((r) => `${r.supplier}|${r.delivery_area}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jämför avtal</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1 max-w-2xl">
          Startvyn visar topp 5 i Sverige. Sök och lägg till valfria avtal — max sex samtidigt för läsbarhet.
          Jämförelsen sker per avtal (leverantör × område); vi slår aldrig ihop områden till ett beräknat snitt.
        </p>
        <div className="mt-2"><DataStamp period={latest} /></div>
      </div>
      <CompareExplorer options={options} periods={periods} initialKeys={initialKeys} />
    </div>
  );
}
