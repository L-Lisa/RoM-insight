# CLAUDE.md — ROM Insight

This file is the primary guide for AI agents working in this repository.
Read it fully before writing any code, creating files, or touching infrastructure.

---

## What this project is

ROM Insight is a public analytics dashboard for the Rusta och Matcha (RoM) market.
It visualizes supplier performance data published by Arbetsförmedlingen.

The dashboard is live and in production. Data accuracy is the highest priority.
Never invent, derive, or modify data values — all displayed values must come
directly from official Arbetsförmedlingen datasets.

Full product context: `docs/PRD.md`

---

## Repository structure

```
RoM-insight/
├── frontend/          # Next.js 14 app — the deployed dashboard
├── scripts/           # Python data ingestion pipeline — runs locally only
├── data/raw/          # Excel source files — local only, never committed
├── supabase/          # DB schema migrations
└── docs/              # Product, data, and architecture documentation
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts |
| Database | Supabase (PostgreSQL) with RLS enabled |
| Data pipeline | Python 3.11, pandas, supabase-py |
| Hosting | Vercel (frontend only) |
| Source control | GitHub — `L-Lisa/RoM-insight` |

---

## CRITICAL: Deployment architecture

**There is exactly ONE Vercel project for this repository.**

- Vercel project name: `frontend`
- Root directory in Vercel: `frontend/`
- Framework: Next.js

Do not create additional Vercel projects for this repository. There is no reason
to have more than one. If you are ever asked to set up Vercel for this project,
check first with `vercel project ls` — if a project already exists and is linked
to this repo, use it.

**The Python scripts in `scripts/` are NOT deployed anywhere.**
They run locally to ingest data into Supabase. Vercel cannot and should not run them.
Do not add Python build configurations, Procfiles, or serverless function wrappers
for the ingestion scripts.

---

## Branches

| Branch | Purpose |
|---|---|
| `master` | Production — Vercel deploys from this branch |
| `develop` | Active development — open PRs against master |

Always work on `develop`. Open a PR to `master` when ready to deploy.

---

## Development commands

**Frontend (Next.js):**
```bash
cd frontend
npm install
npm run dev       # localhost:3000
npm run build     # production build check — run this before every commit
```

**Python pipeline:**
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/ingest.py    # processes all files in data/raw/
```

**Environment variables:**
- Frontend: `frontend/.env.local` (see `.env.example` for structure)
- Pipeline: `.env` in project root (see `.env.example`)

Required variables:
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY        # pipeline only — never exposed to frontend
NEXT_PUBLIC_SUPABASE_URL         # frontend
NEXT_PUBLIC_SUPABASE_ANON_KEY    # frontend — read-only, safe to expose
```

---

## Adding a new dataset

1. Download the Excel file from Arbetsförmedlingen
2. Name it exactly: `rom_results_YYYY_MM.xlsx`
3. Place it in `data/raw/`
4. Run `python scripts/ingest.py`
5. The pipeline is idempotent — already-imported files are skipped by filename

The pipeline will stop and raise an error if the dataset schema has changed.
Do not attempt to work around schema errors — flag them for review first.

See `docs/DATA_BOOTSTRAP.md` for full procedure.

---

## Database tables

| Table | Purpose |
|---|---|
| `raw_datasets` | One row per imported file — audit trail |
| `staging_rom_results` | Parsed rows before QA — subset of prod schema |
| `rom_results` | Validated production data — what the dashboard reads |

`staging_rom_results` intentionally lacks `result_rate` and `risk_of_termination`.
These derived fields are only computed for data that has passed QA.
Do not use staging to reconstruct production data.

Full schema: `docs/DATA_SCHEMA.md`

---

## Data integrity rules — non-negotiable

These rules are enforced by `scripts/qa_validation.py` and must never be bypassed:

- `participants >= results`
- `rating` is 1–4 or null (never a string like `'-'`)
- `result_rate` is 0–1 or null
- `supplier` and `delivery_area` are never null
- `dataset_date` comes from the filename, not the Excel PERIOD column

If QA fails, the import stops. Fix the data or the parser — do not weaken the rules.

---

## What has been built (MVP — phases 1–3)

- Data ingestion pipeline: inspect → parse → QA → insert
- Market overview dashboard with KPI cards and supplier leaderboard
- Supplier list with search
- Supplier profile page with history table and trend chart
- Delivery area overview with per-area leaderboard
- RLS enabled on all Supabase tables

Phase 4 (advanced analytics) is next. See `docs/ROADMAP.md`.

---

## Things to avoid

- Do not create more than one Vercel project for this repo
- Do not commit anything in `data/raw/` — it is gitignored
- Do not commit `.env` or `.env.local` — they are gitignored
- Do not fetch all rows and filter in JavaScript — filter on `dataset_date` in the DB query
- Do not display data that has not passed QA validation
- Do not change `RESULT_COLUMNS` in `parse_dataset.py` to include RR2 — it would double-count placements
- Do not modify migration files that have already been applied to production — add new migrations instead

---

## Source of truth hierarchy

When documentation conflicts with code — fix the documentation first, then align the code.

1. `docs/PRD.md` — product decisions
2. `docs/DATA_CONTRACT.md` — data rules
3. `docs/DATA_SCHEMA.md` — database schema
4. `docs/DATA_PIPELINE.md` — pipeline flow
5. `CLAUDE.md` — architecture and operational rules (this file)
