# Cursor System Prompt

This file defines how the Cursor AI agent must operate when working in this repository.

The goal is to ensure stable, production-ready development and prevent the AI from skipping steps or hallucinating system behavior.

---

# Core Development Principle

The source of truth for this project is:

1. PRD.md
2. DATA_SCHEMA.md
3. DATA_PIPELINE.md
4. DATA_CONTRACT.md

The AI must always consult these files before implementing code.

If documentation conflicts with code, documentation must be reviewed and corrected.

---

# Development Workflow

Cursor must follow this development order.

The dashboard must NOT be built before the data pipeline works.

Step 1  
Read all documentation files in /docs

Step 2  
Confirm understanding of the PRD

Step 3  
Create database schema

Step 4  
Implement dataset ingestion pipeline

Step 5  
Implement dataset inspector

Step 6  
Implement parser

Step 7  
Implement QA validation tests

Step 8  
Verify pipeline using sample datasets

Step 9  
Only after pipeline validation — build dashboard

---

# Documentation Awareness

Cursor must re-read documentation files whenever:

• a major feature is implemented  
• a schema change occurs  
• a parsing failure occurs  
• the context window may have lost earlier information

Important:

The AI should periodically re-read:

PRD.md  
DATA_SCHEMA.md  
DATA_PIPELINE.md  

to maintain correct context.

---

# Data Integrity Rules

The system must never invent data.

All values shown in the dashboard must originate from official Arbetsförmedlingen datasets.

The parser must verify that the dataset contains the expected columns:

supplier  
delivery_area  
participants  
results  
rating  
weighted_score  
risk_of_termination  

If columns differ, the pipeline must stop and log an error.

---

# Dataset Retention

Datasets must be stored for 18 months.

Each dataset import must store:

• original Excel file  
• dataset metadata  
• parsed records  

Raw datasets are stored in:

/data/raw/

Datasets must never overwrite previous imports.

---

# Error Handling

If any of the following occurs:

• dataset schema change  
• missing columns  
• invalid numeric values  
• results > participants  

the pipeline must stop.

The error must be logged and reported.

---

# Test Driven Development

Every major component must include tests.

Required test categories:

dataset schema tests  
parser validation tests  
data integrity tests  

Tests must run automatically when parsing a dataset.

---

# Code Standards

Code must be:

clean  
well-structured  
readable  
modular  

No quick fixes.

No silent failures.

All assumptions must be documented.

---

# Team Roles Awareness

The AI must simulate collaboration between roles.

Data Analyst  
validates dataset structure

Senior Developer  
ensures architecture quality

QA Engineer  
ensures correctness of displayed data

UX Designer  
ensures dashboard clarity

Product Owner  
ensures feature alignment with PRD

---

# Development Goal

The objective is to build a production-ready analytics platform.

The system must prioritize:

data accuracy  
pipeline stability  
maintainable architecture  

before visual interface.

---

# Mode Protocol

Before implementing code, Cursor must first:

confirm understanding of the task  
confirm which documentation file applies  
confirm pipeline step

Only then begin implementation.