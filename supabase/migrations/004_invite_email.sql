-- =====================================================================
-- 004 · Письмо-приглашение в группу (через Resend) + лимит приглашений.
-- Выполнять после 003_groups.sql. Сначала в DEV, в PROD — вместе с выпуском групп.
--
-- Ключ Resend в этот файл НЕ вписываем (файл лежит в git).
-- После запуска выполните отдельным запросом в SQL Editor (см. docs/DEPLOY.md, 1.9):
--   insert into private.secrets (name, value) values ('resend_api_key', 're_…')
--   on conflict (name) do update set value = excluded.value;
-- Без ключа приглашения работают как раньше — просто без письма.
-- =====================================================================

create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.secrets (
  name  text primary key,
  value text not null
);

-- Адрес приложения в ссылке из письма и отправитель. В PROD поменяйте app_url:
--   update private.secrets set value = 'https://app.relocatespend.app' where name = 'app_url';
insert into private.secrets (name, value) values
  ('app_url',   'https://dev.relocate-spend.pages.dev'),
  ('mail_from', 'RelocateSpend <noreply@mail.relocatespend.app>')
on conflict (name) do nothing;

-- Когда и кем отправлено письмо — для лимита
alter table public.group_invites add column if not exists emailed_at timestamptz;

create or replace function private.html_escape(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

create or replace function private.send_invite_email(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  key      text;
  app_url  text;
  sender   text;
  inv      record;
  inviter  text;
  members  int;
  link     text;
  html     text;
  plain    text;
begin
  select value into key     from private.secrets where name = 'resend_api_key';
  select value into app_url from private.secrets where name = 'app_url';
  select value into sender  from private.secrets where name = 'mail_from';
  if key is null or key not like 're_%' then
    return; -- ключ не задан: приглашение видно в приложении, письма нет
  end if;

  select i.email, i.group_id, g.name as group_name, i.invited_by
    into inv
    from public.group_invites i join public.groups g on g.id = i.group_id
   where i.id = p_invite;
  if not found then return; end if;

  -- Имя пригласившего; если не задано — начало почты до @ (саму почту не показываем)
  select coalesce(nullif(btrim(p.display_name), ''), split_part(u.email, '@', 1))
    into inviter
    from auth.users u left join public.profiles p on p.user_id = u.id
   where u.id = inv.invited_by;
  select count(*) into members from public.group_members where group_id = inv.group_id;

  link := coalesce(app_url, 'https://app.relocatespend.app') || '/profile?invite=1';

  html := format($h$<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#16211e">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#f2f5f4;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:32px 28px">
<tr><td style="font-size:15px;font-weight:700;color:#176b5b;padding-bottom:20px">RelocateSpend</td></tr>
<tr><td style="font-size:22px;font-weight:700;line-height:1.3;padding-bottom:12px">%1$s приглашает вас в группу «%2$s»</td></tr>
<tr><td style="font-size:15px;line-height:1.5;color:#3d4a45;padding-bottom:24px">
Группа — общий список трат: все участники видят траты друг друга и добавляют свои. Сейчас в группе: %3$s.
</td></tr>
<tr><td style="padding-bottom:24px">
<a href="%4$s" style="display:inline-block;background:#176b5b;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 26px;border-radius:14px">Открыть приглашение</a>
</td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#69756f;padding-bottom:16px">
Войдите или зарегистрируйтесь с почтой <b>%5$s</b> — приглашение появится в разделе «Профиль». Оно действует 7 дней.
</td></tr>
<tr><td style="font-size:12px;line-height:1.5;color:#9aa59f;border-top:1px solid #e6ecea;padding-top:16px">
%1$s invited you to the shared expense group “%2$s” in RelocateSpend. Sign in with this email to accept.<br>
Если вы не ждали это письмо, просто проигнорируйте его.
</td></tr>
</table>
</td></tr>
</table>
</body></html>$h$,
    private.html_escape(inviter),
    private.html_escape(inv.group_name),
    members,
    private.html_escape(link),
    private.html_escape(inv.email)
  );

  plain := format(
    E'%s приглашает вас в группу «%s» в RelocateSpend.\n\nОткройте: %s\nВойдите или зарегистрируйтесь с почтой %s — приглашение появится в «Профиле». Действует 7 дней.\n\n%s invited you to the group “%s”. Sign in with this email to accept.',
    inviter, inv.group_name, link, inv.email, inviter, inv.group_name
  );

  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'from', coalesce(sender, 'RelocateSpend <noreply@mail.relocatespend.app>'),
      'to', jsonb_build_array(inv.email),
      'subject', left(format('%s приглашает вас в группу «%s»', inviter, inv.group_name), 150),
      'html', html,
      'text', plain
    )
  );
  update public.group_invites set emailed_at = now() where id = p_invite;
end;
$$;

revoke all on function private.send_invite_email(uuid) from public, anon, authenticated;

-- invite_to_group: то же, что в 003, плюс лимит и письмо.
-- Лимит: не больше 10 приглашений в сутки от одного человека (бесплатный Resend — 100 писем в день на всех).
-- Повторное приглашение той же почты — не чаще раза в 10 минут (письмо не дублируется).
create or replace function public.invite_to_group(p_group uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  mail text := lower(btrim(p_email));
  invite uuid;
  recent boolean;
begin
  if not public.is_group_member(p_group) then raise exception 'not_member' using errcode = 'P0001'; end if;
  if mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email' using errcode = 'P0001'; end if;
  if exists (
    select 1 from public.group_members m join auth.users u on u.id = m.user_id
    where m.group_id = p_group and lower(u.email) = mail
  ) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  if (select count(*) from public.group_members where group_id = p_group)
     + (select count(*) from public.group_invites where group_id = p_group and expires_at > now() and email <> mail) >= 5 then
    raise exception 'group_full' using errcode = 'P0001';
  end if;

  -- то же приглашение недавно уже отправляли — не шлём письмо повторно
  select exists (
    select 1 from public.group_invites
    where group_id = p_group and email = mail and emailed_at > now() - interval '10 minutes'
  ) into recent;

  if not recent and (
    select count(*) from public.group_invites
    where invited_by = auth.uid() and created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'too_many_invites' using errcode = 'P0001';
  end if;

  insert into public.group_invites (group_id, email, invited_by)
  values (p_group, mail, auth.uid())
  on conflict (group_id, email) do update
    set invited_by = excluded.invited_by,
        created_at = case when recent then public.group_invites.created_at else now() end,
        expires_at = now() + interval '7 days'
  returning id into invite;

  if not recent then
    begin
      perform private.send_invite_email(invite);
    exception when others then
      -- письмо не ушло — приглашение всё равно создано и видно в приложении
      raise warning 'invite email failed: %', sqlerrm;
    end;
  end if;
  return invite;
end;
$$;

revoke all on function public.invite_to_group(uuid, text) from public, anon;
grant execute on function public.invite_to_group(uuid, text) to authenticated;
