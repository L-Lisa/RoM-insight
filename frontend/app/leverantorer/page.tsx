import { supabase } from "@/lib/supabase";
import { SupplierSearch } from "@/components/SupplierSearch";

async function getAllSuppliers() {
  const { data } = await supabase
    .from("rom_results")
    .select("supplier, delivery_area, weighted_score, rating, result_rate, risk_of_termination, dataset_date")
    .order("weighted_score", { ascending: false });
  return data ?? [];
}

export default async function LeverantörerPage() {
  const suppliers = await getAllSuppliers();

  const dates = [...new Set(suppliers.map((s) => s.dataset_date))].sort().reverse();
  const latestDate = dates[0];
  const latest = suppliers.filter((s) => s.dataset_date === latestDate);

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
