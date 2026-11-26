-- Run inside a transaction and roll back all synthetic data.
insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at) values
('00000000-0000-4000-8000-000000000041', 'authenticated', 'authenticated', 'attendance-a@example.invalid', '', now(), now()),
('00000000-0000-4000-8000-000000000042', 'authenticated', 'authenticated', 'attendance-b@example.invalid', '', now(), now()),
('00000000-0000-4000-8000-000000000043', 'authenticated', 'authenticated', 'attendance-c@example.invalid', '', now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000041',true);
do $$
declare
  host constant uuid := '00000000-0000-4000-8000-000000000041';
  guest constant uuid := '00000000-0000-4000-8000-000000000042';
  other_guest constant uuid := '00000000-0000-4000-8000-000000000043';
  practice uuid;
begin
  begin
    perform count(*) from public.ping_practice_attendance;
    raise exception 'Direct access allowed' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
  perform public.ping_publish_social_profile(null, 'Attendance A', null, null, null, null, null, 'public', null, null);
  practice := public.ping_create_practice_with_capacity('Séance', now() + interval '1 day', 'Paris', 'Salle', 'resume', 'unknown', 'Gratuit', 'yes', 'unknown', 'yes', 1);
  begin
    perform public.ping_set_practice_attendance(practice, true);
    raise exception 'Host joined own session' using errcode = 'XX000';
  exception when invalid_parameter_value then null; end;
  perform set_config('request.jwt.claim.sub', guest::text, true);
  perform public.ping_set_practice_attendance(practice, true);
  perform public.ping_set_practice_attendance(practice, true);
  if not exists (select 1 from public.ping_practice_availability(array[practice]) where attendees = 1 and capacity = 1 and joined) then
    raise exception 'Joined place not visible';
  end if;
  if not exists (select 1 from public.ping_list_practices(null) where id = practice) then
    raise exception 'Joined session absent with alerts disabled';
  end if;
  perform set_config('request.jwt.claim.sub', other_guest::text, true);
  begin
    perform public.ping_set_practice_attendance(practice, true);
    raise exception 'Full session accepted a second guest' using errcode = 'XX000';
  exception when raise_exception then if sqlerrm <> 'Cette séance est complète' then raise; end if; end;
  perform set_config('request.jwt.claim.sub', guest::text, true);
  perform public.ping_set_practice_attendance(practice, false);
  perform set_config('request.jwt.claim.sub', other_guest::text, true);
  perform public.ping_set_practice_attendance(practice, true);
  perform set_config('request.jwt.claim.sub', host::text, true);
  perform public.ping_block_user(other_guest);
  if not exists (select 1 from public.ping_practice_availability(array[practice]) where attendees = 0 and not joined) then
    raise exception 'Blocking did not free the place';
  end if;
  perform set_config('request.jwt.claim.sub', other_guest::text, true);
  if exists (select 1 from public.ping_practice_availability(array[practice])) then
    raise exception 'Blocked user can see availability';
  end if;
  begin
    perform public.ping_set_practice_attendance(practice, true);
    raise exception 'Blocked user joined' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub', host::text, true);
  perform public.ping_delete_practice(practice);
end;
$$;
reset role;
set local role anon;
do $$
begin
  begin
    perform public.ping_practice_availability(array[]::uuid[]);
    raise exception 'Anonymous access allowed' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
