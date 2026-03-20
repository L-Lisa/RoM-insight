"""
Dataset inspector for ROM Insight.

Reads the Resultat sheet from an Arbetsförmedlingen Excel file
and verifies that all expected Swedish columns are present.
"""

import pandas as pd

from utils import find_result_sheet

EXPECTED_COLUMNS = [
    "PERIOD",
    "LEVERANSOMRÅDE",
    "LEVERANTÖRNAMN",
    "BETYG",
    "VIKTAT RESULTATMÅTT",
    "RISKERAR HÄVNING",
    "ANTAL DELTAGARE",
    "ANTAL RR1 NIVÅ A",
    "ANTAL RR2 NIVÅ A",
    "ANTAL RR1 NIVÅ B",
    "ANTAL RR2 NIVÅ B",
    "ANTAL RR1 NIVÅ C",
    "ANTAL RR2 NIVÅ C",
]


def inspect_dataset(file_path: str) -> bool:
    print(f"\nInspecting: {file_path}")

    sheet = find_result_sheet(file_path)
    print(f"Sheet: {sheet}")

    df = pd.read_excel(file_path, sheet_name=sheet)

    print(f"Row count: {len(df)}")
    print(f"Columns: {list(df.columns)}")

    missing = [col for col in EXPECTED_COLUMNS if col not in df.columns]
    if missing:
        raise Exception(f"Missing required columns: {missing}")

    print("\nMissing values:")
    print(df[EXPECTED_COLUMNS].isnull().sum())

    print("\nBETYG values:", df["BETYG"].unique())
    print("RISKERAR HÄVNING values:", df["RISKERAR HÄVNING"].unique())

    print("\nInspection passed.")
    return True


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python dataset_inspector.py <file_path>")
        sys.exit(1)
    inspect_dataset(sys.argv[1])
