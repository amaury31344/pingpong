-- Run inside a transaction and roll back all synthetic data.
insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at) values
('00000000-0000-4000-8000-000000000071', 'authenticated', 'authenticated', 'notify-a@example.invalid', '', now(), now()),
('00000000-0000-4000-8000-000000000072', 'authenticated', 'authenticated', 'notify-b@example.invalid', '', now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000071',true);
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-000000000071';
  b constant uuid := '00000000-0000-4000-8000-000000000072';
  message_id bigint;
  practice uuid;
begin
  perform public.ping_publish_social_profile(null, 'Notify A', null, null, null, null, null, 'public', null, null);
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform public.ping_publish_social_profile(null, 'Notify B', null, null, null, null, null, 'public', null, null);
  perform public.ping_request_friend(a);
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform public.ping_respond_friend(b, true);
  message_id := public.ping_send_message(b, 'Message privé');
  practice := public.ping_create_practice('Test', now() + interval '1 day', 'Paris', 'Salle', 'resume', 'unknown', 'Gratuit', 'yes', 'unknown', 'yes');
  perform set_config('request.jwt.claim.sub', b::text, true);
  if not exists (select 1 from public.ping_notification_snapshot() where latest_message = message_id::text and latest_practice is null) then
    raise exception 'Message missing or alerts bypassed opt-in';
  end if;
  perform public.ping_save_practice_preferences(false, true, array[]::integer[], null, null, null, null, null);
  if not exists (select 1 from public.ping_notification_snapshot() where latest_message = message_id::text and latest_practice = practice) then
    raise exception 'Opted-in practice alert missing';
  end if;
  perform public.ping_block_user(a);
  if not exists (select 1 from public.ping_notification_snapshot() where latest_message is null and latest_practice is null) then
    raise exception 'Blocked content still visible';
  end if;
end;
$$;
reset role;
set local role anon;
do $$
begin
  begin
    perform public.ping_notification_snapshot();
    raise exception 'Anonymous notification access allowed' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
