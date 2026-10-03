-- Tynysh: бесплатный пакет — только 20 сообщений навсегда, без суточной добавки.
-- Выполнить в Supabase → SQL Editor после stage9.sql. Запускать повторно безопасно.

-- Настройка dos_free_daily («сколько давать в день, когда пакет кончился»)
-- стояла в нуле и всё равно висела в таблице, путая при настройке. Правило
-- теперь одно и простое: 20 сообщений на знакомство, дальше Plus. Убираем
-- и строку, и ветку в коде, чтобы нечего было случайно включить.

update app_settings set value = 20,
       note = 'Сколько сообщений Досу даётся бесплатно ВСЕГО, не в сутки'
 where key = 'dos_free_total';

delete from app_settings where key = 'dos_free_daily';

drop function if exists public.dos_take_slot();

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
  plus_day int := (select value from app_settings where key = 'dos_plus_daily');
  spent int;
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
  select coalesce(u.plus_count, 0) into today_plus
    from dos_usage u where u.user_id = me and u.day = current_date;
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
  else
    -- Пакет на знакомство — один на всю жизнь аккаунта, не возобновляется.
    ok := spent < coalesce(pack, 0);
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
