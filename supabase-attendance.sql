begin;

alter table public.ping_practices
  add column capacity integer not null default 1 check (capacity between 1 and 30);

create table public.ping_practice_attendance (
  practice_id uuid not null references public.ping_practices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (practice_id, user_id)
);
alter table public.ping_practice_attendance enable row level security;
revoke all on public.ping_practice_attendance from public, anon, authenticated;

create function public.ping_create_practice_with_capacity(
  p_title text, p_starts_at timestamptz, p_city text, p_venue text, p_goal text,
  p_wheelchair text, p_fee text, p_equipment text, p_changing text, p_beginners text, p_capacity integer
) returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $$
declare result uuid;
begin
  if p_capacity is null or p_capacity not between 1 and 30 then
    raise exception 'Nombre de places invalide' using errcode = '22023';
  end if;
  result := public.ping_create_practice(p_title, p_starts_at, p_city, p_venue, p_goal,
    p_wheelchair, p_fee, p_equipment, p_changing, p_beginners);
  update public.ping_practices set capacity = p_capacity where id = result;
  return result;
end;
$$;

create or replace function public.ping_list_practices(p_id uuid default null)
returns table(id uuid, owner_id uuid, display_name text, title text, starts_at timestamptz, city text, venue text,
  goal text, wheelchair text, fee text, equipment text, changing text, beginners text)
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  return query select s.id, s.owner_id, coalesce(d.display_name, 'Profil privé'), s.title, s.starts_at, s.city, s.venue,
    s.goal, s.wheelchair, s.fee, s.equipment, s.changing, s.beginners
    from public.ping_practices s left join public.ping_directory d on d.owner_id = s.owner_id and d.published
    where (s.starts_at > now() or (s.owner_id = auth.uid() and p_id is null))
      and (d.published or s.owner_id = auth.uid())
      and (s.owner_id = auth.uid() or (p_id is not null and s.id = p_id)
        or (p_id is null and exists (select 1 from public.ping_practice_preferences p where p.owner_id = auth.uid() and p.alerts))
        or (p_id is null and exists (select 1 from public.ping_practice_attendance a where a.practice_id = s.id and a.user_id = auth.uid())))
      and (p_id is null or s.id = p_id)
      and not exists (select 1 from public.ping_blocks b where (b.blocker = auth.uid() and b.blocked = s.owner_id) or (b.blocker = s.owner_id and b.blocked = auth.uid()))
    order by (s.owner_id = auth.uid()) desc, (s.starts_at > now()) desc, s.starts_at limit 50;
end;
$$;

create function public.ping_practice_availability(p_ids uuid[])
returns table(id uuid, capacity integer, attendees bigint, joined boolean)
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  if p_ids is null or cardinality(p_ids) > 51 then raise exception 'Liste invalide' using errcode = '22023'; end if;
  return query select s.id, s.capacity, count(a.user_id), coalesce(bool_or(a.user_id = auth.uid()), false)
    from public.ping_practices s
    left join public.ping_practice_attendance a on a.practice_id = s.id
    where s.id = any(p_ids) and (
      exists (select 1 from public.ping_list_practices(s.id))
      or (s.owner_id = auth.uid() and exists (select 1 from public.ping_list_practices(null) p where p.id = s.id))
    )
    group by s.id, s.capacity;
end;
$$;

create function public.ping_set_practice_attendance(p_id uuid, p_join boolean)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); host uuid; places integer; starts timestamptz;
begin
  if me is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  if p_id is null or p_join is null then raise exception 'Demande invalide' using errcode = '22023'; end if;
  if not p_join then
    delete from public.ping_practice_attendance where practice_id = p_id and user_id = me;
    return;
  end if;
  select s.owner_id into host from public.ping_practices s where s.id = p_id;
  if host is null or host = me then raise exception 'Inscription impossible' using errcode = '22023'; end if;
  perform public.ping_lock_social_pair(me, host);
  select s.capacity, s.starts_at into places, starts from public.ping_practices s where s.id = p_id for update;
  if not found or starts <= now() or not exists (select 1 from public.ping_list_practices(p_id)) then
    raise exception 'Séance indisponible' using errcode = '42501';
  end if;
  if exists (select 1 from public.ping_practice_attendance a where a.practice_id = p_id and a.user_id = me) then return; end if;
  if (select count(*) from public.ping_practice_attendance a where a.practice_id = p_id) >= places then
    raise exception 'Cette séance est complète' using errcode = 'P0001';
  end if;
  insert into public.ping_practice_attendance(practice_id, user_id) values (p_id, me);
end;
$$;

create function public.ping_clear_blocked_attendance()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  delete from public.ping_practice_attendance a using public.ping_practices s
    where a.practice_id = s.id and
      ((s.owner_id = new.blocker and a.user_id = new.blocked)
        or (s.owner_id = new.blocked and a.user_id = new.blocker));
  return new;
end;
$$;
create trigger ping_block_clears_attendance after insert on public.ping_blocks
  for each row execute function public.ping_clear_blocked_attendance();

revoke all on function public.ping_create_practice_with_capacity(text,timestamptz,text,text,text,text,text,text,text,text,integer),
  public.ping_practice_availability(uuid[]), public.ping_set_practice_attendance(uuid,boolean),
  public.ping_clear_blocked_attendance() from public, anon, authenticated;
grant execute on function public.ping_create_practice_with_capacity(text,timestamptz,text,text,text,text,text,text,text,text,integer),
  public.ping_practice_availability(uuid[]), public.ping_set_practice_attendance(uuid,boolean) to authenticated;

commit;
