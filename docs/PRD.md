# ROM Insight

A public analytics dashboard for the Rusta och Matcha market.

The system analyzes publicly published datasets from Arbetsförmedlingen and visualizes provider performance.

---

# Purpose

ROM Insight helps users understand:

• supplier performance  
• benchmarking vs competitors  
• historical trends  
• potential contract risk indicators  

The dashboard provides transparency in the RoM provider market.

---

# Target Users

Primary

• RoM providers  
• analysts  
• journalists  
• policymakers  

Secondary

• job seekers comparing providers

---

# Data Source

Official datasets published by Arbetsförmedlingen.

Datasets are released every two months as part of the official performance monitoring process.

The dataset contains information about:

• supplier  
• delivery area  
• result metric  
• rating  
• participants  
• results  
• potential risk of contract termination

These files are published publicly as Excel datasets.

---

# Dataset Retention Policy

The system stores datasets for **18 months**.

Expected dataset frequency:
6 datasets per year.

Maximum stored datasets:
9 datasets.

For each dataset the system stores:

• original Excel file  
• dataset metadata  
• parsed dataset records  

This allows historical analysis while limiting storage growth.

Raw datasets must be stored in:

/data/raw/

---

# Expected Dataset Columns

The parser must expect the following fields.

supplier  
delivery_area  
participants  
results  
rating  
weighted_score  
risk_of_termination  

If these columns change, the parser must stop and raise an error.

Dataset schema validation is mandatory.

---

# Core Metrics

Derived metric:

result_rate = results / participants

Additional metrics:

supplier ranking  
regional ranking  
trend analysis

---

# Supplier Trajectory

The system tracks supplier performance over time.

Trajectory visualization includes:

• rating trend  
• result rate trend  
• participants trend

This feature uses historical datasets (up to 18 months).

---

# MVP Scope

The first version includes:

Market overview dashboard

Sweden leaderboard

Leaderboard per delivery area

Supplier search

Supplier profile page

Trend visualization

Risk indicator

---

# Out of Scope

User accounts

Editing datasets

Predictive analytics

Participant-level data

---

# Risk Indicator

The dashboard displays a **risk indicator** based on the official program rules.

A provider may risk contract termination if:

• rating = 1 or missing rating  
• weighted result score < threshold  
• two consecutive measurement periods  

The indicator is informational only.

The system does not simulate official decisions.

---

# UX Principles

Clean interface  
Mobile first  
Data transparency  

Each dashboard must display:

Source: Arbetsförmedlingen  
Dataset date

---

# Team Roles

Data Analyst

Responsible for dataset verification, schema validation and analytical logic.

UX Designer

Responsible for dashboard layout and usability.

Senior Developer

Responsible for architecture and clean code standards.

QA Engineer

Responsible for data validation and automated testing.

Product Owner

Responsible for roadmap and prioritization.

---

# Product Name

ROM Insight