import { DataStamp } from "@/components/DataStamp";
import { VadKravsExplorer, WktContract } from "@/components/VadKravsExplorer";
import { getLatestPeriod, getPeriodRows, getPeriodWeights } from "@/lib/queries";
import { periodLabel } from "@/lib/format";
import { weightedSum } from "@/lib/whatItTakes";

export const revalidate = 3600;

interface Props {
  searchParams: Promise<{ avtal?: string }>;
}

function decodeAvtal(raw?: string): { supplier: string; area: string } | null {
  if (!raw) return null;
  const [supplier, area] = decodeURIComponent(raw).split("|");
  return supplier && area ? { supplier, area } : null;
}

export async function generateMetadata({ searchParams }: Props) {
  const { avtal } = await searchParams;
  const sel = decodeAvtal(avtal);
  // Validera mot datan — OG-kortet får aldrig lova ett avtal som inte finns
  // (utgånget/felstavat i en delad länk faller tillbaka till den generiska titeln).
  let valid = false;
  if (sel) {
    const latest = await getLatestPeriod();
    const rows = latest ? await getPeriodRows(latest) : [];
    valid = rows.some((r) => r.supplier === sel.supplier && r.delivery_area === sel.area);
  }
  const base = "Vad krävs? — räkna ut vad som krävs för att nå tröskeln, snittet eller toppen i Rusta och matcha";
  if (!sel || !valid) {
    const og = `/og?${new URLSearchParams({ title: "Vad krävs?", sub: "Räkna ut vad som krävs för att nå tröskeln, snittet eller toppen i ditt leveransområde" })}`;
    return {
      title: "Vad krävs?",
      description: base,
      openGraph: { title: "Vad krävs?", images: [{ url: og, width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image" as const },
    };
  }
  const title = `Vad krävs för ${sel.supplier} i ${sel.area}?`;
  const og = `/og?${new URLSearchParams({ title, sub: "Vad som krävs för att nå tröskeln, områdets snitt eller ikapp en konkurrent" })}`;
  return {
    title,
    description: `${sel.supplier} i ${sel.area}: räkna ut vad som krävs för att nå tröskeln, områdets snitt eller ikapp en konkurrent. Utifrån Arbetsförmedlingens egen formel.`,
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" as const },
  };
}

export default async function VadKravsPage({ searchParams }: Props) {
  const { avtal } = await searchParams;
  const latest = await getLatestPeriod();
  const [rows, weights] = await Promise.all([
    latest ? getPeriodRows(latest) : Promise.resolve([]),
    latest ? getPeriodWeights(latest) : Promise.resolve(null),
  ]);

  // Kompakt: viktad summa förberäknas på servern (klienten behöver inte
  // nivåfälten, bara summan för matematiken).
  const contracts: WktContract[] = rows.map((r) => ({
    supplier: r.supplier,
    area: r.delivery_area,
    ws: r.weighted_score,
    r: r.rating,
    p: r.participants,
    sum: weights ? weightedSum(r, weights) : null,
  }));

  const sel = decodeAvtal(avtal);
  const initialKey = sel ? `${sel.supplier}|${sel.area}` : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vad krävs?</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1 max-w-2xl">
          Välj ett avtal och ett mål, så räknar vi ut ungefär hur många fler godkända resultat som skulle krävas
          för att nå dit — utifrån Arbetsförmedlingens egen formel, på {latest ? periodLabel(latest) : "senaste periodens"} deltagarvolym.
          Bara det viktade resultatet går att räkna fram. Betyget sätts av AF och lovar vi aldrig.
        </p>
        <div className="mt-2"><DataStamp period={latest} /></div>
      </div>

      <VadKravsExplorer
        contracts={contracts}
        weights={weights}
        periodLabel={latest ? periodLabel(latest) : "senaste perioden"}
        initialKey={initialKey}
      />
    </div>
  );
}
