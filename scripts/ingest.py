"""
ROM Insight ingestion pipeline.

Processes all Excel files in /data/raw/ through the full pipeline:
  1. Scan directory for .xlsx files
  2. Inspect dataset structure
  3. Parse and map columns
  4. Run QA validation
  5. Insert into Supabase (raw_datasets → staging_rom_results → rom_results)

Usage:
  python scripts/ingest.py

Requires .env in project root with:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
"""

import math
import os
import re
import sys
from datetime import date
from pathlib import Path

import pandas as pd
from supabase import create_client

# Load .env from project root
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from dataset_inspector import inspect_dataset
from parse_dataset import parse_dataset
from qa_validation import validate


def clean(val):
    """Replace NaN/Inf floats with None for JSON-safe DB insertion."""
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return None
    return val


SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
RAW_DIR = Path(__file__).parent.parent / "data" / "raw"
FILENAME_PATTERN = re.compile(r"rom_results_(\d{4})_(\d{2})\.xlsx")


def parse_date_from_filename(filename: str) -> date:
    m = FILENAME_PATTERN.match(filename)
    if not m:
        raise Exception(f"Filename does not match expected pattern rom_results_YYYY_MM.xlsx: {filename}")
    return date(int(m.group(1)), int(m.group(2)), 1)


def already_imported(supabase, file_path: str) -> bool:
    result = supabase.table("raw_datasets").select("dataset_id").eq("file_path", file_path).execute()
    return len(result.data) > 0


def ingest_file(supabase, xlsx_path: Path) -> None:
    filename = xlsx_path.name
    file_path_str = str(xlsx_path)

    print(f"\n{'='*60}")
    print(f"Processing: {filename}")

    if already_imported(supabase, file_path_str):
        print("Already imported — skipping.")
        return

    dataset_date = parse_date_from_filename(filename)

    # Step 1: Inspect
    inspect_dataset(str(xlsx_path))

    # Step 2: Parse
    df = parse_dataset(str(xlsx_path), dataset_date)

    # Step 3: QA
    qa = validate(df)
    print(qa)
    if not qa.passed:
        raise Exception(f"QA failed for {filename}. Import stopped.")

    # Step 4: Insert raw_datasets record
    raw_record = {
        "dataset_source": "Arbetsförmedlingen",
        "file_path": file_path_str,
    }
    raw_result = supabase.table("raw_datasets").insert(raw_record).execute()
    dataset_id = raw_result.data[0]["dataset_id"]
    print(f"Registered dataset: {dataset_id}")

    # Step 5: Insert into staging_rom_results
    staging_rows = df.copy()
    staging_rows["dataset_id"] = dataset_id
    staging_rows["dataset_date"] = staging_rows["dataset_date"].astype(str)

    staging_cols = ["dataset_id", "supplier", "delivery_area", "participants",
                    "results", "rating", "weighted_score", "dataset_date"]
    staging_data = [
        {k: clean(v) for k, v in row.items()}
        for row in staging_rows[staging_cols].to_dict("records")
    ]

    # Insert in batches of 500
    for i in range(0, len(staging_data), 500):
        supabase.table("staging_rom_results").insert(staging_data[i:i+500]).execute()
    print(f"Inserted {len(staging_data)} rows into staging_rom_results.")

    # Step 6: Insert into rom_results (production)
    prod_rows = df.copy()
    prod_rows["dataset_id"] = dataset_id
    prod_rows["dataset_date"] = prod_rows["dataset_date"].astype(str)
    prod_rows["risk_of_termination"] = prod_rows["risk_of_termination"].astype(bool)

    prod_cols = ["dataset_id", "supplier", "delivery_area", "participants", "results",
                 "rating", "weighted_score", "result_rate", "risk_of_termination", "dataset_date"]
    prod_data = [
        {k: clean(v) for k, v in row.items()}
        for row in prod_rows[prod_cols].to_dict("records")
    ]

    for i in range(0, len(prod_data), 500):
        supabase.table("rom_results").insert(prod_data[i:i+500]).execute()
    print(f"Inserted {len(prod_data)} rows into rom_results.")

    print(f"Done: {filename}")


def run():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    xlsx_files = sorted(RAW_DIR.glob("rom_results_*.xlsx"))
    if not xlsx_files:
        print(f"No files found in {RAW_DIR}")
        sys.exit(1)

    print(f"Found {len(xlsx_files)} file(s) to process.")

    errors = []
    for xlsx_path in xlsx_files:
        try:
            ingest_file(supabase, xlsx_path)
        except Exception as e:
            print(f"\nERROR processing {xlsx_path.name}: {e}")
            errors.append((xlsx_path.name, str(e)))

    print(f"\n{'='*60}")
    if errors:
        print(f"Pipeline completed with {len(errors)} error(s):")
        for fname, err in errors:
            print(f"  {fname}: {err}")
        sys.exit(1)
    else:
        print("All files ingested successfully.")


if __name__ == "__main__":
    run()
