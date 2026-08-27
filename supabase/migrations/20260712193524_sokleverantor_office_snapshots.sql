-- Radarn på kontorsnivå: en rad per kontor och kontrolldatum.
-- Rent additiv — rör ingen befintlig tabell. Kompletterar sokleverantor_snapshots
-- (leverantörsnivå) så att kontor som försvinner ett och ett blir synliga,
-- inte bara leverantörer som försvinner helt.
create table if not exists sokleverantor_office_snapshots (
  snapshot_date date not null,
  af_leverantor_id text not null,
  supplier_name text not null,
  postort text not null,
  address text not null default '',
  lat double precision,
  lng double precision,
  nyval boolean,
  primary key (snapshot_date, af_leverantor_id, postort, address)
);

alter table sokleverantor_office_snapshots enable row level security;

create policy "Public read access"
  on sokleverantor_office_snapshots for select
  using (true);

-- Applicerad i produktion 2026-07-12 via MCP apply_migration
-- ("sokleverantor_office_snapshots"); denna fil speglar den för synkad historik.
-- Baseline-snapshot 2026-07-03 backfillad ur offices-tabellen (samma API-hämtning).
