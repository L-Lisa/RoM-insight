"""
QA validation for ROM Insight.

Runs data integrity checks on a parsed DataFrame before
it is inserted into the production database.

Rules (from docs/TEST_SPEC.md and docs/DATA_BOOTSTRAP.md):
  - participants >= results
  - rating between 1 and 4 (or None/NaN for missing)
  - result_rate between 0 and 1
  - No null supplier or delivery_area
  - No null participants
"""

import pandas as pd
from dataclasses import dataclass, field
from typing import List


@dataclass
class QAResult:
    passed: bool
    errors: List[str] = field(default_factory=list)

    def __str__(self):
        if self.passed:
            return "QA passed."
        return "QA FAILED:\n" + "\n".join(f"  - {e}" for e in self.errors)


def validate(df: pd.DataFrame) -> QAResult:
    errors = []

    # participants >= results
    invalid = df[df["participants"] < df["results"]]
    if not invalid.empty:
        errors.append(
            f"{len(invalid)} rows where results > participants: "
            + str(invalid[["supplier", "delivery_area", "participants", "results"]].to_dict("records"))
        )

    # rating must be 1–4 or null
    rated = df["rating"].dropna()
    invalid_rating = rated[(rated < 1) | (rated > 4)]
    if not invalid_rating.empty:
        errors.append(f"{len(invalid_rating)} rows with rating outside 1–4: {invalid_rating.tolist()}")

    # result_rate must be 0–1 or null
    rr = df["result_rate"].dropna()
    invalid_rr = rr[(rr < 0) | (rr > 1)]
    if not invalid_rr.empty:
        errors.append(f"{len(invalid_rr)} rows with result_rate outside 0–1: {invalid_rr.tolist()}")

    # No null supplier or delivery_area
    for col in ["supplier", "delivery_area"]:
        nulls = df[col].isnull().sum()
        if nulls > 0:
            errors.append(f"{nulls} null values in required column '{col}'")

    # No null participants
    null_participants = df["participants"].isnull().sum()
    if null_participants > 0:
        errors.append(f"{null_participants} null values in 'participants'")

    return QAResult(passed=len(errors) == 0, errors=errors)
