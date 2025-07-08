-- Tabel users untuk aplikasi SICUTI
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null unique,
  password text not null,
  email text not null,
  role text not null,
  unit_kerja text not null,
  status text default 'active',
  last_login date,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

-- Index untuk pencarian cepat
create index if not exists idx_users_username on public.users(username);
create index if not exists idx_users_email on public.users(email); 