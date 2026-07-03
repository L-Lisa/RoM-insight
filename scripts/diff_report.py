"""
Diff-motorn (Fas 1, steg 8): människoläsbar rapport över vad som ändrats
mellan två perioder — underlaget för händelseloggen och Marknadsbrevet (T7).

Guardrails lager 2 (punkt 6): rapporten godkänns av en människa innan något
publiceras. Lager 3: varje siffra är deterministiskt beräknad ur källfilerna —
ingen LLM producerar tal.

Usage:
  python scripts/diff_report.py                 # två senaste perioderna i källfilerna
  python scripts/diff_report.py 2026-03 2026-05 # valfria perioder
Output: data/generated_sql/diff-<prev>-<curr>.md + stdout
"""

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from backfill import RESULT_FILES, SOURCE_DIR, parse_result_sheet

OUT_DIR = Path(__file__).parent.parent / "data" / "generated_sql"

MONTHS = ["januari", "februari", "mars", "april", "maj", "juni",
          "juli", "augusti", "september", "oktober", "november", "december"]


def label(period: str) -> str:
    y, m = period.split("-")
    return f"{MONTHS[int(m) - 1]} {y}"


def load_period(period: str) -> pd.DataFrame:
    for fname, plist in RESULT_FILES.items():
        if period in plist:
            return parse_result_sheet(pd.ExcelFile(SOURCE_DIR / fname), period)
    raise SystemExit(f"Perioden {period} finns inte i RESULT_FILES (uppdatera backfill.py först)")


def fmt(v) -> str:
    return f"{v:.3f}".replace(".", ",")


def main():
    all_periods = sorted(p for plist in RESULT_FILES.values() for p in plist)
    if len(sys.argv) == 3:
        prev_p, curr_p = sys.argv[1], sys.argv[2]
    else:
        prev_p, curr_p = all_periods[-2], all_periods[-1]

    prev = load_period(prev_p).set_index("ka_number")
    curr = load_period(curr_p).set_index("ka_number")

    common = sorted(set(prev.index) & set(curr.index))
    entered = curr.loc[sorted(set(curr.index) - set(prev.index))]
    left = prev.loc[sorted(set(prev.index) - set(curr.index))]

    deltas = (curr.loc[common, "weighted_score"] - prev.loc[common, "weighted_score"]).dropna().sort_values()
    rating_changes = int((prev.loc[common, "rating"].fillna(-1) != curr.loc[common, "rating"].fillna(-1)).sum())

    # Riskzon enligt AF:s publika kriterier (betyg 1/saknas + viktat < 0,2)
    def risk_count(df):
        low_rating = df["rating"].isna() | (df["rating"] == 1)
        return int((low_rating & (df["weighted_score"] < 0.2)).sum())

    risk_prev, risk_curr = risk_count(prev), risk_count(curr)

    lines = [
        f"# Diff: {label(prev_p)} → {label(curr_p)}",
        "",
        "Deterministiskt beräknad ur AF:s källfiler. Granskas av människa före publicering.",
        "",
        "## Marknaden",
        f"- Avtal: {len(prev)} → {len(curr)} ({len(curr) - len(prev):+d})",
        f"- Leverantörer: {prev['supplier'].nunique()} → {curr['supplier'].nunique()}",
        f"- Nya i statistiken: {len(entered)} · Lämnade statistiken: {len(left)}",
        f"- Betygsändringar: {rating_changes}",
        f"- Riskzon (betyg 1/saknas + viktat < 0,2): {risk_prev} → {risk_curr} ({risk_curr - risk_prev:+d})",
        "",
        "## Störst lyft (viktat resultatmått)",
    ]
    for ka in deltas.index[-3:][::-1]:
        r = curr.loc[ka]
        lines.append(f"- {r['supplier']} ({r['delivery_area']}): {fmt(prev.loc[ka, 'weighted_score'])} → {fmt(r['weighted_score'])} ({deltas[ka]:+.3f})".replace(".", ","))
    lines.append("")
    lines.append("## Största tapp")
    for ka in deltas.index[:3]:
        r = curr.loc[ka]
        lines.append(f"- {r['supplier']} ({r['delivery_area']}): {fmt(prev.loc[ka, 'weighted_score'])} → {fmt(r['weighted_score'])} ({deltas[ka]:+.3f})".replace(".", ","))

    if len(left):
        lines += ["", "## Lämnade statistiken (orsak framgår ej av AF:s filer)"]
        for ka, r in left.iterrows():
            lines.append(f"- {r['supplier']} ({r['delivery_area']}) — sista viktat {fmt(r['weighted_score'])}, betyg {int(r['rating']) if pd.notna(r['rating']) else 'saknas'}")

    lines += ["", f"*Källa: Arbetsförmedlingens resultatuppföljning, perioder {prev_p} och {curr_p}.*"]

    report = "\n".join(lines) + "\n"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"diff-{prev_p}-{curr_p}.md"
    out.write_text(report, encoding="utf-8")
    print(report)
    print(f"Sparad: {out}")


if __name__ == "__main__":
    main()
