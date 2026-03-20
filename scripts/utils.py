"""
Shared utilities for ROM Insight ingestion scripts.
"""

import pandas as pd


def find_result_sheet(xlsx_path: str) -> str:
    """Return the name of the 'Resultat YYYY-MM' sheet in an AF Excel file."""
    sheet_names = pd.ExcelFile(xlsx_path).sheet_names
    for name in sheet_names:
        if name.startswith("Resultat"):
            return name
    raise Exception(f"No 'Resultat' sheet found. Sheets: {sheet_names}")
