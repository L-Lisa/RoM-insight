-- Radarn: ögonblicksbilder av AF:s sök-leverantör-tjänst (leverantörsnivå).
-- Rent additiv — rör ingen befintlig tabell. En rad per leverantör och kontrolldatum.
-- Applicerad i produktion 2026-07-11 via MCP apply_migration ("sokleverantor_snapshots");
-- denna fil speglar den för synkad migrationshistorik.
create table if not exists sokleverantor_snapshots (
  id bigint generated always as identity primary key,
  snapshot_date date not null,
  af_leverantor_id bigint not null,
  supplier_name text not null,
  supplier_id bigint references suppliers(id),
  offices_count integer not null,
  any_nyval boolean not null default false,
  source text not null default 'Arbetsförmedlingens sök leverantör-tjänst',
  created_at timestamptz not null default now(),
  unique (snapshot_date, af_leverantor_id)
);

alter table sokleverantor_snapshots enable row level security;

create policy "Public read access"
  on sokleverantor_snapshots for select
  using (true);

-- Baseline-snapshot 2026-07-03 seedad ur offices-tabellen (systerprojektets hämtning),
-- därefter supplier_id-koppling via kanoniskt namn + supplier_name_variants.
