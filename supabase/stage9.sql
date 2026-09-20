-- Tynysh: честный отсчёт суточного потолка у Plus.
-- Выполнить в Supabase → SQL Editor после stage8.sql. Запускать повторно безопасно.

-- Ошибка, которую это чинит.
-- Потолок Plus считался по ВСЕМ сообщениям за день, включая те, что человек
-- потратил из бесплатного пакета до оплаты. Самый обычный путь покупателя —
-- истратить пакет и сразу оформить Plus — упирался в стену в ту же минуту:
-- заплатил и получил «на сегодня хватит». Хуже момента для отказа не бывает.
-- Теперь сообщения, потраченные по подписке, считаются отдельно.

alter table dos_usage add column if not exists plus_count int not null default 0;

comment on column dos_usage.plus_count is
  'Сколько из сообщений этого дня потрачено уже по подписке. Суточный потолок Plus считается только по ним.';

drop function if exists public.dos_take_slot();
drop function if exists public.dos_status();

create or replace function public.dos_take_slot()
returns table (
  allowed boolean,
  plus_active boolean,
  used_total int,
  left_total int,
  free_total int,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  pack int := (select value from app_settings where key = 'dos_free_total');
  per_day int := (select value from app_settings where key = 'dos_free_daily');
  plus_day int := (select value from app_settings where key = 'dos_plus_daily');
  spent int;
  today_spent int;
  today_plus int;
  plus boolean;
  ok boolean;
  why text;
begin
  if me is null then raise exception 'Нужно войти'; end if;

  select coalesce(p.is_plus, false)
         and (p.plus_until is null or p.plus_until >= current_date)
    into plus
  from profiles p where p.id = me;

  select coalesce(sum(u.count), 0) into spent from dos_usage u where u.user_id = me;
  select coalesce(u.count, 0), coalesce(u.plus_count, 0)
    into today_spent, today_plus
    from dos_usage u where u.user_id = me and u.day = current_date;
  today_spent := coalesce(today_spent, 0);
  today_plus := coalesce(today_plus, 0);

  if plus then
    -- Потолок у подписчика: не «кончились деньги», а «на сегодня хватит».
    -- Считаем только сообщения по подписке: бесплатный пакет уже оплачен
    -- другим способом и отбирать за него сегодняшний день нечестно.
    if coalesce(plus_day, 0) > 0 and today_plus >= plus_day then
      ok := false;
      why := 'plus_daily';
    else
      ok := true;
      why := 'ok';
    end if;
  elsif spent < coalesce(pack, 0) then
    ok := true;                                   -- ещё идёт пакет на знакомство
    why := 'ok';
  else
    ok := coalesce(per_day, 0) > 0 and today_spent < per_day;  -- дежурный режим
    why := case when ok then 'ok' else 'pack_over' end;
  end if;

  if ok then
    insert into dos_usage (user_id, day, count, plus_count)
    values (me, current_date, 1, case when plus then 1 else 0 end)
    on conflict (user_id, day) do update
      set count = dos_usage.count + 1,
          plus_count = dos_usage.plus_count + case when plus then 1 else 0 end;
    spent := spent + 1;
  end if;

  return query select
    ok,
    plus,
    spent,
    greatest(coalesce(pack, 0) - spent, 0),
    coalesce(pack, 0),
    why;
end;
$$;

create or replace function public.dos_status()
returns table (
  plus_active boolean,
  used_total int,
  left_total int,
  free_total int,
  plus_left_today int
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
    (select value from app_settings where key = 'dos_free_total'),
    greatest(
      (select value from app_settings where key = 'dos_plus_daily')
      - coalesce((select u.plus_count from dos_usage u
                   where u.user_id = auth.uid() and u.day = current_date), 0),
      0
    )
  from profiles p
  where p.id = auth.uid();
$$;
