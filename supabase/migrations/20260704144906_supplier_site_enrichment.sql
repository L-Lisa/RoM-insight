-- Additiv migration (valjleverantor Fas B — berikning från leverantörernas hemsidor).
-- Lisas uttryckliga OK 2026-07-04 ("Kör, jag vill ha berikningen i delade databasen").
-- Evidensregler: endast claims med egen sida/tydlig sektion, käll-URL + datum per claim.
-- Applicerad i produktion 2026-07-04 via MCP apply_migration ("supplier_site_enrichment");
-- denna fil speglar den för synkad migrationshistorik (exporterad ur schema_migrations 2026-08-27).

create table if not exists supplier_websites (
  supplier_id bigint primary key references suppliers(id),
  url text not null,
  checked_at date not null,
  source text not null default 'verifierad via webbsökning mot företagsnamn'
);
alter table supplier_websites enable row level security;
drop policy if exists "Public read access" on supplier_websites;
create policy "Public read access" on supplier_websites
  for select to anon, authenticated using (true);

create table if not exists supplier_site_claims (
  id bigint generated always as identity primary key,
  supplier_id bigint not null references suppliers(id),
  category text not null check (category in ('sprak','insats','aktivitet','utbildning','jobb')),
  claim text not null,
  source_url text not null,
  evidence text not null check (evidence in ('egen_sida','sektion')),
  checked_at date not null,
  unique (supplier_id, category, claim)
);
create index if not exists ssc_supplier_idx on supplier_site_claims (supplier_id);
alter table supplier_site_claims enable row level security;
drop policy if exists "Public read access" on supplier_site_claims;
create policy "Public read access" on supplier_site_claims
  for select to anon, authenticated using (true);
