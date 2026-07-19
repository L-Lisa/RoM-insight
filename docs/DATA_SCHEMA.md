# Database Schema

## raw_datasets

dataset_id  
dataset_source  
file_path  
imported_at  

---

## staging_rom_results

supplier  
delivery_area  
participants  
results  
rating  
weighted_score  
dataset_date  

---

## rom_results

supplier  
delivery_area  
participants  
results  
rating  
weighted_score  
result_rate  
dataset_date  
risk_of_termination

---

## Added 2026-07-03 (Fas 1 datagrund — migration 20260703000000)

Shared-database rule: this Supabase project is also consumed by the
valjleverantor project. Migrations must be ADDITIVE ONLY — never drop or
rename anything existing.

### Changes to existing tables

rom_results.ka_number         — AF's unique contract id (leverantör × leveransområde), stable across name changes
staging_rom_results.ka_number — same
rom_results.risk_of_termination is now NULLABLE — AF publishes the
  RISKERAR HÄVNING column only some periods (present 2025-03/05, 2026-01/03;
  absent 2025-07/09/11, 2026-05). NULL = "not published that period".
  Never coerce to false.
Unique indexes: (supplier, delivery_area, dataset_date) and
  (ka_number, dataset_date) where ka_number is not null — double imports
  are now technically impossible.

### suppliers

id, name (unique), slug (unique), org_number, created_at

### supplier_name_variants

variant (pk) → supplier_id
KA numbers change owner/name over time (verified: Lernia → HelloLilly 2026-03,
Jobfind → AKG 2025-07, NearYou → Re:shift 2025-07, m.fl.). Each period keeps
the name it had then; this table maps variants for trend continuity per KA.

### supplier_ratings

ka_number, supplier, delivery_area, af_region, rating (1–4 or NULL), period,
source_file, imported_at. Unique (ka_number, period).
Source: AF's betygsfil (wide → long). rating NULL = "Betyg saknas" in the
source — real data (below rating threshold), never an error.

### period_weights

period (pk), weight_a, weight_b, weight_c, source_file
A/B/C weights read from the Beräkningssnurra sheet per period. Basis for the
T5 "vad krävs?" feature — the feature is HIDDEN for periods without weights.

### Revision rule (important)

AF revises past periods retroactively in later releases (late-approved
resultatersättningar). Verified: 2025-09 differs between the September and
November releases on ~400 of 905 rows. Backfill policy: latest available
revision per period wins. The DB's 2026-01 rows still hold the January
release values (maj release revised sum results 22219 → 22212) — open
decision: update to latest revision or keep as-first-published.

---

## Added 2026-07-16 (column semantics + verification, cross-check session)

### rom_results.results = RR1 ONLY (verified on all 2,481 rows, 2026 periods)

`results` is the count of FIRST approved results (RR1 = deltagaren fick
arbete eller började studera). It does NOT include RR2 (godkänd
uppföljningsredovisning). RR1 and RR2 are ALWAYS kept separate — per-level
detail lives in rr1_a/rr2_a/rr1_b/rr2_b/rr1_c/rr2_c. Never sum RR1+RR2 into
one "results" number in UI or pipeline (double-counts placements; see
CLAUDE.md rule on RESULT_COLUMNS).

### Ranking rule (product decision, Lisa 2026-07-16)

Contracts WITHOUT betyg (rating IS NULL) are never included in viktat
resultat rankings: top/bottom lists, movers, percentiles, area averages,
constellation start view. Below AF's rating threshold (18 participants,
12 months) the measure is statistical noise (May 2026: best unrated
contract showed 1.15 on 2 participants). They remain fully visible in
tables — just unranked. Frontend enforces this; there is no DB flag.

### Revision decision CLOSED (supersedes note above)

2026-01 rows were updated to the May-release revision on Lisa's order
(2026-07-03): "hela historiken följer samma regel — senaste revision
vinner". Verified 2026-07-16: DB matches the May file exactly
(results sum 22,212), and all 2025 periods match the November 2025 file.

### Known structural debt (flagged 2026-07-16, not yet actioned)

- staging_rom_results: stale duplicate from the old pipeline (7,084 rows,
  frozen). Candidate for retirement — requires checking valjleverantor
  does not read it (shared DB) + Lisa's explicit OK (destructive).
- raw_datasets lineage: 3 rows but 8 periods live — dataset_id no longer
  identifies source file for backfilled rows. supplier_ratings.source_file
  does this right; rom_results lacks an equivalent (additive fix possible).
