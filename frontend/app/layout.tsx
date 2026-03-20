import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ROM Insight",
  description: "Analysdashboard för Rusta och Matcha-leverantörer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body className={`${geist.className} bg-gray-50 text-gray-900 min-h-screen antialiased`}>
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              ROM Insight
            </Link>
            <NavLinks />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-xs text-gray-400">
            Källa: Arbetsförmedlingen · Data publiceras var annan månad
          </div>
        </footer>
      </body>
    </html>
  );
}
