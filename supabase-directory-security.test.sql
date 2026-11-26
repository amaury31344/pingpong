-- Synthetic users and profile changes are rolled back.
begin;
insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'ping-directory-a@example.invalid', '', now(), now()),
  ('00000000-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'ping-directory-b@example.invalid', '', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000011","role":"authenticated"}', true);

do $$
declare
  b constant uuid := '00000000-0000-4000-8000-000000000012';
  visible_count integer;
begin
  select count(*) into visible_count from public.ping_search_directory('Joueur fictif 12345');
  if visible_count <> 0 then raise exception 'An unpublished profile is visible'; end if;
  begin
    perform count(*) from public.ping_directory;
    raise exception 'Direct directory access was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.ping_publish_directory(null, 'A', null, null, null, null, null);
    raise exception 'Invalid name accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.ping_publish_directory(null, 'Joueur fictif 12345', null, null, null, null,
      '[{"date":"2026-09-01","result":"win","kind":"official","opponent":"secret"}]');
    raise exception 'Private match field accepted';
  exception when invalid_parameter_value then null;
  end;
  perform public.ping_publish_directory(null, 'Joueur fictif 12345', 'Club test', 600, 2, 1,
    '[{"date":"2026-09-01","result":"win","kind":"official"}]');
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000012","role":"authenticated"}', true);
  select count(*) into visible_count from public.ping_search_directory('Joueur fictif 12345');
  if visible_count <> 1 then raise exception 'Published profile not visible'; end if;
  perform public.ping_unpublish_directory(null);
  select count(*) into visible_count from public.ping_search_directory('Joueur fictif 12345');
  if visible_count <> 1 then raise exception 'Another user could remove the profile'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000011', true);
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000011","role":"authenticated"}', true);
  perform public.ping_unpublish_directory(1);
  select count(*) into visible_count from public.ping_search_directory('Joueur fictif 12345');
  if visible_count <> 0 then raise exception 'Withdrawal failed'; end if;
  begin
    perform public.ping_publish_directory(1, 'Joueur fictif 12345', null, null, null, null, null);
    raise exception 'Stale publication restored a withdrawn profile' using errcode = 'XX000';
  exception when raise_exception then
    if sqlerrm <> 'Le profil partagé a changé, recommence' then raise; end if;
  end;
  if exists (select 1 from public.ping_my_directory_profile() where published or display_name is not null or recent_matches is not null) then
    raise exception 'Withdrawal retained published data';
  end if;
end;
$$;

reset role;
set local role anon;
do $$
begin
  begin
    perform public.ping_search_directory('Joueur');
    raise exception 'Anonymous search was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.ping_publish_directory(null, 'Joueur', null, null, null, null, null);
    raise exception 'Anonymous publication was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.ping_unpublish_directory(null);
    raise exception 'Anonymous withdrawal was allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
