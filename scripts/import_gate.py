"""
Import gate (docs/DATA_PIPELINE.md, obligatorisk fr.o.m. juli 2026-releasen).

Läskontroller mot produktions-DB — gör ALDRIG några skrivningar.
Implementerar gate-stegen 2–5:
  2. Radantal: parsade rader per period == DB-antal per period
  3. Aggregatsummor: fil vs DB exakt lika på sum(weighted_score),
     sum(participants), varje rr1_*/rr2_*, count(rating), sum(rating)
  4. Betygskorskontroll: BETYG i resultatfilen == betygsfilen == supplier_ratings
     för samma (ka_number, period)
  5. Revisionssvep: alla tidigare perioder i den nya filen jämförs mot DB —
     AF reviderar retroaktivt; senaste revision vinner (policy Lisa 2026-07-03)

Usage:
  python scripts/import_gate.py          # före import: nya perioder får inte finnas i DB
  python scripts/import_gate.py --post   # efter import: nya perioder ska matcha filen exakt

Output: data/generated_sql/import-gate-report.md + stdout.
Exit codes: 0 = alla kontroller PASS, 1 = avvikelser funna (granska rapporten).
"""

import json
import sys
import urllib.request
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from backfill import (RESULT_FILES, BETYG_FILE, ALREADY_IN_PROD, SOURCE_DIR,
                      parse_result_sheet, parse_betyg, parse_weights, period_to_date)

ROOT = Path(__file__).parent.parent
OUT = ROOT / "data" / "generated_sql" / "import-gate-report.md"

# Kolumner som aggregatkontrolleras (steg 3). Exakt likhet krävs.
SUM_COLS = ["weighted_score", "participants",
            "rr1_a", "rr2_a", "rr1_b", "rr2_b", "rr1_c", "rr2_c"]
# Kolumner som jämförs rad-för-rad per KA i revisionssvepet (steg 5).
ROW_COLS = ["supplier", "delivery_area", "participants", "results", "rating",
            "weighted_score", "risk_of_termination",
            "participants_a", "participants_b", "participants_c",
            "rr1_a", "rr2_a", "rr1_b", "rr2_b", "rr1_c", "rr2_c"]


def load_env() -> dict:
    env = {}
    for line in (ROOT / ".env").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def db_fetch(env: dict, table: str, params: str) -> list:
    """Paginerad read-only hämtning via PostgREST."""
    rows, offset, page = [], 0, 1000
    while True:
        url = f"{env['SUPABASE_URL']}/rest/v1/{table}?{params}"
        req = urllib.request.Request(url, headers={
            "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
            "Authorization": f"Bearer {env['SUPABASE_SERVICE_ROLE_KEY']}",
            "Range": f"{offset}-{offset + page - 1}",
        })
        with urllib.request.urlopen(req, timeout=60) as r:
            batch = json.loads(r.read())
        rows.extend(batch)
        if len(batch) < page:
            return rows
        offset += page


def norm(v):
    """Normalisera för exakt jämförelse: None/NaN → None, tal → round(float, 6)."""
    if v is None:
        return None
    if isinstance(v, float) and pd.isna(v):
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return round(float(v), 6)
    return v


def agg(df: pd.DataFrame) -> dict:
    out = {}
    for c in SUM_COLS:
        out[f"sum({c})"] = round(float(pd.to_numeric(df[c], errors="coerce").sum()), 6)
    r = pd.to_numeric(df["rating"], errors="coerce")
    out["count(rating)"] = int(r.notna().sum())
    out["sum(rating)"] = round(float(r.sum()), 6)
    out["rows"] = len(df)
    return out


def main() -> int:
    post = "--post" in sys.argv
    env = load_env()
    rep = [f"# Import gate-rapport ({'post-import' if post else 'pre-import'})", ""]
    failures = []

    # ---- Parsa filen ----
    periods, weights = {}, {}
    for fname, plist in RESULT_FILES.items():
        xl = pd.ExcelFile(SOURCE_DIR / fname)
        for p in plist:
            periods[p] = parse_result_sheet(xl, p)
            weights[p] = parse_weights(xl, p)
    betyg = parse_betyg(SOURCE_DIR / BETYG_FILE)
    new_periods = sorted(set(periods) - ALREADY_IN_PROD)
    rep.append(f"Perioder i filen: {', '.join(sorted(periods))} · nya: {', '.join(new_periods) or '–'}")
    rep.append("")

    # ---- Hämta DB-data ----
    db_all = pd.DataFrame(db_fetch(env, "rom_results", "select=*&order=id"))
    db_ratings = pd.DataFrame(db_fetch(env, "supplier_ratings", "select=ka_number,period,rating&order=ka_number"))
    db_weights = pd.DataFrame(db_fetch(env, "period_weights", "select=*"))
    rep.append(f"DB: {len(db_all)} rom_results-rader, {len(db_ratings)} supplier_ratings, "
               f"{len(db_weights)} period_weights")
    rep.append("")

    # ---- Steg 2+3+5: radantal, aggregat, revisionssvep per period ----
    rep.append("## Steg 2+3+5 — radantal, aggregatsummor, revisionssvep (fil vs DB)")
    for p in sorted(periods):
        f = periods[p]
        d = db_all[db_all["dataset_date"] == str(period_to_date(p))]
        if d.empty:
            if p in new_periods and not post:
                rep.append(f"- {p}: finns inte i DB — ny period, OK att importera ({len(f)} rader väntar)")
            else:
                failures.append(f"{p}: saknas i DB")
                rep.append(f"- {p}: FAIL — saknas i DB men förväntades finnas")
            continue

        fa, da = agg(f), agg(d)
        diffs = {k: (fa[k], da[k]) for k in fa if fa[k] != da[k]}

        # Rad-för-rad per KA (fångar kvittande revisioner som aggregat missar)
        fi = f.set_index("ka_number").sort_index()
        di = d.set_index("ka_number").sort_index()
        ka_only_file = sorted(set(fi.index) - set(di.index))
        ka_only_db = sorted(set(di.index) - set(fi.index))
        common = sorted(set(fi.index) & set(di.index))
        row_diffs = {}
        for c in ROW_COLS:
            fv = fi.loc[common, c].map(norm)
            dv = di.loc[common, c].map(norm)
            n = int((fv.fillna("∅") != dv.fillna("∅")).sum())
            if n:
                row_diffs[c] = n

        if not diffs and not row_diffs and not ka_only_file and not ka_only_db:
            rep.append(f"- {p}: PASS — {len(f)} rader, alla aggregat och alla rader identiska")
        else:
            tag = "REVIDERAD av AF" if p in ALREADY_IN_PROD else "AVVIKELSE"
            failures.append(f"{p}: {tag}")
            rep.append(f"- {p}: {tag}")
            if diffs:
                for k, (a, b) in diffs.items():
                    rep.append(f"    - {k}: fil={a} vs DB={b}")
            if row_diffs:
                rep.append(f"    - rader med fältskillnader: {row_diffs}")
            if ka_only_file:
                rep.append(f"    - KA endast i filen: {ka_only_file}")
            if ka_only_db:
                rep.append(f"    - KA endast i DB: {ka_only_db}")
    rep.append("")

    # ---- Steg 4: betygskorskontroll ----
    rep.append("## Steg 4 — betygskorskontroll (resultatfil vs betygsfil vs supplier_ratings)")
    bmap = {(r["ka_number"], str(r["period"])): r["rating"]
            for _, r in betyg.iterrows()}
    for p in sorted(periods):
        pdate = str(period_to_date(p))
        f = periods[p]
        # KA som saknas i betygsfilen är OK OM resultatfilen inte heller har
        # betyg (AF utelämnar obetygsatta avtal ur betygsfilen — verifierat
        # 2026-08-26: samtliga saknade rader hade BETYG '-'). En MOTSÄGELSE
        # (betyg i ena källan, annat/inget i den andra) är däremot FAIL.
        unrated_absent, mismatch = 0, []
        for _, r in f.iterrows():
            key = (r["ka_number"], pdate)
            if key not in bmap:
                if norm(r["rating"]) is None:
                    unrated_absent += 1
                else:
                    mismatch.append((r["ka_number"], norm(r["rating"]), "saknas i betygsfil"))
            elif norm(r["rating"]) != norm(bmap[key]):
                mismatch.append((r["ka_number"], norm(r["rating"]), norm(bmap[key])))
        if not mismatch:
            rep.append(f"- {p}: PASS — inga motsägelser ({len(f)} rader, varav "
                       f"{unrated_absent} obetygsatta utan rad i betygsfilen)")
        else:
            failures.append(f"{p}: betygskorskontroll")
            rep.append(f"- {p}: FAIL — motsägelser (resultatfil vs betygsfil): {mismatch[:20]}")

    # Betygsfil vs DB (revisionssvep för betygen)
    if not db_ratings.empty:
        dmap = {(r["ka_number"], str(r["period"])): r["rating"] for _, r in db_ratings.iterrows()}
        revised, new_rows = [], 0
        for _, r in betyg.iterrows():
            key = (r["ka_number"], str(r["period"]))
            if key not in dmap:
                new_rows += 1
            elif norm(r["rating"]) != norm(dmap[key]):
                revised.append((key, norm(dmap[key]), norm(r["rating"])))
        rep.append(f"- betygsfil vs supplier_ratings i DB: {new_rows} nya rader, "
                   f"{len(revised)} reviderade betyg")
        if revised:
            failures.append("betyg reviderade i DB (granska — senaste revision vinner)")
            for key, old, new in revised[:20]:
                rep.append(f"    - {key}: DB={old} → fil={new}")
    rep.append("")

    # ---- Periodvikter ----
    rep.append("## Periodvikter (Beräkningssnurra vs DB)")
    dbw = {str(r["period"]): (norm(r["weight_a"]), norm(r["weight_b"]), norm(r["weight_c"]))
           for _, r in db_weights.iterrows()} if not db_weights.empty else {}
    for p in sorted(weights):
        pdate = str(period_to_date(p))
        w = (norm(weights[p]["A"]), norm(weights[p]["B"]), norm(weights[p]["C"]))
        if pdate not in dbw:
            rep.append(f"- {p}: {w} — ny i DB")
        elif dbw[pdate] != w:
            failures.append(f"{p}: periodvikter avviker")
            rep.append(f"- {p}: FAIL — fil={w} vs DB={dbw[pdate]}")
        else:
            rep.append(f"- {p}: PASS — {w}")
    rep.append("")

    # ---- Slutstatus ----
    if failures:
        rep.append(f"## RESULTAT: {len(failures)} avvikelser — granska innan release")
        for fl in failures:
            rep.append(f"- {fl}")
        code = 1
    else:
        rep.append("## RESULTAT: alla kontroller PASS")
        code = 0

    OUT.write_text("\n".join(rep) + "\n", encoding="utf-8")
    print("\n".join(rep))
    print(f"\nRapport: {OUT}")
    return code


if __name__ == "__main__":
    sys.exit(main())
