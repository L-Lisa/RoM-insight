-- Additiv migration (valjleverantor-projektet, Lisas beslut 2026-07-03):
-- kontorsdata + kommun→leveransområde-mappning. Rör inget befintligt.

create extension if not exists http with schema extensions;

create table if not exists delivery_area_municipalities (
  kommun text primary key,
  delivery_area text not null,
  af_region text not null,
  source text not null default 'Arbetsförmedlingens leveransområdesdokument (Rusta och matcha 2)',
  imported_at timestamptz not null default now()
);
create index if not exists dam_delivery_area_idx on delivery_area_municipalities (delivery_area);
alter table delivery_area_municipalities enable row level security;
drop policy if exists "Public read access" on delivery_area_municipalities;
create policy "Public read access" on delivery_area_municipalities
  for select to anon, authenticated using (true);

create table if not exists offices (
  id bigint generated always as identity primary key,
  af_leverantor_id bigint not null,
  supplier_name text not null,
  supplier_id bigint references suppliers(id),
  adressid text not null,
  adressrad text,
  postnummer text,
  postort text,
  latitude double precision not null,
  longitude double precision not null,
  nyval_tillatet boolean,
  source text not null default 'Arbetsförmedlingens sök-leverantör-API',
  fetched_at timestamptz not null default now(),
  unique (af_leverantor_id, adressid)
);
create index if not exists offices_supplier_id_idx on offices (supplier_id);
alter table offices enable row level security;
drop policy if exists "Public read access" on offices;
create policy "Public read access" on offices
  for select to anon, authenticated using (true);
