-- =====================================================================
-- 002 · Защита формы отзывов от спама (13.11.2026)
-- Не больше 5 отзывов в час с одного устройства/аккаунта и не больше 50 за 10 минут всего.
-- IP не хранится — только его хеш (нельзя восстановить адрес).
-- Запуск: SQL Editor → New query → вставить → Run. В ОБОИХ проектах (dev и prod).
-- =====================================================================

alter table public.feedback add column if not exists client_hash text;
create index if not exists feedback_created_idx on public.feedback (created_at);

create or replace function public.feedback_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ip     text;
  recent int;
begin
  ip := trim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1));
  new.client_hash := case when ip = '' then null else md5(ip || ':relocate-spend') end;

  select count(*) into recent
  from public.feedback f
  where f.created_at > now() - interval '1 hour'
    and ((new.client_hash is not null and f.client_hash = new.client_hash)
      or (new.user_id is not null and f.user_id = new.user_id));
  if recent >= 5 then
    raise exception 'feedback rate limit' using errcode = 'P0001';
  end if;

  select count(*) into recent from public.feedback f where f.created_at > now() - interval '10 minutes';
  if recent >= 50 then
    raise exception 'feedback rate limit' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit
  before insert on public.feedback
  for each row execute function public.feedback_rate_limit();
