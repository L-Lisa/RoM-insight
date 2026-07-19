# Data Pipeline

dataset download

↓

dataset inspection

↓

raw dataset storage

↓

dataset parsing

↓

QA validation

↓

production table storage

↓

dashboard visualization
---

## Import gate (added 2026-07-16 — mandatory for the July 2026 release and onward)

Every new AF release must pass ALL of these before rows go live. The
cross-check session 2026-07-16 verified the current DB is bit-perfect
against AF's files — keep it that way. Run in order, abort on any failure:

1. **Fetch fresh + checksum**: download betyg + resultat files from AF's
   page (scripts/fetch_af.py), record md5 in the import log.
2. **Row counts**: parsed rows per period == DB insert count per period.
3. **Aggregate sums**: per period, file vs DB must match EXACTLY on
   sum(weighted_score), sum(participants), sum of each rr1_*/rr2_* column,
   count(rating) and sum(rating).
4. **Betyg cross-check**: the BETYG column in the resultat file must equal
   supplier_ratings for the same (ka_number, period) — two AF files, one
   truth. Any diff = AF revision or parser bug; investigate before import.
5. **Revision sweep**: re-check aggregates for ALL previous periods present
   in the new file — AF revises retroactively; latest revision wins
   (standing policy, Lisa 2026-07-03).
6. **RR separation**: never merge RR1 and RR2 into one column. results=RR1.
7. **Freeze the newsletter**: after data goes live, run
   `cd frontend && npx tsx scripts/freeze-issues.ts` and COMMIT the updated
   data/newsletter-issues.json. Published issues are immutable — rule changes
   never rewrite frozen issues; corrections go through the rättelselogg.
