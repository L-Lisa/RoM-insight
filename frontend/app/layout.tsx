import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { CompareTray } from "@/components/CompareTray";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: {
    default: "RoM Insight — statistik och trender för Rusta och matcha",
    template: "%s · RoM Insight",
  },
  description:
    "Oberoende statistiksajt för Rusta och matcha-marknaden: betyg, viktade resultat, trender, riskzon och händelser per leverantör och leveransområde. Data: Arbetsförmedlingen.",
  openGraph: {
    images: [{ url: "/og?title=Rusta%20och%20matcha-marknaden%20i%20siffror&sub=Betyg%2C%20viktade%20resultat%2C%20trender%20och%20h%C3%A4ndelser%20per%20leverant%C3%B6r%20och%20omr%C3%A5de", width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body className={`${geist.variable} ${geist.className} min-h-screen antialiased`}>
        <header className="border-b border-[var(--line)] bg-[var(--bg-raised)] sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="text-lg font-semibold tracking-tight shrink-0">
              RoM <span className="text-[var(--compare-1)]">Insight</span>
            </Link>
            <NavLinks />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        <CompareTray />
        <footer className="border-t border-[var(--line)] mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-xs text-[var(--text-dim)] space-y-2">
            <p>
              Källa: Arbetsförmedlingens öppna filer för Rusta och matcha · publiceras varannan månad ·{" "}
              <Link href="/metod" className="underline underline-offset-2 hover:text-[var(--text)]">metod &amp; källor</Link>
              {" · "}
              <Link href="/guide/vad-betyder-betyg" className="underline underline-offset-2 hover:text-[var(--text)]">vad betyder betygen?</Link>
              {" · "}
              <Link href="/om" className="underline underline-offset-2 hover:text-[var(--text)]">om sajten</Link>
            </p>
            <p>
              Hittar du ett fel har du gjort oss en tjänst — vi rättar inom 48 timmar.{" "}
              <Link href="/metod#hitta-felet" className="underline underline-offset-2 hover:text-[var(--text)]">
                Läs om Hitta felet-garantin
              </Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
