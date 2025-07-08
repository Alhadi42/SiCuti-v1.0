-- Tabel hari libur nasional
create table if not exists national_holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null,
  year int generated always as (extract(year from date)) stored,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index untuk pencarian per tahun
create index if not exists idx_national_holidays_year on national_holidays(year);
-- Unik per tanggal
create unique index if not exists idx_national_holidays_date on national_holidays(date); 