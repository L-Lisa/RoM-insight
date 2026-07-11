#!/usr/bin/env python3
"""Radarn: tar en ögonblicksbild av AF:s sök leverantör-tjänst (leverantörsnivå).

Aggregerar per leverantör (af_leverantor_id): antal kontor + om nyval är öppet
någonstans. Skriver rådata till data/raw/radar/ och idempotent upsert-SQL till
data/generated_sql/ — SQL:en appliceras separat (supabase db push / MCP), i linje
med pipelinens regel att automatiken förbereder och en människa släpper.

Varsam mot AF: 0.4 s paus mellan anrop, ärlig User-Agent. Kör tidigast varje vecka.
Vid 5xx från AF: avbryt utan att skriva något (ingen partiell snapshot).
"""
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

BASE = ("https://arbetsformedlingen.se/rest/rusta-och-matcha-2/sokleverantor/v2/"
        "leverantorer?sida={page}&tjanstekoder=A015&radie=2000000"
        "&longitud=15.0&latitud=62.0&sortBy=RATING_DISTANCE")
UA = "RoM-Insight radarn (max en hamtning per vecka; kontakt: lisaojeland@gmail.com)"
ROOT = Path(__file__).parent.parent
RAW = ROOT / "data" / "raw" / "radar"
SQL = ROOT / "data" / "generated_sql"


def get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def main() -> None:
    try:
        first = get(BASE.format(page=1))
    except urllib.error.HTTPError as e:
        sys.exit(f"AF-API:t svarade {e.code} — ingen snapshot skriven. Försök igen senare.")
    total = first["total_count"]
    items = list(first["leverantorer"])
    page = 2
    while len(items) < total:
        time.sleep(0.4)
        batch = get(BASE.format(page=page))["leverantorer"]
        if not batch:
            break
        items.extend(batch)
        page += 1

    today = date.today().isoformat()
    RAW.mkdir(parents=True, exist_ok=True)
    (RAW / f"radar-raw-{today}.json").write_text(json.dumps(items, ensure_ascii=False, indent=1))

    # Aggregera per leverantör
    providers: dict[int, dict] = {}
    for it in items:
        p = providers.setdefault(it["id"], {"name": it["namn"].strip(), "offices": 0, "nyval": False})
        p["offices"] += len(it.get("adresser", []))
        p["nyval"] = p["nyval"] or bool(it.get("nyval_tillatet"))

    if len(providers) < 100:
        sys.exit(f"Bara {len(providers)} leverantörer — ser trasigt ut (förra kollen: ~780). Ingen SQL skriven.")

    SQL.mkdir(parents=True, exist_ok=True)
    out = SQL / f"radar_snapshot_{today.replace('-', '')}.sql"
    rows = ",\n".join(
        f"  ('{today}', {af_id}, {sql_str(p['name'])}, {p['offices']}, {str(p['nyval']).lower()})"
        for af_id, p in sorted(providers.items())
    )
    out.write_text(
        "-- Radarn-snapshot genererad av scripts/fetch_sokleverantor.py\n"
        "-- Idempotent: körs samma dag två gånger vinner senaste hämtningen.\n"
        "insert into sokleverantor_snapshots (snapshot_date, af_leverantor_id, supplier_name, offices_count, any_nyval)\nvalues\n"
        + rows
        + "\non conflict (snapshot_date, af_leverantor_id) do update\n"
        "  set supplier_name = excluded.supplier_name,\n"
        "      offices_count = excluded.offices_count,\n"
        "      any_nyval = excluded.any_nyval;\n\n"
        "-- Koppla supplier_id via kanoniskt namn + kända namnvarianter\n"
        f"update sokleverantor_snapshots sn set supplier_id = s.id\n"
        f"  from suppliers s where sn.snapshot_date = '{today}' and sn.supplier_id is null and lower(sn.supplier_name) = lower(s.name);\n"
        f"update sokleverantor_snapshots sn set supplier_id = v.supplier_id\n"
        f"  from supplier_name_variants v where sn.snapshot_date = '{today}' and sn.supplier_id is null and lower(sn.supplier_name) = lower(v.variant);\n"
    )
    print(f"KLART: {len(items)} poster -> {len(providers)} leverantörer, "
          f"{sum(p['offices'] for p in providers.values())} kontor\nSQL: {out}")


if __name__ == "__main__":
    main()
