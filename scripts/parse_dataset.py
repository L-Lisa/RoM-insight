"""
Dataset parser for ROM Insight.

Maps Swedish column names from Arbetsförmedlingen Excel files
to the English schema used in the database.

Column mapping:
  LEVERANTÖRNAMN              → supplier
  LEVERANSOMRÅDE              → delivery_area
  ANTAL DELTAGARE             → participants
  BETYG                       → rating  ('-' becomes None)
  VIKTAT RESULTATMÅTT         → weighted_score
  RISKERAR HÄVNING            → risk_of_termination ('Ja' → True)
  ANTAL RR1 NIVÅ A+B+C sum    → results (derived — RR1 only, not RR2)
  results / participants      → result_rate (derived)
  PERIOD column is ignored    — dataset_date comes from the filename (YYYY_MM)
"""

import pandas as pd
from datetime import date

from utils import find_result_sheet


COLUMN_MAP = {
    "LEVERANTÖRNAMN": "supplier",
    "LEVERANSOMRÅDE": "delivery_area",
    "ANTAL DELTAGARE": "participants",
    "BETYG": "rating",
    "VIKTAT RESULTATMÅTT": "weighted_score",
    "RISKERAR HÄVNING": "risk_of_termination",
    # PERIOD is required (validated in REQUIRED_COLUMNS) but not mapped —
    # dataset_date is set from the filename instead, which is more reliable.
}

# RR1 = first placement result per level.
# A participant can also achieve RR2 (90-day follow-up) for the same placement,
# so summing RR1+RR2 would double-count. RR1-only gives unique participants placed.
RESULT_COLUMNS = [
    "ANTAL RR1 NIVÅ A",
    "ANTAL RR1 NIVÅ B",
    "ANTAL RR1 NIVÅ C",
]

ALL_RR_COLUMNS = [
    "ANTAL RR1 NIVÅ A",
    "ANTAL RR2 NIVÅ A",
    "ANTAL RR1 NIVÅ B",
    "ANTAL RR2 NIVÅ B",
    "ANTAL RR1 NIVÅ C",
    "ANTAL RR2 NIVÅ C",
]

REQUIRED_COLUMNS = list(COLUMN_MAP.keys()) + ALL_RR_COLUMNS


def parse_dataset(file_path: str, dataset_date: date) -> pd.DataFrame:
    print(f"\nParsing: {file_path}")

    sheet = find_result_sheet(file_path)
    df = pd.read_excel(file_path, sheet_name=sheet)
    df.columns = df.columns.str.strip()

    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise Exception(f"Missing required columns: {missing}")

    # Derive total results: sum RR1 across all levels (A+B+C)
    # RR2 is excluded — it tracks 90-day follow-ups for the same placement and would double-count
    df["results"] = df[RESULT_COLUMNS].apply(pd.to_numeric, errors="coerce").sum(axis=1)

    # Rename Swedish columns to English
    df = df.rename(columns=COLUMN_MAP)

    # Normalize types
    df["participants"] = pd.to_numeric(df["participants"], errors="coerce")
    df["weighted_score"] = pd.to_numeric(df["weighted_score"], errors="coerce")

    # rating: '-' means missing
    df["rating"] = df["rating"].apply(lambda x: None if x == "-" else pd.to_numeric(x, errors="coerce"))

    # risk_of_termination: 'Ja' → True, 'Nej' → False
    df["risk_of_termination"] = df["risk_of_termination"].str.strip().str.lower() == "ja"

    # result_rate: results / participants (None if participants = 0)
    df["result_rate"] = df.apply(
        lambda row: row["results"] / row["participants"]
        if pd.notna(row["participants"]) and row["participants"] > 0
        else None,
        axis=1,
    )

    df["dataset_date"] = dataset_date

    output_columns = [
        "supplier",
        "delivery_area",
        "participants",
        "results",
        "rating",
        "weighted_score",
        "result_rate",
        "risk_of_termination",
        "dataset_date",
    ]

    print(f"Parsed {len(df)} rows.")
    return df[output_columns]


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python parse_dataset.py <file_path> <YYYY-MM-DD>")
        sys.exit(1)
    from datetime import date
    d = date.fromisoformat(sys.argv[2])
    result = parse_dataset(sys.argv[1], d)
    print(result.head())
