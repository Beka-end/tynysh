-- Tynysh: цифры для этапа 6 (первые 30 человек). Выполнить в Supabase → SQL Editor
-- после stage7.sql. Запускать повторно безопасно.

-- Только счётчики. Никаких текстов сообщений: их не читает никто, включая админа.
create or replace function public.admin_stats()
returns table (
  users_total int,
  users_week int,
  chat_senders_week int,
  chat_messages_week int,
  dos_users int,
  dos_returned int,
  dos_messages_week int,
  pack_finished int,
  plus_active int,
  mood_users_week int,
  reports_new int
)
language sql
security definer
stable
set search_path = public
as $$
  select
    -- люди
    (select count(*)::int from profiles),
    (select count(*)::int from profiles where created_at > now() - interval '7 days'),

    -- переписка между людьми (переехал ли круг общения)
    (select count(distinct m.sender_id)::int from messages m
      where m.created_at > now() - interval '7 days'),
    (select count(*)::int from messages m
      where m.created_at > now() - interval '7 days'),

    -- Дос
    (select count(distinct u.user_id)::int from dos_usage u),
    (select count(*)::int from (
        select u.user_id from dos_usage u group by u.user_id having count(*) >= 2
     ) t),
    (select count(*)::int from dos_messages d
      where d.role = 'user' and d.created_at > now() - interval '7 days'),
    (select count(*)::int from (
        select u.user_id from dos_usage u group by u.user_id
        having sum(u.count) >= (select value from app_settings where key = 'dos_free_total')
     ) t),

    -- деньги и настроение
    (select count(*)::int from profiles p
      where coalesce(p.is_plus, false)
        and (p.plus_until is null or p.plus_until >= current_date)),
    (select count(distinct m.user_id)::int from moods m
      where m.day >= current_date - 7),

    -- что требует внимания
    (select count(*)::int from reports r where r.status = 'new')
  where public.is_admin();
$$;
