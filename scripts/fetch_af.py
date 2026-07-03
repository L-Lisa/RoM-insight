"""
Auto-hämtning från AF:s leverantörssida (Fas 1, steg 7).

Kollar Arbetsförmedlingens Rusta och matcha-sida efter betygs- och
resultatfiler, laddar ner NYA filer till data/raw/source/ och rapporterar.
Ingen automatisk publicering (guardrails lager 2): skriptet förbereder,
en människa granskar och släpper.

Körs manuellt eller av den schemalagda bevakningen (28:e i udda månader).

Usage:
  python scripts/fetch_af.py
Exit codes: 0 = inget nytt, 2 = nya filer hämtade, 1 = fel (t.ex. sidformat ändrat)
"""

import hashlib
import re
import sys
import urllib.request
from pathlib import Path

AF_PAGE = "https://arbetsformedlingen.se/for-leverantorer/arbetsmarknadstjanster/rusta-och-matcha"
SOURCE_DIR = Path(__file__).parent.parent / "data" / "raw" / "source"
USER_AGENT = "rominsight-fetch/1.0 (statistiksajt; kontakt: hej@rominsight.se)"

# Filmönster vi bevakar. Ändrar AF namnskicket ska skriptet LARMA, inte gissa.
PATTERNS = {
    "betyg": re.compile(r'href="(/download/[^"]*betyg-rusta-och-matcha[^"]*\.xlsx)"'),
    "resultat": re.compile(r'href="(/download/[^"]*resultatuppfoljning[^"]*\.xlsx)"'),
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main() -> int:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        html = fetch(AF_PAGE).decode("utf-8", errors="replace")
    except Exception as e:
        print(f"FEL: kunde inte hämta AF-sidan: {e}")
        return 1

    new_files = []
    for kind, pattern in PATTERNS.items():
        links = pattern.findall(html)
        if not links:
            print(f"LARM: ingen {kind}-fil hittad på sidan — har AF ändrat sidan/namnskicket?")
            return 1
        for link in sorted(set(links)):
            url = f"https://arbetsformedlingen.se{link}"
            filename = link.rsplit("/", 1)[-1]
            dest = SOURCE_DIR / filename
            if dest.exists():
                print(f"Redan hämtad: {filename}")
                continue
            print(f"NY FIL ({kind}): {filename}")
            content = fetch(url)
            if not content.startswith(b"PK"):  # xlsx = zip
                print(f"FEL: {filename} är inte en xlsx-fil (fick {content[:40]!r})")
                return 1
            dest.write_bytes(content)
            sha = hashlib.sha256(content).hexdigest()[:16]
            print(f"  sparad ({len(content):,} byte, sha256 {sha}…)")
            new_files.append(filename)

    if new_files:
        print(f"\n{len(new_files)} nya filer. Nästa steg (manuellt, efter granskning):")
        print("  1. Uppdatera RESULT_FILES/BETYG_FILE i scripts/backfill.py med de nya filnamnen/perioderna")
        print("  2. python scripts/backfill.py  → granska backfill-report.md")
        print("  3. python scripts/diff_report.py  → granska diffen (Marknadsbrev-underlag)")
        print("  4. Applicera genererad SQL som migration (db push efter dry-run)")
        return 2

    print("Inget nytt på AF-sidan.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
