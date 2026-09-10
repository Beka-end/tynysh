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

-- Row Level Security: каждый видит только своё
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

create policy "profiles read" on profiles for select using (true);
create policy "profiles insert own" on profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on profiles for update using (auth.uid() = id);

create policy "members read chats" on chats for select
  using (exists (select 1 from chat_members m where m.chat_id = chats.id and m.user_id = auth.uid()));
create policy "members read members" on chat_members for select
  using (exists (select 1 from chat_members m where m.chat_id = chat_members.chat_id and m.user_id = auth.uid()));
create policy "members read messages" on messages for select
  using (exists (select 1 from chat_members m where m.chat_id = messages.chat_id and m.user_id = auth.uid()));
create policy "members send messages" on messages for insert
  with check (sender_id = auth.uid() and exists (select 1 from chat_members m where m.chat_id = messages.chat_id and m.user_id = auth.uid()));
create policy "sender edits own" on messages for update using (sender_id = auth.uid());

create policy "dos own" on dos_messages for all using (user_id = auth.uid());
create policy "usage own" on dos_usage for all using (user_id = auth.uid());
create policy "moods own" on moods for all using (user_id = auth.uid());
create policy "blocks own" on blocks for all using (user_id = auth.uid());
create policy "reports create" on reports for insert with check (reporter_id = auth.uid());
create policy "orders own" on plus_orders for all using (user_id = auth.uid());

-- Создание чатов и добавление участников — только через серверный код (service role),
-- чтобы нельзя было добавить себя в чужой чат.
