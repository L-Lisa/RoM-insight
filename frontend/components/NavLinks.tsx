"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Översikt" },
  { href: "/marknad", label: "Marknad" },
  { href: "/leverantorer", label: "Leverantörer" },
  { href: "/leveransomraden", label: "Områden" },
  { href: "/jamfor", label: "Jämför" },
  { href: "/riskzon", label: "Riskzon" },
  { href: "/vad-kravs", label: "Vad krävs?" },
  { href: "/handelser", label: "Händelser" },
  { href: "/arkiv", label: "Arkiv" },
  { href: "/marknadsbrevet", label: "Marknadsbrevet" },
  { href: "/metod", label: "Metod" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto">
      {links.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
              active
                ? "bg-[var(--bg-hover)] text-[var(--text)]"
                : "text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
