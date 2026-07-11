import Link from "next/link";
import { periodLabel } from "@/lib/format";

/**
 * Trust-lagret (kravprofil §4a): källa + datumstämpel på varje vy,
 * diskret men alltid synlig, med länk till metodsidan.
 */
export function DataStamp({ period, note }: { period: string | null; note?: string }) {
  return (
    <p className="data-stamp">
      Data: Arbetsförmedlingen{period ? `, ${periodLabel(period)}` : ""}
      {note ? ` · ${note}` : ""} ·{" "}
      <Link href="/metod" className="underline decoration-[var(--line)] underline-offset-2 hover:text-[var(--text)]">
        metod &amp; källor
      </Link>
    </p>
  );
}
