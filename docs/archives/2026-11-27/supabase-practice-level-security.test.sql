-- Execute after the migration, inside a transaction that will be rolled back.
insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at) values
('00000000-0000-4000-8000-000000000051', 'authenticated', 'authenticated', 'level-a@example.invalid', '', now(), now()),
('00000000-0000-4000-8000-000000000052', 'authenticated', 'authenticated', 'level-b@example.invalid', '', now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000051',true);
do $$
declare practice uuid;
begin
  perform public.ping_publish_social_profile(null, 'Level A', null, null, null, null, null, 'public', null, null);
  begin
    perform public.ping_create_practice_with_level('Test', now() + interval '1 day', 'Lille', 'Salle', 'training', 'unknown', 'Gratuit', 'unknown', 'unknown', 'unknown', 1, 900, 600);
    raise exception 'Invalid range accepted' using errcode = 'XX000';
  exception when invalid_parameter_value then null; end;
  practice := public.ping_create_practice_with_level('Test', now() + interval '1 day', 'Lille', 'Salle', 'training', 'unknown', 'Gratuit', 'unknown', 'unknown', 'unknown', 1, 500, 900);
  if not exists (select 1 from public.ping_practice_levels(array[practice]) where level_min = 500 and level_max = 900) then
    raise exception 'Owner cannot see level range';
  end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000052',true);
  if not exists (select 1 from public.ping_practice_levels(array[practice]) where level_min = 500 and level_max = 900) then
    raise exception 'Invitation cannot see level range';
  end if;
  perform public.ping_publish_social_profile(null, 'Level B', null, null, null, null, null, 'public', null, null);
  perform public.ping_block_user('00000000-0000-4000-8000-000000000051'::uuid);
  if exists (select 1 from public.ping_practice_levels(array[practice])) then
    raise exception 'Blocked user can see level range';
  end if;
end;
$$;
reset role;
set local role anon;
do $$
begin
  begin
    perform public.ping_practice_levels(array[]::uuid[]);
    raise exception 'Anonymous access allowed' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
