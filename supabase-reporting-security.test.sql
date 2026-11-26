-- Run inside a transaction and roll back all synthetic data.
insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at) values
('00000000-0000-4000-8000-000000000051', 'authenticated', 'authenticated', 'report-a@example.invalid', '', now(), now()),
('00000000-0000-4000-8000-000000000052', 'authenticated', 'authenticated', 'report-b@example.invalid', '', now(), now()),
('00000000-0000-4000-8000-000000000053', 'authenticated', 'authenticated', 'report-c@example.invalid', '', now(), now());
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000051',true);
do $$
declare
  a constant uuid := '00000000-0000-4000-8000-000000000051';
  b constant uuid := '00000000-0000-4000-8000-000000000052';
  c constant uuid := '00000000-0000-4000-8000-000000000053';
  msg bigint;
begin
  begin
    perform count(*) from public.ping_message_reports;
    raise exception 'Direct report access allowed' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
  perform public.ping_publish_social_profile(null, 'Report A', null, null, null, null, null, 'public', null, null);
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform public.ping_publish_social_profile(null, 'Report B', null, null, null, null, null, 'public', null, null);
  perform public.ping_request_friend(a);
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform public.ping_respond_friend(b, true);
  msg := public.ping_send_message(b, 'Message de test');
  begin
    perform public.ping_report_message(msg);
    raise exception 'Own message could be reported' using errcode = 'XX000';
  exception when raise_exception then if sqlerrm <> 'Message introuvable' then raise; end if; end;
  perform set_config('request.jwt.claim.sub', c::text, true);
  begin
    perform public.ping_report_message(msg);
    raise exception 'Unrelated user could report message' using errcode = 'XX000';
  exception when raise_exception then if sqlerrm <> 'Message introuvable' then raise; end if; end;
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform public.ping_report_message(msg);
  begin
    perform public.ping_report_message(msg);
    raise exception 'Duplicate report allowed' using errcode = 'XX000';
  exception when raise_exception then if sqlerrm <> 'Ce message a déjà été signalé' then raise; end if; end;
  perform public.ping_block_user(a);
end;
$$;
reset role;
do $$
begin
  if not exists (select 1 from public.ping_message_reports where message_body = 'Message de test') then
    raise exception 'Evidence disappeared after blocking';
  end if;
end;
$$;
set local role anon;
do $$
begin
  begin
    perform public.ping_report_message(1);
    raise exception 'Anonymous reporting allowed' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
