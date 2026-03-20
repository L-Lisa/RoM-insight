-- Enable Row Level Security on all tables
alter table raw_datasets enable row level security;
alter table staging_rom_results enable row level security;
alter table rom_results enable row level security;

-- raw_datasets: public read-only (shows dataset metadata on dashboard)
create policy "Public read access"
  on raw_datasets for select
  to anon, authenticated
  using (true);

-- rom_results: public read-only (the dashboard data)
create policy "Public read access"
  on rom_results for select
  to anon, authenticated
  using (true);

-- staging_rom_results: no public access (internal pipeline only)
-- service_role bypasses RLS, so ingest scripts are unaffected
