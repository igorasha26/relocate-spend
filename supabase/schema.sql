-- =====================================================================
-- RelocateSpend — схема базы Supabase.
-- Запуск: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Выполнить в ОБОИХ проектах (dev и prod). Скрипт можно запускать повторно.
-- =====================================================================

-- ---------- Записи пользователя (траты, категории, настройки, сканы) ----------
-- Одна строка = одна сущность в JSON. Форма данных меняется в приложении без миграций базы.
create table if not exists public.records (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('expense', 'category', 'settings', 'scan')),
  id         text        not null check (char_length(id) between 1 and 100),
  data       jsonb       check (data is null or pg_column_size(data) < 64000),
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);

create index if not exists records_user_updated_idx on public.records (user_id, updated_at);

-- Время изменения ставит сервер — часы телефонов могут врать
create or replace function public.records_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists records_touch on public.records;
create trigger records_touch
  before insert or update on public.records
  for each row execute function public.records_touch();

alter table public.records enable row level security;

-- Каждый видит и меняет только свои записи
drop policy if exists "records: own rows" on public.records;
create policy "records: own rows" on public.records
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.records from anon;
grant select, insert, update, delete on public.records to authenticated;

-- ---------- Профиль: тариф (для будущей оплаты) ----------
create table if not exists public.profiles (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  plan       text        not null default 'free' check (plan in ('free', 'pro')),
  plan_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Читать свой профиль можно, менять тариф — только сервер (платёжный вебхук)
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Отзывы ----------
create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid        default auth.uid() references auth.users (id) on delete set null,
  kind        text        not null default 'other' check (kind in ('idea', 'bug', 'other')),
  message     text        not null check (char_length(message) between 1 and 4000),
  contact     text        check (char_length(contact) <= 200),
  app_version text        check (char_length(app_version) <= 40),
  app_env     text        check (char_length(app_env) <= 20),
  language    text        check (char_length(language) <= 10),
  platform    text        check (char_length(platform) <= 300),
  page        text        check (char_length(page) <= 200),
  status      text        not null default 'new' check (status in ('new', 'read', 'done'))
);

alter table public.feedback enable row level security;

-- Писать могут все (и гости), читать — только вы в панели Supabase
drop policy if exists "feedback: anyone can send" on public.feedback;
create policy "feedback: anyone can send" on public.feedback
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

revoke all on public.feedback from anon, authenticated;
grant insert (kind, message, contact, app_version, app_env, language, platform, page) on public.feedback to anon, authenticated;

-- ---------- Настройки приложения (флаги функций) ----------
-- Чтобы включить сканер всем: Table Editor → app_config → features → {"qrScan": true, "pro": false}
create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists "app_config: public read" on public.app_config;
create policy "app_config: public read" on public.app_config
  for select to anon, authenticated
  using (true);

revoke all on public.app_config from anon, authenticated;
grant select on public.app_config to anon, authenticated;

insert into public.app_config (key, value)
values ('features', '{"qrScan": false, "pro": false}')
on conflict (key) do nothing;

-- ---------- Удаление аккаунта самим пользователем ----------
-- Удаляет пользователя из auth.users; записи и профиль удаляются каскадом, отзывы остаются анонимными.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
