-- «Ежедневный вызов» v2: сундуки, коллекция фигурок, витрина, оформление,
-- двойные очки по воскресеньям, скрытый топ дня до решения.
-- Запускать после setup.sql. Скрипт можно запускать повторно.

create or replace function public.today_msk() returns int
language sql stable as $$ select floor((extract(epoch from now()) + 10800) / 86400)::int $$;

-- ---------- results ----------
alter table public.results add column if not exists undos int not null default 0;
alter table public.results drop column if exists points;
alter table public.results add column points int generated always as (
  round(100.0 * par / moves)::int * (case when (day + 3) % 7 = 6 then 2 else 1 end)
) stored;

-- решил ли текущий игрок день d (в обход RLS, чтобы политика не ссылалась сама на себя)
create or replace function public.has_solved(d int) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.results where user_id = auth.uid() and day = d)
$$;

-- чужие результаты за сегодня видны только после собственного решения
drop policy if exists "results: read" on public.results;
create policy "results: read" on public.results for select to authenticated using (
  day < public.today_msk() or user_id = auth.uid() or public.has_solved(day)
);

revoke update, delete, truncate on public.results from anon, authenticated;
revoke insert on public.results from anon;
grant select, insert on public.results to authenticated;

-- сколько человек уже решили сегодня и лучший результат — без имён
create or replace function public.today_summary() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('solved', count(*), 'best', min(moves))
  from public.results where day = public.today_msk()
$$;

-- ---------- profiles: витрина и оформление ----------
alter table public.profiles add column if not exists showcase text[] not null default '{}';
alter table public.profiles add column if not exists cosmetics jsonb not null default '{}';
revoke update on public.profiles from anon, authenticated;
grant update (username, cosmetics) on public.profiles to authenticated;
revoke delete, truncate on public.profiles from anon, authenticated;

-- ---------- каталог фигурок ----------
create table if not exists public.items (
  id text primary key,
  series text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary'))
);
insert into public.items (id, series, rarity) values
  ('beetle','garage','common'),('pickup','garage','common'),('taxi','garage','rare'),('police','garage','rare'),('f1','garage','epic'),('limo','garage','legendary'),
  ('bolt','robots','common'),('nut','robots','common'),('vacuum','robots','rare'),('magnet','robots','rare'),('titan','robots','epic'),('chrome','robots','legendary'),
  ('cubo','dinos','common'),('stepo','dinos','common'),('horn','dinos','rare'),('deadend','dinos','rare'),('spiky','dinos','epic'),('dragon','dinos','legendary'),
  ('comet','space','common'),('rocket','space','common'),('rover','space','rare'),('ufo','space','rare'),('planet','space','epic'),('whale','space','legendary')
on conflict (id) do update set series = excluded.series, rarity = excluded.rarity;

create table if not exists public.inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.items(id),
  count int not null default 1,
  first_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.chests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('welcome', 'weekly')),
  period int not null,                    -- 0 для стартового, понедельник недели для недельного
  tier text not null,
  items text[] not null default '{}',
  opened_at timestamptz not null default now(),
  primary key (user_id, kind, period)
);

alter table public.items enable row level security;
alter table public.inventory enable row level security;
alter table public.chests enable row level security;
revoke insert, update, delete, truncate on public.items, public.inventory, public.chests from anon, authenticated;
grant select on public.items, public.inventory, public.chests to authenticated;

drop policy if exists "items: read" on public.items;
create policy "items: read" on public.items for select to authenticated using (true);
drop policy if exists "inventory: read" on public.inventory;
create policy "inventory: read" on public.inventory for select to authenticated using (true);
drop policy if exists "chests: read" on public.chests;
create policy "chests: read" on public.chests for select to authenticated using (true);

-- ---------- открыть сундук: проверка права, случайные фигурки на сервере ----------
create or replace function public.open_chest(p_kind text, p_period int) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  t int := public.today_msk();
  solved int; perfect int;
  v_tier text; n int; roll float8; rar text; it text; got text[] := '{}';
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from profiles where id = uid) then raise exception 'no profile'; end if;

  if p_kind = 'welcome' then
    if p_period <> 0 then raise exception 'bad period'; end if;
    if not exists (select 1 from results where user_id = uid) then raise exception 'not eligible'; end if;
    v_tier := 'welcome';
  elsif p_kind = 'weekly' then
    if (p_period + 3) % 7 <> 0 or p_period + 7 > t then raise exception 'bad period'; end if;
    select count(*), count(*) filter (where moves = par) into solved, perfect
      from results where user_id = uid and day between p_period and p_period + 6;
    if solved = 7 and perfect >= 3 then v_tier := 'legendary';
    elsif solved = 7 then v_tier := 'rare';
    elsif solved >= 5 then v_tier := 'common';
    else raise exception 'not eligible'; end if;
  else
    raise exception 'bad kind';
  end if;

  begin
    insert into chests (user_id, kind, period, tier) values (uid, p_kind, p_period, v_tier);
  exception when unique_violation then
    raise exception 'already opened';
  end;

  n := case v_tier when 'legendary' then 3 when 'rare' then 2 when 'welcome' then 2 else 1 end;
  for i in 1..n loop
    roll := random();
    rar := case v_tier
      when 'welcome' then
        case when i = 1 then (case when roll < .8 then 'rare' else 'epic' end)
             else (case when roll < .7 then 'common' else 'rare' end) end
      when 'common' then
        case when roll < .70 then 'common' when roll < .95 then 'rare' when roll < .995 then 'epic' else 'legendary' end
      when 'rare' then
        case when roll < .40 then 'common' when roll < .82 then 'rare' when roll < .97 then 'epic' else 'legendary' end
      else -- legendary chest: последний предмет минимум эпический
        case when i = n then (case when roll < .7 then 'epic' else 'legendary' end)
             else (case when roll < .5 then 'rare' when roll < .85 then 'epic' else 'legendary' end) end
    end;
    select id into it from items where rarity = rar order by random() limit 1;
    insert into inventory (user_id, item_id) values (uid, it)
      on conflict (user_id, item_id) do update set count = inventory.count + 1;
    got := got || it;
  end loop;

  update chests set items = got where user_id = uid and kind = p_kind and period = p_period;
  return jsonb_build_object('tier', v_tier, 'items', to_jsonb(got));
end $$;

-- ---------- витрина: до 5 фигурок, только свои ----------
create or replace function public.set_showcase(p_items text[]) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if coalesce(array_length(p_items, 1), 0) > 5 then raise exception 'too many'; end if;
  if exists (select 1 from unnest(p_items) x where not exists (select 1 from inventory where user_id = uid and item_id = x)) then
    raise exception 'not owned';
  end if;
  update profiles set showcase = p_items where id = uid;
end $$;

revoke execute on function public.open_chest(text, int), public.set_showcase(text[]), public.today_summary(), public.has_solved(int) from public, anon;
grant execute on function public.open_chest(text, int), public.set_showcase(text[]), public.today_summary(), public.has_solved(int), public.today_msk() to authenticated;
