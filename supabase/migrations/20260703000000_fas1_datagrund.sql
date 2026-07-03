-- Fas 1 datagrund: unikt index, suppliers, betygshistorik, periodvikter, ka_number.
-- ADDITIV MIGRATION — databasen delas med valjleverantor-projektet; inget får tas
-- bort eller byta namn. Endast nya tabeller/kolumner/index + en breddad constraint.

-- 1. Unikhetsspärr: dubbelimport blir tekniskt omöjlig (guardrails lager 1, punkt 2)
create unique index if not exists rom_results_supplier_area_date_uidx
  on rom_results (supplier, delivery_area, dataset_date);

-- 2. KA-nummer: AF:s unika identifierare per leverantör × leveransområde.
--    Finns i både betygs- och resultatfilerna — stabil nyckel när namn varierar.
alter table rom_results add column if not exists ka_number text;
alter table staging_rom_results add column if not exists ka_number text;

create unique index if not exists rom_results_ka_date_uidx
  on rom_results (ka_number, dataset_date)
  where ka_number is not null;

-- 3. risk_of_termination: AF publicerar kolumnen RISKERAR HÄVNING bara vissa
--    perioder (finns 2025-03/05 och 2026-01/03, saknas 2025-07/09/11 och 2026-05).
--    NULL = "AF publicerade inte kolumnen denna period" — false vore påhittad data.
alter table rom_results alter column risk_of_termination drop not null;
alter table rom_results alter column risk_of_termination drop default;

-- 4. suppliers: normaliserad leverantörstabell (profilsidor, slugs)
create table if not exists suppliers (
  id          bigserial primary key,
  name        text not null unique,
  slug        text not null unique,
  org_number  text,
  created_at  timestamptz not null default now()
);

-- Namnvarianter mellan AF-filer mappas hit ("Nordisk kompetens AB" vs stavningar)
create table if not exists supplier_name_variants (
  variant     text primary key,
  supplier_id bigint not null references suppliers(id)
);

-- 5. supplier_ratings: betygshistorik ur AF:s betygsfil (jan 2025–), varannan månad.
--    rating NULL = "Betyg saknas" i källfilen (under betygströskeln) — riktig data.
create table if not exists supplier_ratings (
  id            bigserial primary key,
  ka_number     text not null,
  supplier      text not null,
  delivery_area text not null,
  af_region     text,
  rating        numeric check (rating is null or (rating >= 1 and rating <= 4)),
  period        date not null,
  source_file   text not null,
  imported_at   timestamptz not null default now(),
  unique (ka_number, period)
);

create index if not exists supplier_ratings_supplier_idx on supplier_ratings (supplier);
create index if not exists supplier_ratings_period_idx on supplier_ratings (period);

-- 6. period_weights: A/B/C-vikterna ur Beräkningssnurra-fliken, per period.
--    Grunden för T5 "vad krävs?" — funktionen visas INTE för perioder utan vikter.
create table if not exists period_weights (
  period      date primary key,
  weight_a    numeric not null,
  weight_b    numeric not null,
  weight_c    numeric not null,
  source_file text not null,
  imported_at timestamptz not null default now()
);

-- RLS: samma modell som befintliga tabeller — publik läsning, skrivning via service role
alter table suppliers enable row level security;
alter table supplier_name_variants enable row level security;
alter table supplier_ratings enable row level security;
alter table period_weights enable row level security;

create policy "Public read access" on suppliers for select to anon, authenticated using (true);
create policy "Public read access" on supplier_name_variants for select to anon, authenticated using (true);
create policy "Public read access" on supplier_ratings for select to anon, authenticated using (true);
create policy "Public read access" on period_weights for select to anon, authenticated using (true);
