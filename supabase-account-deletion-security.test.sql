-- Run inside a transaction and roll back all synthetic data.
insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at, last_sign_in_at) values
('00000000-0000-4000-8000-000000000061', 'authenticated', 'authenticated', 'deletion-a@example.invalid', '', now(), now(), now()),
('00000000-0000-4000-8000-000000000062', 'authenticated', 'authenticated', 'deletion-b@example.invalid', '', now(), now(), now() - interval '1 hour');
insert into auth.sessions (id, user_id, created_at, updated_at) values
('00000000-0000-4000-8000-000000000063', '00000000-0000-4000-8000-000000000061', now(), now()),
('00000000-0000-4000-8000-000000000064', '00000000-0000-4000-8000-000000000061', now() - interval '1 hour', now()),
('00000000-0000-4000-8000-000000000065', '00000000-0000-4000-8000-000000000062', now() - interval '1 hour', now());
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000062',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000062","role":"authenticated","session_id":"00000000-0000-4000-8000-000000000065"}',true);
do $$
begin
  begin
    perform public.ping_delete_own_account();
    raise exception 'Old session was allowed to delete account' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
end;
$$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000061',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000061","role":"authenticated","session_id":"00000000-0000-4000-8000-000000000064"}',true);
do $$
begin
  begin
    perform public.ping_delete_own_account();
    raise exception 'Old device session was allowed to delete account' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
end;
$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000061","role":"authenticated","session_id":"00000000-0000-4000-8000-000000000063"}',true);
select public.ping_publish_social_profile(null, 'Suppression A', null, null, null, null, null, 'public', null, null);
select public.ping_delete_own_account();
reset role;
do $$
begin
  if exists (select 1 from auth.users where id = '00000000-0000-4000-8000-000000000061')
    or exists (select 1 from public.ping_directory where owner_id = '00000000-0000-4000-8000-000000000061')
    or not exists (select 1 from auth.users where id = '00000000-0000-4000-8000-000000000062') then
    raise exception 'Account deletion did not isolate and cascade correctly';
  end if;
end;
$$;
set local role anon;
do $$
begin
  begin
    perform public.ping_delete_own_account();
    raise exception 'Anonymous deletion allowed' using errcode = 'XX000';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
