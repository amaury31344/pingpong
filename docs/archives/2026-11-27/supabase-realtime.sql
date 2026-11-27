begin;

create table public.ping_realtime_events (
  id bigint generated always as identity primary key,
  recipient uuid not null references auth.users(id) on delete cascade,
  peer uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in ('message', 'attendance')),
  created_at timestamptz not null default now()
);
create index ping_realtime_events_recipient_created on public.ping_realtime_events(recipient, created_at);
alter table public.ping_realtime_events enable row level security;
revoke all on public.ping_realtime_events from public, anon, authenticated;
grant select on public.ping_realtime_events to authenticated;
create policy ping_realtime_own_events on public.ping_realtime_events
  for select to authenticated using (recipient = auth.uid());

create function public.ping_signal_message()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
declare receiver uuid := case when new.sender = new.user_low then new.user_high else new.user_low end;
begin
  delete from public.ping_realtime_events where recipient = receiver and created_at < now() - interval '7 days';
  insert into public.ping_realtime_events(recipient, peer, kind) values (receiver, new.sender, 'message');
  return new;
end;
$$;

create function public.ping_signal_attendance()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
declare host uuid;
begin
  select owner_id into host from public.ping_practices where id = coalesce(new.practice_id, old.practice_id);
  if host is not null then
    delete from public.ping_realtime_events where recipient = host and created_at < now() - interval '7 days';
    insert into public.ping_realtime_events(recipient, kind) values (host, 'attendance');
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.ping_signal_message(), public.ping_signal_attendance() from public, anon, authenticated;
create trigger ping_signal_new_message after insert on public.ping_messages
  for each row execute function public.ping_signal_message();
create trigger ping_signal_practice_attendance after insert or delete on public.ping_practice_attendance
  for each row execute function public.ping_signal_attendance();
alter publication supabase_realtime add table public.ping_realtime_events;

commit;
