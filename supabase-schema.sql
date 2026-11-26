begin;

create table public.ping_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.ping_backups enable row level security;
revoke all on public.ping_backups from public, anon, authenticated;
grant select on public.ping_backups to authenticated;

create policy "Users read their own backup"
  on public.ping_backups for select to authenticated
  using ((select auth.uid()) = user_id);

create function public.ping_save_backup(
  p_user_id uuid,
  p_expected_version bigint,
  p_payload jsonb
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  saved_version bigint;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'Session invalide' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or p_payload->>'format' is distinct from 'ping-points-backup'
     or p_payload->'version' is distinct from '1'::jsonb
     or jsonb_typeof(p_payload->'data') is distinct from 'object'
     or jsonb_typeof(p_payload->'data'->'matches') is distinct from 'array'
     or jsonb_typeof(p_payload->'data'->'players') is distinct from 'array'
     or octet_length(p_payload::text) > 5242880 then
    raise exception 'Sauvegarde invalide ou trop volumineuse' using errcode = '22023';
  end if;

  if p_expected_version is null then
    insert into public.ping_backups (user_id, payload)
    values (p_user_id, p_payload)
    on conflict (user_id) do nothing
    returning version into saved_version;
  else
    update public.ping_backups
    set payload = p_payload, version = version + 1, updated_at = now()
    where user_id = p_user_id and version = p_expected_version
    returning version into saved_version;
  end if;

  if saved_version is null then
    raise exception 'La sauvegarde en ligne a changé, recommence' using errcode = '40001';
  end if;
  return saved_version;
end;
$$;

revoke all on function public.ping_save_backup(uuid, bigint, jsonb) from public, anon;
grant execute on function public.ping_save_backup(uuid, bigint, jsonb) to authenticated;

commit;
