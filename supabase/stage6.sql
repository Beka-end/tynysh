-- Tynysh, дневник настроения. Выполнить в Supabase → SQL Editor после stage4.sql.
-- Запускать повторно безопасно.

-- К отметке настроения добавляем короткую заметку «что было в этот день».
-- Без неё итог недели получается из пяти цифр и никому не нужен.
alter table moods add column if not exists note text;
alter table moods add column if not exists created_at timestamptz default now();

-- Правило доступа уже есть с первого этапа («moods own»): свои отметки видит
-- и меняет только сам человек. Здесь ничего добавлять не нужно.

-- Проверка длины заметки — чтобы в базу не попадали простыни.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'moods_note_length'
  ) then
    alter table moods add constraint moods_note_length
      check (note is null or char_length(note) <= 300);
  end if;
end $$;
