"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Översikt" },
  { href: "/leverantorer", label: "Leverantörer" },
  { href: "/leveransomraden", label: "Leveransområden" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6 text-sm">
      {links.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "text-gray-900 font-medium"
                : "text-gray-500 hover:text-gray-900 transition-colors"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
