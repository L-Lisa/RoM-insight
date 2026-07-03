"""
Backfill tool for ROM Insight — Fas 1 datagrund.

Parses AF's multi-period source files in data/raw/source/ and generates
SQL files + a human-readable QA report. Does NOT touch the database —
the generated SQL is reviewed and applied separately (guardrails layer 2:
automation prepares, a human releases).

Sources (canonical period → file):
  2025-03 .. 2025-11  resultatuppfoljning-mars-november-2025.xlsx
  2026-01 .. 2026-05  resultatuppfoljning-maj-2026.xlsx
  ratings jan 2025 – maj 2026: betyg-rusta-och-matcha-maj-2026.xlsx
  A/B/C weights per period: Beräkningssnurra sheets in both resultat files

2026-01 is already in production (imported earlier) — it is verified against
the file but NOT re-inserted; only its ka_number values are backfilled.

Output: data/generated_sql/NN_*.sql + data/generated_sql/backfill-report.md

Usage:
  python scripts/backfill.py
"""

import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from qa_validation import validate

ROOT = Path(__file__).parent.parent
SOURCE_DIR = ROOT / "data" / "raw" / "source"
OUT_DIR = ROOT / "data" / "generated_sql"

RESULT_FILES = {
    "resultatuppfoljning-mars-november-2025.xlsx": ["2025-03", "2025-05", "2025-07", "2025-09", "2025-11"],
    "resultatuppfoljning-maj-2026.xlsx": ["2026-01", "2026-03", "2026-05"],
}
# Overlap files used only for cross-checking identical content
CROSSCHECK_FILES = {
    "resultatuppfoljning-mars-maj-2025.xlsx": ["2025-03", "2025-05"],
    "resultatuppfoljning-mars-september-2025.xlsx": ["2025-03", "2025-05", "2025-07", "2025-09"],
}
BETYG_FILE = "betyg-rusta-och-matcha-maj-2026.xlsx"
ALREADY_IN_PROD = {"2026-01"}

SWEDISH_MONTHS = {
    "januari": 1, "februari": 2, "mars": 3, "april": 4, "maj": 5, "juni": 6,
    "juli": 7, "augusti": 8, "september": 9, "oktober": 10, "november": 11, "december": 12,
}

RR1_COLUMNS = ["ANTAL RR1 NIVÅ A", "ANTAL RR1 NIVÅ B", "ANTAL RR1 NIVÅ C"]


def period_to_date(period: str) -> date:
    y, m = period.split("-")
    return date(int(y), int(m), 1)


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = s.replace("å", "a").replace("ä", "a").replace("ö", "o").replace("é", "e").replace("ü", "u")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def sql_str(v) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def sql_num(v) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return "null"
    f = float(v)
    return str(int(f)) if f == int(f) else repr(round(f, 6))


def sql_bool(v) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return "null"
    return "true" if v else "false"


def parse_result_sheet(xl: pd.ExcelFile, period: str) -> pd.DataFrame:
    """Parse one 'Resultat YYYY-MM' sheet to the rom_results schema."""
    df = xl.parse(f"Resultat {period}")
    df.columns = df.columns.str.strip()

    required = ["PERIOD", "LEVERANSOMRÅDE", "LEVERANTÖRNAMN", "KA-NUMMER",
                "BETYG", "VIKTAT RESULTATMÅTT", "ANTAL DELTAGARE"] + RR1_COLUMNS
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise Exception(f"Resultat {period}: missing columns {missing}")

    # Sanity: the sheet's own PERIOD column must agree with the sheet name
    periods_in_sheet = set(df["PERIOD"].astype(str).str.strip())
    if periods_in_sheet != {period}:
        raise Exception(f"Resultat {period}: PERIOD column contains {periods_in_sheet}")

    out = pd.DataFrame()
    out["supplier"] = df["LEVERANTÖRNAMN"].astype(str).str.strip()
    out["delivery_area"] = df["LEVERANSOMRÅDE"].astype(str).str.strip()
    out["ka_number"] = df["KA-NUMMER"].astype(str).str.strip()
    out["participants"] = pd.to_numeric(df["ANTAL DELTAGARE"], errors="coerce")
    # RR1 only — RR2 is a follow-up for the same placement and would double-count
    out["results"] = df[RR1_COLUMNS].apply(pd.to_numeric, errors="coerce").sum(axis=1)
    out["rating"] = df["BETYG"].apply(lambda x: None if str(x).strip() == "-" else pd.to_numeric(x, errors="coerce"))
    out["weighted_score"] = pd.to_numeric(df["VIKTAT RESULTATMÅTT"], errors="coerce")
    # AF publishes RISKERAR HÄVNING only some periods; absent → NULL (never fabricate)
    if "RISKERAR HÄVNING" in df.columns:
        out["risk_of_termination"] = df["RISKERAR HÄVNING"].astype(str).str.strip().str.lower() == "ja"
    else:
        out["risk_of_termination"] = None
    out["result_rate"] = out.apply(
        lambda r: r["results"] / r["participants"] if pd.notna(r["participants"]) and r["participants"] > 0 else None,
        axis=1,
    )
    out["dataset_date"] = period_to_date(period)
    return out


def parse_weights(xl: pd.ExcelFile, period: str) -> dict:
    """Layout-independent: find 'Vikt nivå X' anywhere, take first numeric cell to its right."""
    sn = xl.parse(f"Beräkningssnurra {period}", header=None)
    weights = {}
    for _, row in sn.iterrows():
        for j, cell in enumerate(row):
            label = str(cell).strip() if pd.notna(cell) else ""
            if label.startswith("Vikt nivå"):
                for v in row[j + 1:]:
                    if pd.notna(v) and isinstance(v, (int, float)):
                        weights[label[-1]] = float(v)
                        break
    if set(weights) != {"A", "B", "C"}:
        raise Exception(f"Beräkningssnurra {period}: expected weights A/B/C, got {sorted(weights)}")
    return weights


def parse_betyg(path: Path) -> pd.DataFrame:
    """Wide betyg file → long (ka_number, period, rating)."""
    df = pd.ExcelFile(path).parse("Betyg över tid")
    df.columns = [str(c).strip() for c in df.columns]
    id_cols = ["Leverantörsnamn", "Leveransområde", "Af Region", "Ka-Nummer"]
    missing = [c for c in id_cols if c not in df.columns]
    if missing:
        raise Exception(f"Betyg file: missing columns {missing}")

    period_cols = []
    for c in df.columns:
        parts = c.lower().split()
        if len(parts) == 2 and parts[0] in SWEDISH_MONTHS and parts[1].isdigit():
            period_cols.append((c, date(int(parts[1]), SWEDISH_MONTHS[parts[0]], 1)))
    if not period_cols:
        raise Exception(f"Betyg file: no period columns found in {list(df.columns)}")

    rows = []
    bad_values = set()
    for _, r in df.iterrows():
        for col, period in period_cols:
            raw = str(r[col]).strip()
            if raw.lower() in ("betyg saknas", "-", "nan", ""):
                rating = None
            elif raw in ("1", "2", "3", "4") or raw in ("1.0", "2.0", "3.0", "4.0"):
                rating = int(float(raw))
            else:
                bad_values.add(raw)
                continue
            rows.append({
                "ka_number": str(r["Ka-Nummer"]).strip(),
                "supplier": str(r["Leverantörsnamn"]).strip(),
                "delivery_area": str(r["Leveransområde"]).strip(),
                "af_region": str(r["Af Region"]).strip(),
                "rating": rating,
                "period": period,
            })
    if bad_values:
        raise Exception(f"Betyg file: unexpected rating values {bad_values}")
    return pd.DataFrame(rows)


def chunked_insert(header: str, value_rows: list, chunk: int = 400) -> list:
    stmts = []
    for i in range(0, len(value_rows), chunk):
        stmts.append(header + "\n" + ",\n".join(value_rows[i:i + chunk]) + ";\n")
    return stmts


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report = ["# Backfill QA-rapport", "", f"Genererad av scripts/backfill.py. Källfiler i `data/raw/source/`.", ""]

    # ---- 1. Parse canonical result periods ----
    periods = {}   # period -> DataFrame
    weights = {}   # period -> {A,B,C}
    src_file = {}  # period -> filename
    for fname, plist in RESULT_FILES.items():
        xl = pd.ExcelFile(SOURCE_DIR / fname)
        for p in plist:
            periods[p] = parse_result_sheet(xl, p)
            weights[p] = parse_weights(xl, p)
            src_file[p] = fname

    # ---- 2. Revision check: AF revises past periods retroactively ----
    # Verified 2026-07-03: the same period carries updated values in later releases
    # (late-approved resultatersättningar, corrected participant counts).
    # Policy: the backfill uses the LATEST available revision per period.
    report.append("## Revisionskontroll (AF uppdaterar historiska perioder retroaktivt)")
    report.append("Policy: senaste tillgängliga revision per period importeras.")
    for fname, plist in CROSSCHECK_FILES.items():
        path = SOURCE_DIR / fname
        if not path.exists():
            report.append(f"- {fname}: SAKNAS — hoppad")
            continue
        xl = pd.ExcelFile(path)
        for p in plist:
            older = parse_result_sheet(xl, p).set_index("ka_number").sort_index()
            canon = periods[p].set_index("ka_number").sort_index()
            ka_diff = len(set(older.index) ^ set(canon.index))
            common = sorted(set(older.index) & set(canon.index))
            changed = {}
            for col in ["supplier", "delivery_area", "participants", "results", "rating", "weighted_score"]:
                oc = older.loc[common, col].astype(float, errors="ignore") if col not in ("supplier", "delivery_area") else older.loc[common, col]
                cc = canon.loc[common, col].astype(float, errors="ignore") if col not in ("supplier", "delivery_area") else canon.loc[common, col]
                n = int((oc.fillna(-999) != cc.fillna(-999)).sum())
                if n:
                    changed[col] = n
            status = "identiska" if not changed and not ka_diff else f"reviderade fält: {changed}, KA-skillnad: {ka_diff}"
            report.append(f"- {p}: {fname} → {src_file[p]}: {status}")
    report.append("")

    # ---- 3. QA per period (existing rules + guardrails counts) ----
    report.append("## QA per period")
    all_ok = True
    for p in sorted(periods):
        df = periods[p]
        qa = validate(df)
        dup_ka = df["ka_number"].duplicated().sum()
        dup_nat = df.duplicated(subset=["supplier", "delivery_area"]).sum()
        line = (f"- {p}: {len(df)} rader · {df['delivery_area'].nunique()} områden · "
                f"{df['supplier'].nunique()} leverantörer · risk-kolumn: "
                f"{'ja' if df['risk_of_termination'].notna().any() else 'nej (NULL)'} · "
                f"dubblett-KA: {dup_ka} · dubblett (namn+område): {dup_nat} · QA: "
                f"{'PASS' if qa.passed else 'FAIL'}")
        report.append(line)
        if not qa.passed:
            all_ok = False
            report.append("```\n" + str(qa) + "\n```")
        if dup_ka or dup_nat:
            all_ok = False
    report.append("")
    if not all_ok:
        (OUT_DIR / "backfill-report.md").write_text("\n".join(report), encoding="utf-8")
        raise Exception("QA failed — no SQL generated. See backfill-report.md")

    # ---- 4. Betyg (long) ----
    betyg = parse_betyg(SOURCE_DIR / BETYG_FILE)
    n_periods = betyg["period"].nunique()
    report.append("## Betygsfilen")
    report.append(f"- {len(betyg)} rader (ka × period), {betyg['ka_number'].nunique()} unika KA-nummer, "
                  f"{n_periods} perioder ({betyg['period'].min()} – {betyg['period'].max()})")
    report.append(f"- Satta betyg: {betyg['rating'].notna().sum()} · 'Betyg saknas' (NULL): {betyg['rating'].isna().sum()}")

    # ---- 5. Name consistency: same KA, different names across sources ----
    name_by_ka = {}
    conflicts = []
    for p in sorted(periods):
        for _, r in periods[p].iterrows():
            prev = name_by_ka.get(r["ka_number"])
            if prev and prev != r["supplier"]:
                conflicts.append((r["ka_number"], prev, r["supplier"], p))
            name_by_ka[r["ka_number"]] = r["supplier"]
    betyg_names = betyg.drop_duplicates("ka_number")[["ka_number", "supplier"]]
    for _, r in betyg_names.iterrows():
        prev = name_by_ka.get(r["ka_number"])
        if prev and prev != r["supplier"]:
            conflicts.append((r["ka_number"], prev, r["supplier"], "betygsfil"))
    report.append("")
    report.append("## Namnkonsistens (samma KA-nummer, olika namn)")
    if conflicts:
        for ka, a, b, where in sorted(set(conflicts)):
            report.append(f"- KA {ka}: '{a}' vs '{b}' ({where})")
        report.append(f"→ {len(set(c[0] for c in conflicts))} KA-nummer med namnvarianter. "
                      "Varianterna läggs i supplier_name_variants.")
    else:
        report.append("- Inga konflikter — namnen är konsekventa i alla källfiler.")

    # ---- 6. Generate SQL ----
    # 6a. suppliers + name variants
    canonical = {}  # name -> slug (canonical name = the one in the newest source it appears in)
    for src in [betyg] + [periods[p] for p in sorted(periods)]:
        for name in src["supplier"].unique():
            canonical[name] = slugify(name)
    slug_seen = {}
    for name, slug in sorted(canonical.items()):
        if slug in slug_seen:
            raise Exception(f"Slug collision: '{name}' and '{slug_seen[slug]}' both → {slug}")
        slug_seen[slug] = name
    supplier_rows = [f"({sql_str(n)}, {sql_str(s)})" for n, s in sorted(canonical.items())]
    sql = ["-- suppliers: alla leverantörsnamn ur källfilerna (idempotent)"]
    sql += chunked_insert("insert into suppliers (name, slug) values", supplier_rows)
    sql.append("-- on conflict-skydd: kör om säkert\n")
    text = sql[0] + "\n" + "".join(
        s.replace(";\n", "\non conflict (name) do nothing;\n") for s in sql[1:-1]
    )
    (OUT_DIR / "01_suppliers.sql").write_text(text, encoding="utf-8")

    # 6b. supplier_ratings
    rating_rows = [
        f"({sql_str(r['ka_number'])}, {sql_str(r['supplier'])}, {sql_str(r['delivery_area'])}, "
        f"{sql_str(r['af_region'])}, {sql_num(r['rating'])}, '{r['period']}', {sql_str(BETYG_FILE)})"
        for _, r in betyg.iterrows()
    ]
    stmts = chunked_insert(
        "insert into supplier_ratings (ka_number, supplier, delivery_area, af_region, rating, period, source_file) values",
        rating_rows,
    )
    text = "-- betygshistorik jan 2025–maj 2026 (NULL = 'Betyg saknas' i källfilen)\n" + "".join(
        s.replace(";\n", "\non conflict (ka_number, period) do nothing;\n") for s in stmts
    )
    (OUT_DIR / "02_supplier_ratings.sql").write_text(text, encoding="utf-8")

    # 6c. rom_results + staging per period (skip periods already in prod)
    parts = ["-- resultat-backfill. En raw_datasets-post per källfil; rader via CTE.\n"]
    for p in sorted(periods):
        if p in ALREADY_IN_PROD:
            continue
        df = periods[p]
        fname = src_file[p]
        val = lambda r: (
            f"({sql_str(r['supplier'])}, {sql_str(r['delivery_area'])}, {sql_str(r['ka_number'])}, "
            f"{sql_num(r['participants'])}, {sql_num(r['results'])}, {sql_num(r['rating'])}, "
            f"{sql_num(r['weighted_score'])}, {sql_num(r['result_rate'])}, "
            f"{sql_bool(r['risk_of_termination'])}, '{r['dataset_date']}')"
        )
        rows = [val(r) for _, r in df.iterrows()]
        for i in range(0, len(rows), 400):
            chunk = ",\n".join(rows[i:i + 400])
            parts.append(f"""
with ds as (
  insert into raw_datasets (dataset_source, file_path)
  values ('Arbetsförmedlingen', {sql_str(fname)})
  on conflict (file_path) do update set file_path = excluded.file_path
  returning dataset_id
), v (supplier, delivery_area, ka_number, participants, results, rating, weighted_score, result_rate, risk_of_termination, dataset_date) as (
  values
{chunk}
), st as (
  insert into staging_rom_results (dataset_id, supplier, delivery_area, ka_number, participants, results, rating, weighted_score, dataset_date)
  select ds.dataset_id, v.supplier, v.delivery_area, v.ka_number, v.participants, v.results, v.rating, v.weighted_score, v.dataset_date::date
  from ds, v
)
insert into rom_results (dataset_id, supplier, delivery_area, ka_number, participants, results, rating, weighted_score, result_rate, risk_of_termination, dataset_date)
select ds.dataset_id, v.supplier, v.delivery_area, v.ka_number, v.participants, v.results, v.rating, v.weighted_score, v.result_rate, v.risk_of_termination, v.dataset_date::date
from ds, v
on conflict (supplier, delivery_area, dataset_date) do nothing;
""")
    (OUT_DIR / "03_rom_results_backfill.sql").write_text("".join(parts), encoding="utf-8")

    # 6d. ka_number for the already-imported 2026-01 rows
    jan = periods["2026-01"]
    upd = [f"({sql_str(r['supplier'])}, {sql_str(r['delivery_area'])}, {sql_str(r['ka_number'])})"
           for _, r in jan.iterrows()]
    parts = ["-- fyll ka_number för redan importerade 2026-01-rader\n"]
    for i in range(0, len(upd), 400):
        chunk = ",\n".join(upd[i:i + 400])
        parts.append(f"""
update rom_results r
set ka_number = m.ka_number
from (values
{chunk}
) as m (supplier, delivery_area, ka_number)
where r.supplier = m.supplier and r.delivery_area = m.delivery_area
  and r.dataset_date = '2026-01-01' and r.ka_number is null;
""")
    (OUT_DIR / "04_update_jan2026_ka_number.sql").write_text("".join(parts), encoding="utf-8")

    # 6e. period_weights
    wrows = [f"('{period_to_date(p)}', {sql_num(w['A'])}, {sql_num(w['B'])}, {sql_num(w['C'])}, {sql_str(src_file[p])})"
             for p, w in sorted(weights.items())]
    text = ("-- A/B/C-vikter per period (Beräkningssnurra-flikarna) — grund för T5\n"
            "insert into period_weights (period, weight_a, weight_b, weight_c, source_file) values\n"
            + ",\n".join(wrows) + "\non conflict (period) do nothing;\n")
    (OUT_DIR / "05_period_weights.sql").write_text(text, encoding="utf-8")

    # 6f. name variants (if any conflicts found)
    if conflicts:
        vrows = []
        for ka, old, new, _ in sorted(set(conflicts)):
            vrows.append(f"insert into supplier_name_variants (variant, supplier_id) "
                         f"select {sql_str(old)}, id from suppliers where name = {sql_str(new)} "
                         f"on conflict (variant) do nothing;")
        (OUT_DIR / "06_name_variants.sql").write_text("\n".join(vrows) + "\n", encoding="utf-8")

    # ---- 7. Expected end-state (for post-import verification) ----
    total_new = sum(len(periods[p]) for p in periods if p not in ALREADY_IN_PROD)
    report += ["", "## Förväntat slutläge efter import (verifiera mot DB)"]
    report.append(f"- rom_results: 925 (befintliga) + {total_new} nya = {925 + total_new} rader")
    report.append(f"- supplier_ratings: {len(betyg)} rader")
    report.append(f"- suppliers: {len(canonical)} rader")
    report.append(f"- period_weights: {len(weights)} rader")
    report.append(f"- perioder i rom_results: {', '.join(sorted(set(periods)))}")

    (OUT_DIR / "backfill-report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))
    print(f"\nSQL genererad i {OUT_DIR}")


if __name__ == "__main__":
    main()
