import { Spinner } from "@/components/Spinner";

/**
 * Route-nivå laddningsindikator (Next.js App Router). Visas direkt vid
 * navigering till en server-renderad sida medan datan hämtas — användaren
 * ser att sidan "tänker" i stället för en till synes död skärm.
 */
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner label="Hämtar data…" />
    </div>
  );
}
