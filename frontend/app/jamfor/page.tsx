import { CompareExplorer } from "@/components/CompareExplorer";
import { DataStamp } from "@/components/DataStamp";
import { getAllCloudSeries, getLatestPeriod, getPeriods, getTopContracts } from "@/lib/queries";

export const revalidate = 3600;

export const metadata = {
  title: "Jämför avtal — konstellationen",
  description:
    "Hela Rusta och matcha-marknaden som konstellation: alla avtals viktade resultat över tid. Lyft upp till sex avtal och jämför.",
};

interface Props {
  searchParams: Promise<{ keys?: string }>;
}

export default async function ComparePage({ searchParams }: Props) {
  const { keys } = await searchParams;
  const [periods, latest] = await Promise.all([getPeriods(), getLatestPeriod()]);
  const cloud = await getAllCloudSeries(periods);

  let initialKeys: string[];
  if (keys) {
    const requested = decodeURIComponent(keys).split(",");
    const valid = new Set(cloud.map((s) => `${s.supplier}|${s.delivery_area}`));
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
          Hela marknaden som moln — varje linje ett avtal. Startvyn lyfter topp 5 i Sverige; klicka i molnet
          eller sök för att lyfta fler (max sex för läsbarhet). Vi slår aldrig ihop områden till beräknade snitt.
        </p>
        <div className="mt-2"><DataStamp period={latest} /></div>
      </div>
      <CompareExplorer cloud={cloud} periods={periods} initialKeys={initialKeys} />
    </div>
  );
}
