"use client";

import { useState } from "react";
import Link from "next/link";
import { Tooltip } from "@/components/Tooltip";
import { tooltips } from "@/lib/tooltips";

interface SupplierRow {
  supplier: string;
  delivery_area: string;
  weighted_score: number | null;
  result_rate: number | null;
  rating: number | null;
  risk_of_termination: boolean;
}

export function SupplierSearch({ suppliers }: { suppliers: SupplierRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? suppliers.filter(
        (s) =>
          s.supplier.toLowerCase().includes(query.toLowerCase()) ||
          s.delivery_area.toLowerCase().includes(query.toLowerCase())
      )
    : suppliers;

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Sök leverantör eller leveransområde..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full sm:w-96 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Leverantör</th>
              <th className="px-4 py-3 text-left">
                <Tooltip label="Leveransområde" text={tooltips.leveransomrade} />
              </th>
              <th className="px-4 py-3 text-right">
                <Tooltip label="Viktat resultat" text={tooltips.viktatResultat} />
              </th>
              <th className="px-4 py-3 text-right">
                <Tooltip label="Resultattakt" text={tooltips.resultattakt} />
              </th>
              <th className="px-4 py-3 text-right">
                <Tooltip label="Betyg" text={tooltips.betyg} />
              </th>
              <th className="px-4 py-3 text-center">
                <Tooltip label="Riskerar hävning" text={tooltips.riskHavning} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/leverantorer/${encodeURIComponent(row.supplier)}`}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {row.supplier}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <Link
                    href={`/leveransomraden/${encodeURIComponent(row.delivery_area)}`}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {row.delivery_area}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.weighted_score?.toFixed(3) ?? "–"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.result_rate != null
                    ? `${(row.result_rate * 100).toFixed(1)}%`
                    : "–"}
                </td>
                <td className="px-4 py-3 text-right">
                  {row.rating ?? <span className="text-gray-400">–</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {row.risk_of_termination ? (
                    <span className="inline-block bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      Ja
                    </span>
                  ) : (
                    <span className="text-gray-300">–</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">
            Inga leverantörer hittades för &quot;{query}&quot;.
          </p>
        )}
      </div>

      {query.trim() && (
        <p className="text-xs text-gray-400">
          {filtered.length} av {suppliers.length} leverantörsavtal
        </p>
      )}
    </div>
  );
}
