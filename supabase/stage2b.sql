-- Tynysh, этап 2б (блокировка людей). Выполнить в Supabase → SQL Editor целиком.
-- Новых таблиц не создаёт: таблица blocks уже есть с самого начала.
-- Запускать повторно безопасно.

-- 1. Два вопроса, которые теперь задают правила доступа.

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

-- 2. Правила для сообщений с учётом блокировок.
drop policy if exists "members read messages" on messages;
create policy "members read messages" on messages for select
  using (public.is_chat_member(chat_id) and not public.sender_blocked(sender_id));

drop policy if exists "members send messages" on messages;
create policy "members send messages" on messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_chat_member(chat_id)
    and not public.dm_blocked(chat_id)
  );

-- 3. Список чатов: сообщения заблокированных не показываем и не считаем.
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
