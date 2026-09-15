-- Tynysh: схема базы данных (Supabase / Postgres)
-- Выполнить в Supabase → SQL Editor целиком.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_.]{3,32}$'),
  name text not null,
  bio text default '',
  birth_year int not null,
  is_plus boolean default false,
  plus_until date,
  is_admin boolean default false,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

create table chats (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('dm','group')),
  title text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table chat_members (
  chat_id uuid references chats(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member' check (role in ('owner','member')),
  last_read_at timestamptz default now(),
  primary key (chat_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references chats(id) on delete cascade,
  sender_id uuid references profiles(id),
  text text not null check (char_length(text) <= 4000),
  created_at timestamptz default now(),
  deleted_at timestamptz
);
create index on messages (chat_id, created_at);

-- Дос: личная история и дневной лимит
create table dos_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  text text not null,
  created_at timestamptz default now()
);
create index on dos_messages (user_id, created_at);

create table dos_usage (
  user_id uuid references profiles(id) on delete cascade,
  day date not null,
  count int default 0,
  primary key (user_id, day)
);

create table moods (
  user_id uuid references profiles(id) on delete cascade,
  day date not null,
  value int check (value between 1 and 5),
  primary key (user_id, day)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id),
  target_id uuid references profiles(id),
  reason text,
  status text default 'new' check (status in ('new','reviewed','banned')),
  created_at timestamptz default now()
);

create table blocks (
  user_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  primary key (user_id, blocked_id)
);

-- Заявки на Plus (оплата Kaspi, активация вручную в админке)
create table plus_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  plan text check (plan in ('month','year')),
  amount int not null,
  status text default 'pending' check (status in ('pending','paid','cancelled')),
  created_at timestamptz default now()
);

-- =====================================================================
-- Row Level Security: каждый видит только своё
-- =====================================================================
alter table profiles enable row level security;
alter table chats enable row level security;
alter table chat_members enable row level security;
alter table messages enable row level security;
alter table dos_messages enable row level security;
alter table dos_usage enable row level security;
alter table moods enable row level security;
alter table reports enable row level security;
alter table blocks enable row level security;
alter table plus_orders enable row level security;

-- Вопрос «я участник этого чата?» задаётся в правилах много раз.
-- security definer — функция смотрит в chat_members в обход правил.
-- Без этого правило для chat_members ссылалось бы само на себя,
-- и Postgres ругался бы «infinite recursion detected in policy».
create or replace function public.is_chat_member(target_chat uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from chat_members m
    where m.chat_id = target_chat and m.user_id = auth.uid()
  );
$$;

-- «Я заблокировал этого отправителя?» — тогда его сообщений я не вижу нигде.
create or replace function public.sender_blocked(sender uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select sender is not null and exists (
    select 1 from blocks b
    where b.user_id = auth.uid() and b.blocked_id = sender
  );
$$;

-- «В этом личном чате есть блокировка (в любую сторону)?» — тогда писать нельзя.
-- Группы это не трогает: один человек не может закрыть переписку всей группе.
create or replace function public.dm_blocked(target_chat uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from chats c
    join chat_members m on m.chat_id = c.id and m.user_id <> auth.uid()
    join blocks b on (b.user_id = m.user_id and b.blocked_id = auth.uid())
                  or (b.user_id = auth.uid() and b.blocked_id = m.user_id)
    where c.id = target_chat and c.type = 'dm'
  );
$$;

create policy "profiles read" on profiles for select using (true);
create policy "profiles insert own" on profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on profiles for update using (auth.uid() = id);

create policy "members read chats" on chats for select
  using (public.is_chat_member(id));

create policy "members read members" on chat_members for select
  using (public.is_chat_member(chat_id));
-- Каждый двигает только свою отметку «прочитано до».
create policy "members update own row" on chat_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "members read messages" on messages for select
  using (public.is_chat_member(chat_id) and not public.sender_blocked(sender_id));
create policy "members send messages" on messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_chat_member(chat_id)
    and not public.dm_blocked(chat_id)
  );
create policy "sender edits own" on messages for update
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

create policy "dos own" on dos_messages for all using (user_id = auth.uid());
create policy "usage own" on dos_usage for all using (user_id = auth.uid());
create policy "moods own" on moods for all using (user_id = auth.uid());
create policy "blocks own" on blocks for all using (user_id = auth.uid());
create policy "reports create" on reports for insert with check (reporter_id = auth.uid());
create policy "orders own" on plus_orders for all using (user_id = auth.uid());

-- Создавать чаты и добавлять участников напрямую из браузера нельзя:
-- политик insert для chats и chat_members нет специально.
-- Всё идёт через функции ниже: они проверяют, что человек открывает чат
-- только от своего имени и добавляет только тех, кого действительно выбрал.

-- =====================================================================
-- Этап 2. Чаты: создание, список, «живые» сообщения
-- =====================================================================

-- Открыть личный чат с человеком. Если он уже есть — вернуть старый,
-- чтобы не плодить дубли. Возвращает id чата.
create or replace function public.start_dm(target uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  found_chat uuid;
  fresh_chat uuid;
begin
  if me is null then raise exception 'Нужно войти'; end if;
  if target = me then raise exception 'Чат с самим собой не нужен'; end if;
  if not exists (select 1 from profiles p where p.id = target) then
    raise exception 'Такого пользователя нет';
  end if;
  if exists (
    select 1 from blocks b
    where (b.user_id = me and b.blocked_id = target)
       or (b.user_id = target and b.blocked_id = me)
  ) then
    raise exception 'Написать этому человеку нельзя';
  end if;

  select c.id into found_chat
  from chats c
  join chat_members a on a.chat_id = c.id and a.user_id = me
  join chat_members b on b.chat_id = c.id and b.user_id = target
  where c.type = 'dm'
  limit 1;
  if found_chat is not null then return found_chat; end if;

  insert into chats (type, created_by) values ('dm', me) returning id into fresh_chat;
  insert into chat_members (chat_id, user_id, role)
  values (fresh_chat, me, 'owner'), (fresh_chat, target, 'member');
  return fresh_chat;
end;
$$;

-- Создать группу. Создатель попадает в неё автоматически.
create or replace function public.create_group(group_title text, member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  clean_title text := btrim(coalesce(group_title, ''));
  fresh_chat uuid;
begin
  if me is null then raise exception 'Нужно войти'; end if;
  if char_length(clean_title) < 2 or char_length(clean_title) > 60 then
    raise exception 'Название группы — от 2 до 60 символов';
  end if;
  if coalesce(array_length(member_ids, 1), 0) > 200 then
    raise exception 'В группе не больше 200 человек';
  end if;

  insert into chats (type, title, created_by)
  values ('group', clean_title, me) returning id into fresh_chat;

  insert into chat_members (chat_id, user_id, role)
  values (fresh_chat, me, 'owner');

  insert into chat_members (chat_id, user_id, role)
  select fresh_chat, p.id, 'member'
  from profiles p
  where p.id = any(member_ids)
    and p.id <> me
    and not exists (
      select 1 from blocks b
      where (b.user_id = me and b.blocked_id = p.id)
         or (b.user_id = p.id and b.blocked_id = me)
    )
  on conflict do nothing;

  return fresh_chat;
end;
$$;

-- Список чатов для экрана «Чаты»: с кем, последнее сообщение и сколько непрочитанных.
create or replace function public.chat_overview()
returns table (
  chat_id uuid,
  chat_type text,
  chat_title text,
  other_id uuid,
  other_handle text,
  other_name text,
  members_count int,
  last_text text,
  last_at timestamptz,
  last_sender_id uuid,
  unread_count int
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.id,
    c.type,
    c.title,
    partner.id,
    partner.handle,
    partner.name,
    (select count(*)::int from chat_members total where total.chat_id = c.id),
    last_msg.text,
    last_msg.created_at,
    last_msg.sender_id,
    (select count(*)::int from messages fresh
       where fresh.chat_id = c.id
         and fresh.sender_id <> auth.uid()
         and fresh.deleted_at is null
         and not public.sender_blocked(fresh.sender_id)
         and fresh.created_at > my_row.last_read_at)
  from chat_members my_row
  join chats c on c.id = my_row.chat_id
  left join lateral (
    select p.id, p.handle, p.name
    from chat_members side
    join profiles p on p.id = side.user_id
    where side.chat_id = c.id and side.user_id <> auth.uid()
    limit 1
  ) partner on c.type = 'dm'
  left join lateral (
    select m.text, m.created_at, m.sender_id
    from messages m
    where m.chat_id = c.id
      and m.deleted_at is null
      and not public.sender_blocked(m.sender_id)
    order by m.created_at desc
    limit 1
  ) last_msg on true
  where my_row.user_id = auth.uid()
  order by coalesce(last_msg.created_at, c.created_at) desc;
$$;

-- «Живые» сообщения: Supabase Realtime рассылает изменения только тех таблиц,
-- которые добавлены в публикацию supabase_realtime.
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table chat_members;

-- =====================================================================
-- Этап 3. Дос: настройки, лимиты и права
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

-- =====================================================================
-- Этап 4. Оплата, админка, жалобы
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
