import { supabase } from "@/lib/supabase";
import { SupplierSearch } from "@/components/SupplierSearch";

async function getLatestSuppliers() {
  const { data: dateRow } = await supabase
    .from("rom_results")
    .select("dataset_date")
    .order("dataset_date", { ascending: false })
    .limit(1)
    .single();

  const latestDate = dateRow?.dataset_date ?? null;
  if (!latestDate) return { latest: [], latestDate: null };

  const { data } = await supabase
    .from("rom_results")
    .select("supplier, delivery_area, weighted_score, rating, result_rate, risk_of_termination, dataset_date")
    .eq("dataset_date", latestDate)
    .order("weighted_score", { ascending: false });

  return { latest: data ?? [], latestDate };
}

export default async function LeverantörerPage() {
  const { latest, latestDate } = await getLatestSuppliers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Leverantörer</h1>
        <p className="text-sm text-gray-500 mt-1">
          {latest.length} leverantörsavtal · Period: {latestDate} · Källa: Arbetsförmedlingen
        </p>
      </div>

      <SupplierSearch suppliers={latest} />
    </div>
  );
}
