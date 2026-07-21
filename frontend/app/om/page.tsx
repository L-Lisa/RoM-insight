import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata = {
  title: "Om sajten",
  description:
    "Vem som står bakom RoM Insight, varför sajten finns och hur den finansieras. Transparens är hela varumärket.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Om RoM Insight</h1>
      </div>

      <section className="text-sm leading-relaxed space-y-4">
        <p>
          RoM Insight är en oberoende statistiksajt för Rusta och matcha-marknaden. Arbetsförmedlingen publicerar
          betyg och resultat varannan månad — men bara som ögonblicksbilder i Excel-filer som byts ut vid varje
          släpp. Den här sajten sparar historiken, visar trenderna och förklarar siffrorna på klarspråk, så att
          leverantörer, journalister och deltagare kan se hur marknaden faktiskt utvecklas.
        </p>
        <p>
          Sajten byggs och drivs av <strong>KarriärSmeden</strong> — Lisa Ojeland, jobbcoach och systemutvecklare
          som arbetar i Rusta och matcha-branschen. Det är också därför sajten finns: verktyget vi själva saknade.
        </p>
        <p className="card p-4">
          <strong>Oberoende:</strong> ingen leverantör kan betala för placering, betyg eller framhävning i
          statistiken. Datan kommer oavkortad från Arbetsförmedlingens filer, och beräkningar vi själva gör
          (percentiler, händelser) är alltid märkta som våra. Läs mer på{" "}
          <Link href="/metod" className="link">metodsidan</Link>.
        </p>
        <p>
          Kontakt: <a className="link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>

      <section id="analyser" className="text-sm leading-relaxed space-y-3 scroll-mt-20">
        <h2 className="text-base font-medium">Skräddarsydda analyser</h2>
        <p>
          Sajten visar det Arbetsförmedlingen publicerar. Behöver din verksamhet mer — en genomgång av ert
          leveransområde, en konkurrentjämförelse eller ett underlag inför en etablering i nya områden — tar jag sådana uppdrag.
          Mejla <a className="link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> och beskriv vad du
          behöver, så återkommer jag med vad som går att göra.
        </p>
      </section>
    </div>
  );
}
