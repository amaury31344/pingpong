begin;

create function public.ping_notification_snapshot()
returns table(latest_message text, latest_practice uuid, practice_created_at timestamptz, observed_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  return query
    select
      (select max(m.id)::text from public.ping_messages m
        join public.ping_friendships f on f.user_low = m.user_low and f.user_high = m.user_high and f.accepted
        where (m.user_low = me or m.user_high = me) and m.sender <> me
          and not exists (select 1 from public.ping_blocks b where
            (b.blocker = me and b.blocked = m.sender) or (b.blocker = m.sender and b.blocked = me))),
      latest.id, latest.created_at, clock_timestamp()
    from (select 1) dummy
    left join lateral (
      select s.id, s.created_at from public.ping_practices s
      join public.ping_directory d on d.owner_id = s.owner_id and d.published
      where s.owner_id <> me and s.starts_at > now()
        and exists (select 1 from public.ping_practice_preferences p where p.owner_id = me and p.alerts)
        and not exists (select 1 from public.ping_blocks b where
          (b.blocker = me and b.blocked = s.owner_id) or (b.blocker = s.owner_id and b.blocked = me))
      order by s.created_at desc, s.id desc limit 1
    ) latest on true;
end;
$$;
revoke all on function public.ping_notification_snapshot() from public, anon, authenticated;
grant execute on function public.ping_notification_snapshot() to authenticated;

commit;
