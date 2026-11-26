begin;

create table public.ping_practice_preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  discoverable boolean not null default false,
  alerts boolean not null default false,
  days integer[] not null default '{}',
  period text,
  goal text,
  level numeric,
  latitude numeric,
  longitude numeric,
  updated_at timestamptz not null default now()
);

create table public.ping_practices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  city text not null,
  venue text not null,
  goal text not null,
  wheelchair text not null,
  fee text not null,
  equipment text not null,
  changing text not null,
  beginners text not null,
  created_at timestamptz not null default now()
);

alter table public.ping_practice_preferences enable row level security;
alter table public.ping_practices enable row level security;
revoke all on public.ping_practice_preferences, public.ping_practices from public, anon, authenticated;

create function public.ping_save_practice_preferences(
  p_discoverable boolean, p_alerts boolean, p_days integer[], p_period text,
  p_goal text, p_level numeric, p_latitude numeric, p_longitude numeric
) returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  if p_discoverable is null or p_alerts is null or p_days is null
    or cardinality(p_days) > 7 or exists (select 1 from unnest(p_days) day where day is null or day not between 1 and 7)
    or (p_period is not null and p_period not in ('morning','afternoon','evening'))
    or (p_goal is not null and p_goal not in ('training','competition','resume','leisure'))
    or (p_level is not null and (p_level < 0 or p_level > 5000 or p_level = 'NaN'::numeric))
    or ((p_latitude is null) <> (p_longitude is null))
    or (p_latitude is not null and (p_latitude < -90 or p_latitude > 90 or p_latitude = 'NaN'::numeric))
    or (p_longitude is not null and (p_longitude < -180 or p_longitude > 180 or p_longitude = 'NaN'::numeric))
    then raise exception 'Préférences invalides' using errcode = '22023'; end if;
  if p_discoverable and not exists (select 1 from public.ping_directory d where d.owner_id = me and d.published) then
    raise exception 'Publie un profil avant de proposer des recommandations' using errcode = '42501';
  end if;
  insert into public.ping_practice_preferences(owner_id, discoverable, alerts, days, period, goal, level, latitude, longitude)
  values (me, p_discoverable, p_alerts, p_days, p_period, p_goal, p_level, round(p_latitude, 1), round(p_longitude, 1))
  on conflict (owner_id) do update set discoverable = excluded.discoverable, alerts = excluded.alerts,
    days = excluded.days, period = excluded.period, goal = excluded.goal, level = excluded.level,
    latitude = excluded.latitude, longitude = excluded.longitude, updated_at = now();
end;
$$;

create function public.ping_my_practice_preferences()
returns table(discoverable boolean, alerts boolean, days integer[], period text, goal text, level numeric, latitude numeric, longitude numeric)
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  return query select p.discoverable, p.alerts, p.days, p.period, p.goal, p.level, p.latitude, p.longitude
    from public.ping_practice_preferences p where p.owner_id = auth.uid();
end;
$$;

create function public.ping_practice_recommendations(p_resume_only boolean default false)
returns table(user_id uuid, display_name text, shared_days integer[], same_period boolean,
  same_goal boolean, level_difference numeric, distance_km numeric, score integer)
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  if p_resume_only is null then raise exception 'Filtre invalide' using errcode = '22023'; end if;
  return query
  with candidates as (
    select q.owner_id, d.display_name,
      array(select distinct day from unnest(p.days) day where day = any(q.days) order by day) as common_days,
      coalesce(p.period = q.period, false) as common_period,
      coalesce(p.goal = q.goal, false) as common_goal,
      case when p.level is not null and q.level is not null then abs(p.level - q.level) end as difference,
      case when p.latitude is not null and q.latitude is not null then
        round((6371 * acos(least(1.0, greatest(-1.0,
          sin(radians(p.latitude::double precision)) * sin(radians(q.latitude::double precision)) +
          cos(radians(p.latitude::double precision)) * cos(radians(q.latitude::double precision)) *
          cos(radians((p.longitude - q.longitude)::double precision))))))::numeric)
        end as distance
    from public.ping_practice_preferences p
    join public.ping_practice_preferences q on q.owner_id <> p.owner_id and q.discoverable
    join public.ping_directory d on d.owner_id = q.owner_id and d.published
    where p.owner_id = auth.uid() and p.discoverable
      and (not p_resume_only or (p.goal = 'resume' and q.goal = 'resume'))
      and not exists (select 1 from public.ping_blocks b where (b.blocker = p.owner_id and b.blocked = q.owner_id) or (b.blocker = q.owner_id and b.blocked = p.owner_id))
  ), ranked as (
    select c.*, (case when cardinality(c.common_days) > 0 and c.common_period then 1 else 0 end +
      case when c.common_goal then 1 else 0 end +
      case when c.difference <= 200 then 1 else 0 end +
      case when c.distance <= 50 then 1 else 0 end) as relevance from candidates c
  )
  select r.owner_id, r.display_name, r.common_days, r.common_period, r.common_goal, r.difference, r.distance, r.relevance
    from ranked r where r.relevance > 0 order by r.relevance desc, r.display_name limit 30;
end;
$$;

create function public.ping_create_practice(
  p_title text, p_starts_at timestamptz, p_city text, p_venue text, p_goal text,
  p_wheelchair text, p_fee text, p_equipment text, p_changing text, p_beginners text
) returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); result uuid;
begin
  if me is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  if not exists (select 1 from public.ping_directory d where d.owner_id = me and d.published) then
    raise exception 'Publie un profil avant de proposer une séance' using errcode = '42501'; end if;
  if p_title is null or length(trim(p_title)) not between 2 and 100
    or p_city is null or length(trim(p_city)) not between 2 and 100
    or p_venue is null or length(trim(p_venue)) not between 2 and 150
    or p_starts_at is null or p_starts_at <= now() or p_starts_at > now() + interval '90 days'
    or p_goal is null or p_goal not in ('training','competition','resume','leisure')
    or p_wheelchair is null or p_wheelchair not in ('yes','no','unknown')
    or p_equipment is null or p_equipment not in ('yes','no','unknown')
    or p_changing is null or p_changing not in ('yes','no','unknown')
    or p_beginners is null or p_beginners not in ('yes','no','unknown')
    or p_fee is null or length(trim(p_fee)) not between 1 and 80
    then raise exception 'Séance invalide' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ping-practice:' || me::text, 0));
  if (select count(*) from public.ping_practices s where s.owner_id = me and s.starts_at > now()) >= 10 then
    raise exception 'Maximum de 10 séances à venir' using errcode = 'P0001'; end if;
  insert into public.ping_practices(owner_id, title, starts_at, city, venue, goal, wheelchair, fee, equipment, changing, beginners)
    values (me, trim(p_title), p_starts_at, trim(p_city), trim(p_venue), p_goal, p_wheelchair, trim(p_fee), p_equipment, p_changing, p_beginners)
    returning id into result;
  return result;
end;
$$;

create function public.ping_delete_practice(p_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  delete from public.ping_practices where id = p_id and owner_id = auth.uid();
  if not found then raise exception 'Séance introuvable' using errcode = 'P0001'; end if;
end;
$$;

create function public.ping_list_practices(p_id uuid default null)
returns table(id uuid, owner_id uuid, display_name text, title text, starts_at timestamptz, city text, venue text,
  goal text, wheelchair text, fee text, equipment text, changing text, beginners text)
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  return query select s.id, s.owner_id, coalesce(d.display_name, 'Profil privé'), s.title, s.starts_at, s.city, s.venue,
    s.goal, s.wheelchair, s.fee, s.equipment, s.changing, s.beginners
    from public.ping_practices s left join public.ping_directory d on d.owner_id = s.owner_id and d.published
    where s.starts_at > now()
      and (d.published or s.owner_id = auth.uid())
      and (s.owner_id = auth.uid() or (p_id is not null and s.id = p_id)
        or (p_id is null and exists (select 1 from public.ping_practice_preferences p where p.owner_id = auth.uid() and p.alerts)))
      and (p_id is null or s.id = p_id)
      and not exists (select 1 from public.ping_blocks b where (b.blocker = auth.uid() and b.blocked = s.owner_id) or (b.blocker = s.owner_id and b.blocked = auth.uid()))
    order by s.starts_at limit 50;
end;
$$;

revoke all on function public.ping_save_practice_preferences(boolean,boolean,integer[],text,text,numeric,numeric,numeric),
  public.ping_my_practice_preferences(), public.ping_practice_recommendations(boolean),
  public.ping_create_practice(text,timestamptz,text,text,text,text,text,text,text,text),
  public.ping_delete_practice(uuid), public.ping_list_practices(uuid) from public, anon;
grant execute on function public.ping_save_practice_preferences(boolean,boolean,integer[],text,text,numeric,numeric,numeric),
  public.ping_my_practice_preferences(), public.ping_practice_recommendations(boolean),
  public.ping_create_practice(text,timestamptz,text,text,text,text,text,text,text,text),
  public.ping_delete_practice(uuid), public.ping_list_practices(uuid) to authenticated;

commit;
