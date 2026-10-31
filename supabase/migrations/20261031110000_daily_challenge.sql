-- «Ежедневный вызов»: таблицы и правила доступа.
-- Supabase → SQL Editor → New query → вставить целиком → Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(trim(username)) between 2 and 20),
  created_at timestamptz not null default now()
);

create table if not exists public.results (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day int not null,                              -- номер дня по Москве: floor((unix_ms + 3ч) / сутки)
  moves int not null check (moves > 0),
  par int not null check (par > 0 and moves >= par),
  duration_ms int not null default 0 check (duration_ms >= 0),
  points int generated always as (round(100.0 * par / moves)::int) stored,
  created_at timestamptz not null default now(),
  primary key (user_id, day)                     -- один результат на человека в день
);
create index if not exists results_day_idx on public.results(day);

alter table public.profiles enable row level security;
alter table public.results enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.results to authenticated;

drop policy if exists "profiles: read" on public.profiles;
create policy "profiles: read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles: create own" on public.profiles;
create policy "profiles: create own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles: rename own" on public.profiles;
create policy "profiles: rename own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "results: read" on public.results;
create policy "results: read" on public.results for select to authenticated using (true);
-- Записать можно только свой результат и только за сегодня (или вчера — если решали в полночь).
-- Изменять и удалять результаты нельзя: первый финиш окончательный.
drop policy if exists "results: add own today" on public.results;
create policy "results: add own today" on public.results for insert to authenticated with check (
  auth.uid() = user_id
  and day between floor((extract(epoch from now()) + 10800) / 86400)::int - 1
              and floor((extract(epoch from now()) + 10800) / 86400)::int
);
