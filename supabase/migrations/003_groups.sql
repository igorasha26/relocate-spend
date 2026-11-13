-- =====================================================================
-- 003 · Группы трат (совместный бюджет) · 13.11.2026
-- Сначала только в DEV-проекте. В prod — когда группы будут готовы к выпуску.
-- Запуск: SQL Editor → New query → вставить весь файл → Run. Скрипт можно запускать повторно.
--
-- Правила (решения Игоря):
--  • группу может создать любой; приглашать никого не обязательно;
--  • до 5 участников; все участники равны: добавлять, менять и удалять траты группы может любой;
--  • удалить группу нельзя — только выйти; когда выходит последний участник, группа удаляется
--    вместе с её тратами (приложение предупреждает и предлагает забрать траты в личные);
--  • траты вышедшего остаются в группе.
-- =====================================================================

-- ---------- Имя пользователя (видно участникам групп) ----------
alter table public.profiles add column if not exists display_name text
  check (display_name is null or char_length(display_name) between 1 and 40);

drop policy if exists "profiles: update own name" on public.profiles;
create policy "profiles: update own name" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant update (display_name) on public.profiles to authenticated;

-- ---------- Таблицы ----------
create table if not exists public.groups (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null check (char_length(btrim(name)) between 1 and 40),
  created_by uuid        references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id  uuid        not null references public.groups (id) on delete cascade,
  user_id   uuid        not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members (user_id);

create table if not exists public.group_invites (
  id         uuid        primary key default gen_random_uuid(),
  group_id   uuid        not null references public.groups (id) on delete cascade,
  email      text        not null check (email = lower(email) and char_length(email) between 3 and 254),
  invited_by uuid        references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  unique (group_id, email)
);
create index if not exists group_invites_email_idx on public.group_invites (email);

-- Траты группы: как records, только принадлежат группе, а не человеку
create table if not exists public.group_records (
  group_id   uuid        not null references public.groups (id) on delete cascade,
  kind       text        not null check (kind in ('expense')),
  id         text        not null check (char_length(id) between 1 and 100),
  data       jsonb       check (data is null or pg_column_size(data) < 64000),
  deleted    boolean     not null default false,
  created_by uuid        references auth.users (id) on delete set null,
  updated_by uuid        references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, kind, id)
);
create index if not exists group_records_updated_idx on public.group_records (group_id, updated_at);

-- ---------- Служебные функции ----------
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.group_members m where m.group_id = gid and m.user_id = auth.uid());
$$;

-- Состоим ли мы с этим человеком в одной группе (чтобы видеть его имя)
create or replace function public.shares_group_with(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = uid
  );
$$;

-- Время и автор изменения ставит сервер
create or replace function public.group_records_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists group_records_touch on public.group_records;
create trigger group_records_touch
  before insert or update on public.group_records
  for each row execute function public.group_records_touch();

-- Не больше 5 участников
create or replace function public.group_members_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.group_members where group_id = new.group_id) >= 5 then
    raise exception 'group_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists group_members_limit on public.group_members;
create trigger group_members_limit
  before insert on public.group_members
  for each row execute function public.group_members_limit();

-- Ушёл последний участник (вышел или удалил аккаунт) → группа удаляется вместе с тратами
create or replace function public.group_members_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.group_members where group_id = old.group_id) then
    delete from public.groups where id = old.group_id;
  end if;
  return old;
end;
$$;

drop trigger if exists group_members_cleanup on public.group_members;
create trigger group_members_cleanup
  after delete on public.group_members
  for each row execute function public.group_members_cleanup();

-- ---------- Права доступа (RLS) ----------
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.group_records enable row level security;

drop policy if exists "groups: members read" on public.groups;
create policy "groups: members read" on public.groups
  for select to authenticated using (public.is_group_member(id));

drop policy if exists "groups: members rename" on public.groups;
create policy "groups: members rename" on public.groups
  for update to authenticated using (public.is_group_member(id)) with check (public.is_group_member(id));

drop policy if exists "group_members: members read" on public.group_members;
create policy "group_members: members read" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "group_invites: members and invitee read" on public.group_invites;
create policy "group_invites: members and invitee read" on public.group_invites
  for select to authenticated
  using (public.is_group_member(group_id) or email = lower((select auth.email())));

drop policy if exists "group_invites: members cancel" on public.group_invites;
create policy "group_invites: members cancel" on public.group_invites
  for delete to authenticated using (public.is_group_member(group_id));

drop policy if exists "group_records: members all" on public.group_records;
create policy "group_records: members all" on public.group_records
  for all to authenticated
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

-- Имена участников своих групп
drop policy if exists "profiles: group mates read" on public.profiles;
create policy "profiles: group mates read" on public.profiles
  for select to authenticated using (public.shares_group_with(user_id));

revoke all on public.groups, public.group_members, public.group_invites, public.group_records from anon;
revoke all on public.groups, public.group_members, public.group_invites, public.group_records from authenticated;
grant select on public.groups, public.group_members, public.group_invites to authenticated;
grant update (name) on public.groups to authenticated;
grant delete on public.group_invites to authenticated;
grant select, insert, update, delete on public.group_records to authenticated;

-- ---------- Действия (RPC) ----------

-- Создать группу (создатель сразу участник)
create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if (select count(*) from public.group_members where user_id = auth.uid()) >= 20 then
    raise exception 'too_many_groups' using errcode = 'P0001';
  end if;
  insert into public.groups (name, created_by) values (btrim(p_name), auth.uid()) returning id into gid;
  insert into public.group_members (group_id, user_id) values (gid, auth.uid());
  return gid;
end;
$$;

-- Пригласить по почте (письмо отправит приложение/следующий этап)
create or replace function public.invite_to_group(p_group uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  mail text := lower(btrim(p_email));
  invite uuid;
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
  insert into public.group_invites (group_id, email, invited_by)
  values (p_group, mail, auth.uid())
  on conflict (group_id, email) do update
    set invited_by = excluded.invited_by, created_at = now(), expires_at = now() + interval '7 days'
  returning id into invite;
  return invite;
end;
$$;

-- Мои группы с участниками и приглашениями — одним запросом
create or replace function public.my_groups()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(g order by g ->> 'createdAt'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', gr.id,
      'name', gr.name,
      'createdAt', gr.created_at,
      'members', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', m.user_id,
          'name', coalesce(p.display_name, split_part(u.email, '@', 1)),
          'joinedAt', m.joined_at
        ) order by m.joined_at), '[]'::jsonb)
        from public.group_members m
        join auth.users u on u.id = m.user_id
        left join public.profiles p on p.user_id = m.user_id
        where m.group_id = gr.id
      ),
      'invites', (
        select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'expiresAt', i.expires_at)), '[]'::jsonb)
        from public.group_invites i
        where i.group_id = gr.id and i.expires_at > now()
      )
    ) as g
    from public.groups gr
    join public.group_members me on me.group_id = gr.id and me.user_id = auth.uid()
  ) t;
$$;

-- Приглашения для меня (по почте аккаунта)
create or replace function public.my_invites()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'groupId', i.group_id,
    'groupName', gr.name,
    'invitedBy', coalesce(p.display_name, split_part(u.email, '@', 1)),
    'members', (select count(*) from public.group_members m where m.group_id = i.group_id)
  ) order by i.created_at desc), '[]'::jsonb)
  from public.group_invites i
  join public.groups gr on gr.id = i.group_id
  left join auth.users u on u.id = i.invited_by
  left join public.profiles p on p.user_id = i.invited_by
  where i.email = lower(auth.email())
    and i.expires_at > now()
    and not public.is_group_member(i.group_id);
$$;

-- Принять приглашение
create or replace function public.accept_invite(p_invite uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  select group_id into gid from public.group_invites
  where id = p_invite and email = lower(auth.email()) and expires_at > now();
  if gid is null then raise exception 'invite_not_found' using errcode = 'P0001'; end if;
  insert into public.group_members (group_id, user_id) values (gid, auth.uid()) on conflict do nothing;
  delete from public.group_invites where id = p_invite;
  return gid;
end;
$$;

-- Отклонить приглашение
create or replace function public.decline_invite(p_invite uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.group_invites where id = p_invite and email = lower(auth.email());
$$;

-- Выйти из группы. Возвращает true, если группа удалена (вышел последний)
create or replace function public.leave_group(p_group uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.group_members where group_id = p_group and user_id = auth.uid();
  return not exists (select 1 from public.groups where id = p_group);
end;
$$;

-- Имя пользователя
create or replace function public.set_display_name(p_name text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set display_name = nullif(left(btrim(p_name), 40), '') where user_id = auth.uid();
$$;

revoke all on function
  public.create_group(text), public.invite_to_group(uuid, text), public.my_groups(), public.my_invites(),
  public.accept_invite(uuid), public.decline_invite(uuid), public.leave_group(uuid), public.set_display_name(text),
  public.is_group_member(uuid), public.shares_group_with(uuid)
from public, anon;
grant execute on function
  public.create_group(text), public.invite_to_group(uuid, text), public.my_groups(), public.my_invites(),
  public.accept_invite(uuid), public.decline_invite(uuid), public.leave_group(uuid), public.set_display_name(text),
  public.is_group_member(uuid), public.shares_group_with(uuid)
to authenticated;
