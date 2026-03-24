-- ROM Insight Database Schema
-- Source of truth: docs/DATA_SCHEMA.md

-- raw_datasets
-- Stores metadata for each imported Excel file
create table if not exists raw_datasets (
  dataset_id    uuid primary key default gen_random_uuid(),
  dataset_source text not null,
  file_path     text not null unique,
  imported_at   timestamptz not null default now()
);

-- staging_rom_results
-- Parsed rows written before QA validation passes.
-- Intentionally a subset of rom_results: no result_rate or risk_of_termination.
-- These derived fields are only computed for production-quality data.
-- staging is an audit trail — do not use it to reconstruct rom_results.
create table if not exists staging_rom_results (
  id            bigserial primary key,
  dataset_id    uuid not null references raw_datasets(dataset_id),
  supplier      text,
  delivery_area text,
  participants  numeric,
  results       numeric,
  rating        numeric,
  weighted_score numeric,
  dataset_date  date not null
);

-- rom_results
-- Validated production data
create table if not exists rom_results (
  id                  bigserial primary key,
  dataset_id          uuid not null references raw_datasets(dataset_id),
  supplier            text not null,
  delivery_area       text not null,
  participants        numeric not null,
  results             numeric not null,
  rating              numeric,
  weighted_score      numeric,
  result_rate         numeric,
  risk_of_termination boolean not null default false,
  dataset_date        date not null
);

-- Indexes for common query patterns
create index on rom_results (supplier);
create index on rom_results (delivery_area);
create index on rom_results (dataset_date);
create index on rom_results (supplier, dataset_date);
