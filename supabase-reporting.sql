begin;

create table public.ping_message_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  message_id bigint not null,
  message_body text not null,
  message_created_at timestamptz not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (reporter_id, message_id)
);
alter table public.ping_message_reports enable row level security;
revoke all on public.ping_message_reports from public, anon, authenticated;

create function public.ping_report_message(p_message_id bigint)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); peer uuid; reported public.ping_messages%rowtype;
begin
  if me is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  select * into reported from public.ping_messages m
    where m.id = p_message_id and (m.user_low = me or m.user_high = me) and m.sender <> me;
  if not found then raise exception 'Message introuvable' using errcode = 'P0001'; end if;
  peer := reported.sender;
  perform pg_advisory_xact_lock(hashtextextended('ping-report:' || me::text, 0));
  perform public.ping_lock_social_pair(me, peer);
  select * into reported from public.ping_messages m where m.id = p_message_id and m.sender = peer
    and (m.user_low = me or m.user_high = me);
  if not found or not exists (select 1 from public.ping_friendships f
      where f.user_low = least(me, peer) and f.user_high = greatest(me, peer) and f.accepted)
    or exists (select 1 from public.ping_blocks b where (b.blocker = me and b.blocked = peer) or (b.blocker = peer and b.blocked = me))
    then raise exception 'Message indisponible' using errcode = '42501'; end if;
  if (select count(*) from public.ping_message_reports r where r.reporter_id = me and r.created_at > now() - interval '1 day') >= 10 then
    raise exception 'Trop de signalements : réessaie demain' using errcode = 'P0001';
  end if;
  insert into public.ping_message_reports(reporter_id, reported_user_id, message_id, message_body, message_created_at)
    values (me, peer, reported.id, reported.body, reported.created_at);
exception when unique_violation then
  raise exception 'Ce message a déjà été signalé' using errcode = 'P0001';
end;
$$;

revoke all on function public.ping_report_message(bigint) from public, anon, authenticated;
grant execute on function public.ping_report_message(bigint) to authenticated;

commit;
