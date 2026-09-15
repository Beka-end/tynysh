-- Tynysh, этап 4 (оплата, админка, жалобы). Выполнить в Supabase → SQL Editor,
-- после stage3.sql. Запускать повторно безопасно.

-- =====================================================================
-- 1. Настройки-строки: ссылка Kaspi и контакт поддержки
-- =====================================================================
create table if not exists app_texts (
  key text primary key,
  value text not null default '',
  note text
);

insert into app_texts (key, value, note) values
  ('kaspi_link', '', 'Ссылка Kaspi для оплаты Plus — вставь сюда свою'),
  ('support_contact', '', 'Куда присылать скрин оплаты, например @tynysh_support')
on conflict (key) do nothing;

alter table app_texts enable row level security;
drop policy if exists "texts read" on app_texts;
create policy "texts read" on app_texts for select using (true);

insert into app_settings (key, value, note) values
  ('plus_price_month', 990,  'Цена Plus за месяц, тенге'),
  ('plus_price_year',  7900, 'Цена Plus за год, тенге')
on conflict (key) do nothing;

-- =====================================================================
-- 2. Бан аккаунта (это уже не «блокировка человеком», а решение админа)
-- =====================================================================
alter table profiles add column if not exists banned boolean default false;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.is_banned()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select p.banned from profiles p where p.id = auth.uid()), false);
$$;

-- Забаненный не может писать вообще никому.
drop policy if exists "members send messages" on messages;
create policy "members send messages" on messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_chat_member(chat_id)
    and not public.dm_blocked(chat_id)
    and not public.is_banned()
  );

-- =====================================================================
-- 3. Что видит админ
-- =====================================================================
drop policy if exists "orders admin read" on plus_orders;
create policy "orders admin read" on plus_orders for select using (public.is_admin());

drop policy if exists "reports read" on reports;
create policy "reports read" on reports for select
  using (reporter_id = auth.uid() or public.is_admin());

-- =====================================================================
-- 4. Кнопки админки. Всё через функции: прямая запись в profiles закрыта.
-- =====================================================================
create or replace function public.admin_set_plus(target uuid, months int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Только для админа'; end if;
  if months < 1 or months > 24 then raise exception 'Срок от 1 до 24 месяцев'; end if;

  update profiles
     set is_plus = true,
         plus_until = (greatest(coalesce(plus_until, current_date), current_date)
                        + (months || ' months')::interval)::date
   where id = target;

  update plus_orders
     set status = 'paid'
   where user_id = target and status = 'pending';
end;
$$;

create or replace function public.admin_stop_plus(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Только для админа'; end if;
  update profiles set is_plus = false, plus_until = null where id = target;
end;
$$;

create or replace function public.admin_set_ban(target uuid, value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Только для админа'; end if;
  if target = auth.uid() then raise exception 'Себя банить не надо'; end if;
  update profiles set banned = value where id = target;
end;
$$;

create or replace function public.admin_review_report(report_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Только для админа'; end if;
  if new_status not in ('new', 'reviewed', 'banned') then
    raise exception 'Неизвестный статус';
  end if;
  update reports set status = new_status where id = report_id;
end;
$$;

-- Список заявок и жалоб с именами — одним запросом, только для админа.
create or replace function public.admin_orders()
returns table (
  id uuid,
  user_id uuid,
  handle text,
  name text,
  plan text,
  amount int,
  status text,
  created_at timestamptz,
  is_plus boolean,
  plus_until date
)
language sql
security definer
stable
set search_path = public
as $$
  select o.id, o.user_id, p.handle, p.name, o.plan, o.amount, o.status, o.created_at,
         coalesce(p.is_plus, false), p.plus_until
  from plus_orders o
  join profiles p on p.id = o.user_id
  where public.is_admin()
  order by (o.status = 'pending') desc, o.created_at desc
  limit 100;
$$;

create or replace function public.admin_reports()
returns table (
  id uuid,
  target_id uuid,
  target_handle text,
  target_name text,
  target_banned boolean,
  reporter_handle text,
  reason text,
  status text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select r.id, r.target_id, t.handle, t.name, coalesce(t.banned, false),
         rep.handle, r.reason, r.status, r.created_at
  from reports r
  join profiles t on t.id = r.target_id
  left join profiles rep on rep.id = r.reporter_id
  where public.is_admin()
  order by (r.status = 'new') desc, r.created_at desc
  limit 100;
$$;
