"use client";

import { useMemo, useRef, useState } from "react";
import { CloudSeries } from "@/lib/types";
import { formatScore, periodShort } from "@/lib/format";
import { selectionColor } from "@/components/SelectionChips";
import { contractKey } from "@/lib/compare";
import { AF_TERMINATION_THRESHOLD, AF_TERMINATION_THRESHOLD_LABEL } from "@/lib/afRules";

/**
 * Konstellationsgrafen — sajtens signatur ("lyfta en stjärna ur natthimlen").
 * Hela marknaden som lågmält moln; valda avtal lyfts i jämförelsefärgerna.
 * Custom SVG (kravprofil §4g: Recharts klarar inte interaktionen).
 * Ärlighetsregler: molnet är kontext (får vara lågkontrast, §4b), men valda
 * linjer har synliga punktmarkörer på de faktiska mätningarna (§4d) och
 * segment dras aldrig över luckor; saknad period är ett hål, inte en linje.
 */

const W = 960;
const H = 420;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };
const Y_MAX = 0.7; // enstaka småavtal ligger över; kapas visuellt, anges i foten

export function ConstellationCloud({
  cloud,
  periods,
  selected,
  onSelect,
  maxSelected,
}: {
  cloud: CloudSeries[];
  periods: string[];
  selected: string[];
  onSelect: (key: string) => void;
  maxSelected: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ key: string; x: number; y: number } | null>(null);

  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (periods.length === 1 ? iw / 2 : (i / (periods.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (Math.min(v, Y_MAX) / Y_MAX) * ih;

  const keyOf = (s: CloudSeries) => contractKey(s.supplier, s.delivery_area);
  const byKey = useMemo(() => new Map(cloud.map((s) => [keyOf(s), s])), [cloud]);

  // Sammanhängande segment (inga linjer över luckor)
  const segments = (s: CloudSeries): string[] => {
    const paths: string[] = [];
    let d = "";
    for (let i = 0; i < s.values.length; i++) {
      const v = s.values[i];
      if (v === null) {
        if (d) paths.push(d);
        d = "";
      } else {
        d += d ? ` L ${x(i).toFixed(1)} ${y(v).toFixed(1)}` : `M ${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
      }
    }
    if (d) paths.push(d);
    return paths;
  };

  function nearestSeries(mx: number, my: number): { key: string; dist: number } | null {
    let best: { key: string; dist: number } | null = null;
    // Närmsta perioden i x-led, jämför y-avstånd där serien har värde
    const fi = periods.length === 1 ? 0 : ((mx - PAD.left) / iw) * (periods.length - 1);
    const i0 = Math.max(0, Math.min(periods.length - 1, Math.round(fi)));
    for (const s of cloud) {
      const v = s.values[i0];
      if (v === null) continue;
      const dist = Math.abs(y(v) - my);
      if (!best || dist < best.dist) best = { key: keyOf(s), dist };
    }
    return best && best.dist < 24 ? best : null;
  }

  function toSvgCoords(e: React.MouseEvent): { mx: number; my: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      mx: ((e.clientX - rect.left) / rect.width) * W,
      my: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Alla avtals viktade resultat över tid — valda avtal markerade"
        onMouseMove={(e) => {
          const { mx, my } = toSvgCoords(e);
          const hit = nearestSeries(mx, my);
          setHover(hit ? { key: hit.key, x: mx, y: my } : null);
        }}
        onMouseLeave={() => setHover(null)}
        onClick={() => {
          if (hover && !selected.includes(hover.key) && selected.length < maxSelected) onSelect(hover.key);
        }}
        style={{ cursor: hover && !selected.includes(hover.key) ? "pointer" : "default" }}
      >
        {/* Axlar */}
        {[0, 0.2, 0.4, 0.6].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--line-soft)" strokeDasharray="3 4" />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-dim)">
              {v.toFixed(1).replace(".", ",")}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(AF_TERMINATION_THRESHOLD)} y2={y(AF_TERMINATION_THRESHOLD)} stroke="var(--risk)" strokeOpacity={0.35} />
        {periods.map((p, i) => (
          <text key={p} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-dim)">
            {periodShort(p)}
          </text>
        ))}

        {/* Molnet — kontextlager, lågkontrast per design */}
        <g>
          {cloud.map((s) => {
            const key = keyOf(s);
            if (selected.includes(key)) return null;
            const isHover = hover?.key === key;
            return segments(s).map((d, i) => (
              <path
                key={`${key}:${i}`}
                d={d}
                fill="none"
                stroke={isHover ? "var(--text-dim)" : "var(--compare-1)"}
                strokeOpacity={isHover ? 0.9 : 0.07}
                strokeWidth={isHover ? 1.8 : 1}
              />
            ));
          })}
        </g>

        {/* Valda — stjärnorna */}
        <g>
          {selected.map((key, idx) => {
            const s = byKey.get(key);
            if (!s) return null;
            const color = selectionColor(idx, selected.length);
            return (
              <g key={key}>
                {segments(s).map((d, i) => (
                  <path key={i} d={d} fill="none" stroke={color} strokeWidth={2.4} />
                ))}
                {s.values.map((v, i) =>
                  v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={4} fill={color} />,
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {hover && (
        <div
          className="absolute pointer-events-none px-3 py-1.5 rounded-lg border border-[var(--line)] text-xs"
          style={{
            background: "var(--bg-raised)",
            left: `${(hover.x / W) * 100}%`,
            top: `${(hover.y / H) * 100}%`,
            transform: "translate(-50%, -140%)",
            maxWidth: 320,
          }}
        >
          {(() => {
            const s = byKey.get(hover.key);
            if (!s) return null;
            const last = [...s.values].reverse().find((v) => v !== null);
            return (
              <>
                <span className="font-medium">{s.supplier}</span>
                <span className="text-[var(--text-dim)]"> — {s.delivery_area}</span>
                {last !== undefined && last !== null && <span className="tabular-nums"> · {formatScore(last)}</span>}
                {!selected.includes(hover.key) && selected.length < maxSelected && (
                  <span className="text-[var(--text-dim)]"> · klicka för att lyfta</span>
                )}
              </>
            );
          })()}
        </div>
      )}

      <p className="data-stamp mt-2">
        Varje linje är ett avtal (leverantör × område), {cloud.length} totalt. Orange linje = AF:s {AF_TERMINATION_THRESHOLD_LABEL}-tröskel.
        Y-axeln är kapad vid 0,7; enstaka mycket små avtal ligger över (syns i tabellerna). Punkterna på valda
        linjer är AF:s faktiska mätningar; luckor betyder att avtalet saknades den perioden.
      </p>
    </div>
  );
}
