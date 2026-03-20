# Project Bootstrap

The system must be implemented in this order.

This prevents the dashboard from being built before the data pipeline works.

---

# Step 1

Create database schema in Supabase.

Tables defined in DATA_SCHEMA.md.

---

# Step 2

Run dataset inspector.

Purpose:

Verify dataset structure before parsing.

Script:

/scripts/dataset_inspector.py

---

# Step 3

Import historical datasets.

Minimum required:

3 historical datasets.

Maximum retained:

18 months of datasets.

---

# Step 4

Run dataset parser.

Script:

/scripts/parse_dataset.py

Parsed data is stored in staging tables.

---

# Step 5

Run QA validation tests.

Ensure:

participants >= results  
valid column names  
valid data types  

---

# Step 6

Move validated data to production tables.

---

# Step 7

Build dashboard.

Dashboard development must begin only after the data pipeline works.