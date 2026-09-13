-- Tynysh, этап 2 (чаты). Выполнить в Supabase → SQL Editor целиком, ОДИН раз.
-- Этот файл — «добавка» к уже созданной базе этапа 1: новые таблицы он не создаёт,
-- а обновляет правила доступа и добавляет функции для чатов и групп.
-- Запускать повторно безопасно.

-- 1. Правила доступа. Старые снимаем и ставим заново — так файл можно запускать
--    сколько угодно раз.
drop policy if exists "members read chats" on chats;
drop policy if exists "members read members" on chat_members;
drop policy if exists "members update own row" on chat_members;
drop policy if exists "members read messages" on messages;
drop policy if exists "members send messages" on messages;
drop policy if exists "sender edits own" on messages;

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

create policy "members read chats" on chats for select
  using (public.is_chat_member(id));

create policy "members read members" on chat_members for select
  using (public.is_chat_member(chat_id));
-- Каждый двигает только свою отметку «прочитано до».
create policy "members update own row" on chat_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "members read messages" on messages for select
  using (public.is_chat_member(chat_id));
create policy "members send messages" on messages for insert
  with check (sender_id = auth.uid() and public.is_chat_member(chat_id));
create policy "sender edits own" on messages for update
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

-- 2. Функции для чатов, групп и списка чатов (описание — в supabase/schema.sql).
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
    where m.chat_id = c.id and m.deleted_at is null
    order by m.created_at desc
    limit 1
  ) last_msg on true
  where my_row.user_id = auth.uid()
  order by coalesce(last_msg.created_at, c.created_at) desc;
$$;

-- 3. «Живые» сообщения: добавляем таблицы в рассылку Realtime,
--    но только если их там ещё нет (иначе Postgres ругнётся).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_members'
  ) then
    alter publication supabase_realtime add table chat_members;
  end if;
end $$;
