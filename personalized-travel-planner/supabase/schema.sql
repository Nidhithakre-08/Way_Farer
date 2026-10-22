-- Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  budget numeric(12,2) not null default 0,
  currency text not null default 'INR',
  party_size integer not null default 1 check (party_size between 1 and 50),
  travel_style text not null default 'solo' check (travel_style in ('solo','couple','group')),
  interests text[] not null default '{}',
  preferences jsonb not null default '{}'::jsonb,
  share_code text unique default encode(gen_random_bytes(8), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.itineraries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips(id) on delete cascade,
  days jsonb not null default '[]'::jsonb,
  ai_provider text not null default 'demo',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional table for group preference collection.
create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invite_email text,
  role text not null default 'viewer' check (role in ('owner','editor','viewer')),
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.itineraries enable row level security;
alter table public.trip_members enable row level security;

create policy "Users can view own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Owners manage trips" on public.trips
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Owners manage itineraries" on public.itineraries
  for all to authenticated using (
    exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
  );

create policy "Members can view own memberships" on public.trip_members
  for select to authenticated using (user_id = auth.uid());
create policy "Trip owners manage members" on public.trip_members
  for all to authenticated using (
    exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
  );

create index if not exists trips_owner_created_idx on public.trips(owner_id, created_at desc);
create index if not exists itineraries_trip_idx on public.itineraries(trip_id);

-- Create a profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
