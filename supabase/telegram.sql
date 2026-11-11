-- =====================================================================
-- Уведомления в Telegram: новый отзыв и новый пользователь.
-- 1. Вставьте токен бота и свой chat id в строки ниже (вместо ВСТАВЬТЕ_…).
-- 2. Supabase → SQL Editor → New query → вставить → Run.
-- Токен хранится в закрытой схеме private: через API приложения он недоступен.
-- Выполнять после schema.sql. Можно в обоих проектах (в сообщении видно dev/prod).
-- =====================================================================

create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.secrets (
  name  text primary key,
  value text not null
);

insert into private.secrets (name, value) values
  ('telegram_bot_token', 'ВСТАВЬТЕ_ТОКЕН_ОТ_BOTFATHER'),
  ('telegram_chat_id',   'ВСТАВЬТЕ_СВОЙ_CHAT_ID')
on conflict (name) do update set value = excluded.value;

create or replace function private.telegram_send(message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
  chat  text;
begin
  select value into token from private.secrets where name = 'telegram_bot_token';
  select value into chat  from private.secrets where name = 'telegram_chat_id';
  if token is null or chat is null or token like 'ВСТАВЬТЕ%' then
    return;
  end if;
  perform net.http_post(
    url     := 'https://api.telegram.org/bot' || token || '/sendMessage',
    body    := jsonb_build_object('chat_id', chat, 'text', left(message, 4000), 'disable_web_page_preview', true),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
end;
$$;

-- Новый отзыв
create or replace function private.notify_feedback()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.telegram_send(format(
    E'%s %s · %s\n\n%s\n\n👤 %s\n📱 v%s · %s · %s',
    case new.kind when 'bug' then '🐞 Ошибка' when 'idea' then '💡 Идея' else '💬 Отзыв' end,
    coalesce(new.app_env, '?'),
    case when new.user_id is null then 'гость' else 'с аккаунтом' end,
    new.message,
    coalesce(nullif(new.contact, ''), 'контакт не указан'),
    coalesce(new.app_version, '?'),
    coalesce(new.language, '?'),
    coalesce(new.page, '')
  ));
  return new;
end;
$$;

drop trigger if exists feedback_notify on public.feedback;
create trigger feedback_notify
  after insert on public.feedback
  for each row execute function private.notify_feedback();

-- Новый пользователь (без почты — только счётчик)
create or replace function private.notify_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  total bigint;
begin
  select count(*) into total from public.profiles;
  perform private.telegram_send(format(E'🎉 Новый пользователь RelocateSpend\nВсего аккаунтов: %s', total));
  return new;
end;
$$;

drop trigger if exists profiles_notify on public.profiles;
create trigger profiles_notify
  after insert on public.profiles
  for each row execute function private.notify_signup();

-- Проверка: должно прийти сообщение в Telegram
select private.telegram_send('✅ RelocateSpend: уведомления подключены');
