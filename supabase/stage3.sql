-- Tynysh, этап 3 (Дос). Выполнить в Supabase → SQL Editor целиком, после stage2b.sql.
-- Запускать повторно безопасно.

-- =====================================================================
-- 1. Настройки, которые можно менять без пересборки сайта
-- =====================================================================
create table if not exists app_settings (
  key text primary key,
  value int not null,
  note text
);

insert into app_settings (key, value, note) values
  ('dos_free_total', 20, 'Сколько сообщений Досу даётся бесплатно ОДИН раз на знакомство'),
  ('dos_free_daily', 0,  'Сколько сообщений в день сверх пакета (0 — не давать)')
on conflict (key) do nothing;

alter table app_settings enable row level security;
drop policy if exists "settings read" on app_settings;
create policy "settings read" on app_settings for select using (true);
-- Политики на запись нет: менять цифры можно только из панели Supabase.

-- =====================================================================
-- 2. Дыры в правах, которые нельзя оставлять вместе с платной подпиской
-- =====================================================================
-- Раньше человек мог из браузера сам себе включить is_plus или is_admin:
-- правило «profiles update own» разрешало менять ЛЮБОЕ поле своей строки.
-- Права на отдельные колонки сильнее правил RLS, поэтому режем их здесь.
revoke update on profiles from authenticated, anon;
grant update (name, bio, handle, last_seen) on profiles to authenticated;

-- Счётчик сообщений Досу человек тоже мог обнулить сам. Теперь его меняет
-- только функция ниже, а пользователю остаётся чтение.
revoke insert, update, delete on dos_usage from authenticated, anon;

-- =====================================================================
-- 3. Выдача «талона» на сообщение Досу
-- =====================================================================
-- Одна функция на все проверки: активен ли Plus, не кончился ли пакет,
-- и сразу же отметка о расходе — чтобы нельзя было проскочить дважды.
create or replace function public.dos_take_slot()
returns table (
  allowed boolean,
  plus_active boolean,
  used_total int,
  left_total int,
  free_total int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  pack int := (select value from app_settings where key = 'dos_free_total');
  per_day int := (select value from app_settings where key = 'dos_free_daily');
  spent int;
  today_spent int;
  plus boolean;
  ok boolean;
begin
  if me is null then raise exception 'Нужно войти'; end if;

  select coalesce(p.is_plus, false)
         and (p.plus_until is null or p.plus_until >= current_date)
    into plus
  from profiles p where p.id = me;

  select coalesce(sum(u.count), 0) into spent from dos_usage u where u.user_id = me;
  select coalesce(u.count, 0) into today_spent
    from dos_usage u where u.user_id = me and u.day = current_date;
  today_spent := coalesce(today_spent, 0);

  if plus then
    ok := true;
  elsif spent < coalesce(pack, 0) then
    ok := true;                                   -- ещё идёт пакет на знакомство
  else
    ok := coalesce(per_day, 0) > 0 and today_spent < per_day;  -- дежурный режим
  end if;

  if ok then
    insert into dos_usage (user_id, day, count)
    values (me, current_date, 1)
    on conflict (user_id, day) do update set count = dos_usage.count + 1;
    spent := spent + 1;
  end if;

  return query select
    ok,
    plus,
    spent,
    greatest(coalesce(pack, 0) - spent, 0),
    coalesce(pack, 0);
end;
$$;

-- То же самое, но ничего не тратит — чтобы показать «осталось N» при открытии.
create or replace function public.dos_status()
returns table (
  plus_active boolean,
  used_total int,
  left_total int,
  free_total int
)
language sql
security definer
stable
set search_path = public
as $$
  select
    coalesce(p.is_plus, false) and (p.plus_until is null or p.plus_until >= current_date),
    coalesce((select sum(u.count)::int from dos_usage u where u.user_id = auth.uid()), 0),
    greatest(
      (select value from app_settings where key = 'dos_free_total')
      - coalesce((select sum(u.count)::int from dos_usage u where u.user_id = auth.uid()), 0),
      0
    ),
    (select value from app_settings where key = 'dos_free_total')
  from profiles p
  where p.id = auth.uid();
$$;
