import Link from "next/link";
import { CONTACT_LINKEDIN } from "@/lib/site";

/**
 * Diskret inbjudan till skräddarsydda analyser. Placeras där en leverantör
 * tittar på sina egna siffror (profilsidan, /vad-kravs) — köpögonblicket.
 * Aldrig löften om betyg eller utfall — bara djupare underlag.
 */
export function AnalysCta() {
  return (
    <aside
      className="no-print card p-4 text-sm max-w-3xl"
      style={{ borderColor: "color-mix(in srgb, var(--signal) 30%, var(--line))" }}
    >
      <p className="font-medium mb-1">Vill ni gå djupare än sajten visar?</p>
      <p className="text-[var(--text-dim)]">
        Lisa (KarriärSmeden) tar fram skräddarsydda analyser — en genomgång av era siffror i sitt sammanhang,
        konkurrentjämförelser eller underlag inför en etablering.{" "}
        <a href={CONTACT_LINKEDIN} target="_blank" rel="noreferrer" className="link">
          Skicka ett meddelande på LinkedIn
        </a>{" "}
        eller <Link href="/om#analyser" className="link">läs mer</Link>.
      </p>
    </aside>
  );
}
