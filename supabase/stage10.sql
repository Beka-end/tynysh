-- Tynysh: отдельная ссылка Kaspi для годовой оплаты.
-- Выполнить в Supabase → SQL Editor после stage9.sql. Запускать повторно безопасно.

-- У месяца и года разные суммы, а значит обычно и разные ссылки Kaspi.
-- Если заполнить только kaspi_link, годовая оплата пойдёт по ней же —
-- показать человеку пустой экран вместо кнопки было бы хуже.
insert into app_texts (key, value, note) values
  ('kaspi_link_year', '', 'Ссылка Kaspi для годовой оплаты. Пусто — берётся обычная kaspi_link')
on conflict (key) do nothing;
