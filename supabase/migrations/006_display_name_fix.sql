-- =====================================================================
-- 006 · Имя в профиле: сохраняется у всех, а не только у участников групп.
-- Выполнить в обоих проектах (DEV и PROD) после 003.
--
-- Было: имя записывалось только в существующую строку профиля (у части старых аккаунтов
-- её нет), а читалось только через участников групп — без групп имя «не менялось».
-- =====================================================================

-- Записать имя; если строки профиля нет — создать её
create or replace function public.set_display_name(p_name text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.profiles (user_id, display_name)
  values (auth.uid(), nullif(left(btrim(p_name), 40), ''))
  on conflict (user_id) do update set display_name = excluded.display_name;
$$;

-- Своё имя (null — не задано)
create or replace function public.my_display_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select display_name from public.profiles where user_id = auth.uid();
$$;

-- Профили у старых аккаунтов, созданных до таблицы profiles
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

revoke all on function public.set_display_name(text), public.my_display_name() from public, anon;
grant execute on function public.set_display_name(text), public.my_display_name() to authenticated;
