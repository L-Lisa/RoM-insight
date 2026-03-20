# Data Bootstrap

This document defines how the ROM Insight system obtains the first datasets required to initialize the database.

The ROM Insight platform relies on official datasets published by Arbetsförmedlingen.

These datasets are used to analyze supplier performance within the Rusta och Matcha program.

---

# Data Source

Official source:

https://arbetsformedlingen.se/for-leverantorer/arbetsmarknadstjanster/rusta-och-matcha

Dataset name:

Resultatuppföljning Rusta och matcha

The dataset contains information about:

supplier  
delivery_area  
participants  
results  
rating  
weighted_score  
risk_of_termination  

The dataset is published approximately every two months.

---

# Bootstrap Requirement

The ingestion pipeline requires a minimum of **three historical datasets** to initialize the system.

This enables the system to calculate:

trend metrics  
supplier trajectory  
historical comparisons  

---

# Bootstrap Procedure

Step 1

Download the latest dataset from the official source.

Step 2

Download two earlier datasets if available.

Step 3

Place the files in the repository folder:

/data/raw/

Example structure:

/data/raw/
rom_results_2026_01.xlsx  
rom_results_2025_11.xlsx  
rom_results_2025_09.xlsx  

---

# File Naming Convention

Datasets must follow the naming pattern:

rom_results_YYYY_MM.xlsx

Example:

rom_results_2026_01.xlsx  
rom_results_2025_11.xlsx  
rom_results_2025_09.xlsx  

The dataset date will be extracted from the filename.

---

# Pipeline Behavior

The ingestion system must automatically process all files located in:

/data/raw/

Processing order:

1 scan directory
2 inspect dataset
3 validate schema
4 store raw dataset
5 parse dataset
6 validate parsed records
7 insert records into database

Each dataset must be imported separately.

---

# Dataset Storage

Each dataset import must store:

original Excel file  
dataset metadata  
parsed records  

Raw files must be preserved for auditing and debugging.

Storage location:

/data/raw/

---

# Dataset Retention Policy

ROM Insight stores datasets for **18 months**.

Expected dataset frequency:

6 datasets per year.

Maximum stored datasets:

9 datasets.

Datasets older than 18 months should be archived or removed.

---

# Schema Validation

The dataset inspector must verify that the following columns exist:

supplier  
delivery_area  
participants  
results  
rating  
weighted_score  
risk_of_termination  

If any required column is missing, the ingestion pipeline must stop.

The error must be logged.

The Data Analyst must review the dataset.

---

# Data Integrity Rules

The ingestion system must validate:

participants >= results

rating between 1 and 4

result_rate between 0 and 1

Any violations must stop the import process.

---

# Error Handling

If a dataset structure changes:

1 the pipeline must stop
2 an error must be logged
3 the dataset must be flagged for review

No automatic corrections should be applied.

---

# Manual Bootstrap vs Automatic Download

Initial datasets should be downloaded manually and placed in /data/raw/.

Automatic dataset download can be implemented later using a scheduled job.

This reduces complexity during the initial development phase.

---

# Integration With Pipeline Scripts

Scripts used during bootstrap:

dataset_inspector.py  
parse_dataset.py  

The inspector verifies dataset structure.

The parser transforms the dataset into database records.

---

# Expected Outcome

After bootstrap:

the database contains at least three historical datasets

trend analysis becomes possible

supplier trajectory can be calculated

the dashboard can be built using verified data.¨