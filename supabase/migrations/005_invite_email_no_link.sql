-- =====================================================================
-- 005 · Письмо-приглашение без ссылки: только уведомление «откройте приложение».
-- Нужно только там, где уже выполнен прежний 004 (DEV). В PROD достаточно нового 004 — он уже такой.
-- =====================================================================

create or replace function private.send_invite_email(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  key      text;
  sender   text;
  inv      record;
  inviter  text;
  members  int;
  html     text;
  plain    text;
begin
  select value into key     from private.secrets where name = 'resend_api_key';
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
<tr><td style="font-size:15px;line-height:1.5;color:#16211e;background:#eef6f3;border-radius:14px;padding:16px 18px">
<b>Как принять:</b> откройте приложение RelocateSpend — приглашение ждёт на главном экране. Нажмите «Принять».<br><br>
Ещё нет аккаунта? Зарегистрируйтесь в приложении с почтой <b>%4$s</b> — приглашение появится сразу после входа. Оно действует 7 дней.
</td></tr>
<tr><td style="height:20px"></td></tr>
<tr><td style="font-size:12px;line-height:1.5;color:#9aa59f;border-top:1px solid #e6ecea;padding-top:16px">
%1$s invited you to the shared expense group “%2$s” in RelocateSpend. Open the app and tap “Accept” on the home screen.<br>
Если вы не ждали это письмо, просто проигнорируйте его.
</td></tr>
</table>
</td></tr>
</table>
</body></html>$h$,
    private.html_escape(inviter),
    private.html_escape(inv.group_name),
    members,
    private.html_escape(inv.email)
  );

  plain := format(
    E'%s приглашает вас в группу «%s» в RelocateSpend.\n\nКак принять: откройте приложение RelocateSpend — приглашение ждёт на главном экране, нажмите «Принять».\nЕщё нет аккаунта? Зарегистрируйтесь в приложении с почтой %s — приглашение появится сразу после входа. Действует 7 дней.\n\n%s invited you to the group “%s”. Open the app and tap “Accept” on the home screen.',
    inviter, inv.group_name, inv.email, inviter, inv.group_name
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

delete from private.secrets where name = 'app_url';
