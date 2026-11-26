-- Run only against a test project or a project where these synthetic IDs do not exist.
-- All test users and backups are rolled back.
begin;

insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'ping-a@example.invalid', '', now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'ping-b@example.invalid', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  a constant uuid := '00000000-0000-4000-8000-000000000001';
  b constant uuid := '00000000-0000-4000-8000-000000000002';
  payload constant jsonb := '{"format":"ping-points-backup","version":1,"data":{"profile":null,"matches":[],"players":[]}}';
  visible_count integer;
begin
  if public.ping_save_backup(a, null, payload) <> 1 then
    raise exception 'First save did not create version 1';
  end if;
  select count(*) into visible_count from public.ping_backups;
  if visible_count <> 1 then raise exception 'Owner cannot read own backup'; end if;

  begin
    perform public.ping_save_backup(a, null, payload);
    raise exception 'An existing backup was overwritten without its version';
  exception when serialization_failure then null;
  end;
  begin
    delete from public.ping_backups;
    raise exception 'Direct deletion was allowed';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
  select count(*) into visible_count from public.ping_backups;
  if visible_count <> 0 then raise exception 'Another user can read the backup'; end if;
  begin
    perform public.ping_save_backup(a, 1, payload);
    raise exception 'Another user could overwrite the backup';
  exception when insufficient_privilege then null;
  end;
  if public.ping_save_backup(b, null, payload) <> 1 then
    raise exception 'Second user could not create own backup';
  end if;
  select count(*) into visible_count from public.ping_backups;
  if visible_count <> 1 then raise exception 'Isolation failed'; end if;

  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  if public.ping_save_backup(a, 1, payload) <> 2 then
    raise exception 'Versioned update failed';
  end if;
  begin
    perform public.ping_save_backup(a, 1, payload);
    raise exception 'A stale version overwrote the backup';
  exception when serialization_failure then null;
  end;
end;
$$;

rollback;
