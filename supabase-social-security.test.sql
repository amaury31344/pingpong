-- Run inside the migration transaction; these synthetic users are rolled back.
insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at) values
('00000000-0000-4000-8000-000000000021', 'authenticated', 'authenticated', 'ping-social-a@example.invalid', '', now(), now()),
('00000000-0000-4000-8000-000000000022', 'authenticated', 'authenticated', 'ping-social-b@example.invalid', '', now(), now()),
('00000000-0000-4000-8000-000000000023', 'authenticated', 'authenticated', 'ping-social-c@example.invalid', '', now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000021',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000021","role":"authenticated"}',true);
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-000000000021';
  b constant uuid := '00000000-0000-4000-8000-000000000022';
  c constant uuid := '00000000-0000-4000-8000-000000000023';
  n integer;
  i integer;
begin
  begin
    perform count(*) from public.ping_messages;
    raise exception 'Direct access to messages allowed' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
  perform public.ping_publish_social_profile(null, 'Social Alpha 9711', null, null, null, null, null, 'public', 'bio', 'data:image/jpeg;base64,/9j/2Q==');
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform public.ping_publish_social_profile(null, 'Social Bravo 9711', null, null, null, null, null, 'accounts', null, null);
  perform public.ping_request_friend(a);
  begin
    perform public.ping_send_message(a, 'pending');
    raise exception 'Pending requester could message' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
  begin
    perform public.ping_respond_friend(a, true);
    raise exception 'Requester accepted own request' using errcode = 'XX000';
  exception when raise_exception then
    if sqlerrm <> 'Demande introuvable' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform public.ping_respond_friend(b, true);
  perform public.ping_send_message(b, 'Bonjour test');
  for i in 1..19 loop perform public.ping_send_message(b, 'Message de test'); end loop;
  begin
    perform public.ping_send_message(b, 'un de trop');
    raise exception 'Message rate limit missing' using errcode = 'XX000';
  exception when raise_exception then
    if sqlerrm <> 'Trop de messages : attends une minute' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', b::text, true);
  select count(*) into n from public.ping_read_messages(a) where body = 'Bonjour test';
  if n <> 1 then raise exception 'Friend cannot read message'; end if;
  perform set_config('request.jwt.claim.sub', c::text, true);
  perform public.ping_publish_social_profile(null, 'Social Charlie 9711', null, null, null, null, null, 'public', 'bio publique', null);
  begin
    if not exists (select 1 from public.ping_search_social_profiles('Social Charlie 9711') where bio = 'bio publique') then
      raise exception 'Public profile not visible anonymously';
    end if;
    perform count(*) from public.ping_read_messages(a);
    raise exception 'Third party could read messages' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform public.ping_block_user(a);
  perform set_config('request.jwt.claim.sub', a::text, true);
  begin
    perform public.ping_send_message(b, 'blocked');
    raise exception 'Blocked sender could message' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
  perform public.ping_unpublish_directory(1);
  if exists (select 1 from public.ping_my_social_profile() where published or bio is not null or photo is not null) then
    raise exception 'Private profile retained shared data';
  end if;
end;
$$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
do $$
begin
  if exists (select 1 from public.ping_search_social_profiles('Social Bravo 9711')) then
    raise exception 'Account-only profile visible anonymously';
  end if;
  begin
    perform public.ping_list_social();
    raise exception 'Anonymous social access allowed' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
