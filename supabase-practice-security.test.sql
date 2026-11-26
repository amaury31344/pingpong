-- Synthetic users and all changes must be rolled back.
insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at) values
('00000000-0000-4000-8000-000000000031', 'authenticated', 'authenticated', 'practice-a@example.invalid', '', now(), now()),
('00000000-0000-4000-8000-000000000032', 'authenticated', 'authenticated', 'practice-b@example.invalid', '', now(), now()),
('00000000-0000-4000-8000-000000000033', 'authenticated', 'authenticated', 'practice-c@example.invalid', '', now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000031',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000031","role":"authenticated"}',true);
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-000000000031';
  b constant uuid := '00000000-0000-4000-8000-000000000032';
  c constant uuid := '00000000-0000-4000-8000-000000000033';
  practice uuid;
begin
  begin
    perform count(*) from public.ping_practice_preferences;
    raise exception 'Direct access to preferences allowed' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
  perform public.ping_publish_social_profile(null, 'Practice A', null, null, null, null, null, 'public', null, null);
  perform public.ping_save_practice_preferences(true, true, array[1,2], 'evening', 'resume', 500, 48.8566, 2.3522);
  practice := public.ping_create_practice('Reprise', now() + interval '1 day', 'Paris', 'Salle municipale', 'resume', 'unknown', 'Gratuit', 'yes', 'unknown', 'yes');
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform public.ping_publish_social_profile(null, 'Practice B', null, null, null, null, null, 'public', null, null);
  if exists (select 1 from public.ping_list_practices(null)) then raise exception 'Alert not opted in'; end if;
  if not exists (select 1 from public.ping_list_practices(practice)) then raise exception 'Invitation unavailable'; end if;
  begin
    perform public.ping_delete_practice(practice);
    raise exception 'Another user deleted a session' using errcode = 'XX000';
  exception when raise_exception then if sqlerrm <> 'Séance introuvable' then raise; end if; end;
  perform public.ping_save_practice_preferences(true, true, array[2,3], 'evening', 'resume', 550, 48.86, 2.36);
  if not exists (select 1 from public.ping_list_practices(null) where id = practice) then raise exception 'Opted-in alerts missing'; end if;
  if not exists (select 1 from public.ping_practice_recommendations() where user_id = a and shared_days = array[2] and same_period and same_goal and level_difference = 50 and distance_km <= 50 and score = 4) then
    raise exception 'Expected recommendation missing';
  end if;
  perform set_config('request.jwt.claim.sub', c::text, true);
  if exists (select 1 from public.ping_practice_recommendations()) then raise exception 'Non-participant recommendations available'; end if;
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform public.ping_block_user(a);
  if exists (select 1 from public.ping_practice_recommendations()) or exists (select 1 from public.ping_list_practices(practice)) then
    raise exception 'Blocked user remains visible';
  end if;
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform public.ping_delete_practice(practice);
  if exists (select 1 from public.ping_list_practices(practice)) then raise exception 'Deleted practice remains visible'; end if;
end;
$$;
reset role;
set local role anon;
do $$
begin
  begin
    perform public.ping_list_practices(null);
    raise exception 'Anonymous practice access allowed' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
