# Data Contract

The system must only display verified data from Arbetsförmedlingen datasets.

No data may be invented.

All values shown in the dashboard must originate from official datasets.

---

# Schema Change Handling

If a dataset contains unknown columns or missing expected columns:

The ingestion pipeline must stop.

The system must log an error.

The Data Analyst must review the dataset before ingestion continues.