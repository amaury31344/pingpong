begin;

create table public.ping_directory (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null default 1,
  published boolean not null default false,
  display_name text,
  club text,
  estimated_points numeric,
  played integer,
  wins integer,
  recent_matches jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ping_directory enable row level security;
revoke all on public.ping_directory from public, anon, authenticated;

create function public.ping_publish_directory(
  p_expected_version bigint, p_name text, p_club text, p_points numeric, p_played integer, p_wins integer, p_matches jsonb
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  item jsonb;
  saved_version bigint;
begin
  if auth.uid() is null then
    raise exception 'Connexion nécessaire' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) not between 2 and 80
     or (p_club is not null and length(trim(p_club)) not between 1 and 100)
     or (p_points is not null and (p_points::text in ('NaN', 'Infinity', '-Infinity') or p_points < 0 or p_points > 10000))
     or ((p_played is null) <> (p_wins is null))
     or (p_played is not null and (p_played < 0 or p_played > 10000 or p_wins < 0 or p_wins > p_played)) then
    raise exception 'Profil invalide' using errcode = '22023';
  end if;
  if p_matches is not null then
    if jsonb_typeof(p_matches) <> 'array' or jsonb_array_length(p_matches) > 10 or octet_length(p_matches::text) > 3000 then
      raise exception 'Liste de matchs invalide' using errcode = '22023';
    end if;
    for item in select value from jsonb_array_elements(p_matches) loop
      if jsonb_typeof(item) <> 'object'
         or item - 'date' - 'result' - 'kind' <> '{}'::jsonb
         or jsonb_typeof(item->'date') is distinct from 'string'
         or jsonb_typeof(item->'result') is distinct from 'string'
         or jsonb_typeof(item->'kind') is distinct from 'string'
         or item->>'date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         or item->>'result' not in ('win', 'loss')
         or item->>'kind' not in ('official', 'friendly', 'legacy') then
        raise exception 'Match invalide' using errcode = '22023';
      end if;
      if to_char((item->>'date')::date, 'YYYY-MM-DD') <> item->>'date' then
        raise exception 'Date invalide' using errcode = '22023';
      end if;
    end loop;
  end if;
  if p_expected_version is null then
    insert into public.ping_directory (owner_id, published, display_name, club, estimated_points, played, wins, recent_matches)
    values (auth.uid(), true, trim(p_name), nullif(trim(p_club), ''), p_points, p_played, p_wins, p_matches)
    on conflict (owner_id) do nothing returning version into saved_version;
  else
    update public.ping_directory d
    set published = true, display_name = trim(p_name), club = nullif(trim(p_club), ''),
        estimated_points = p_points, played = p_played, wins = p_wins, recent_matches = p_matches,
        updated_at = now(), version = d.version + 1
    where d.owner_id = auth.uid() and d.version = p_expected_version
    returning d.version into saved_version;
  end if;
  if saved_version is null then raise exception 'Le profil partagé a changé, recommence' using errcode = 'P0001'; end if;
  return saved_version;
end;
$$;

create function public.ping_search_directory(p_query text)
returns table(display_name text, club text, estimated_points numeric, played integer, wins integer, recent_matches jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion nécessaire' using errcode = '42501';
  end if;
  if p_query is null or length(trim(p_query)) not between 2 and 80 then
    raise exception 'Recherche : 2 à 80 caractères' using errcode = '22023';
  end if;
  return query
    select d.display_name, d.club, d.estimated_points, d.played, d.wins, d.recent_matches, d.updated_at
    from public.ping_directory d
    where d.published and position(lower(trim(p_query)) in lower(d.display_name)) > 0
    order by lower(d.display_name), d.updated_at desc
    limit 30;
end;
$$;

create function public.ping_my_directory_profile()
returns table(version bigint, published boolean, display_name text, club text, estimated_points numeric, played integer, wins integer, recent_matches jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion nécessaire' using errcode = '42501';
  end if;
  return query select d.version, d.published, d.display_name, d.club, d.estimated_points, d.played, d.wins, d.recent_matches, d.updated_at
    from public.ping_directory d where d.owner_id = auth.uid();
end;
$$;

create function public.ping_unpublish_directory(p_expected_version bigint)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare saved_version bigint;
begin
  if auth.uid() is null then
    raise exception 'Connexion nécessaire' using errcode = '42501';
  end if;
  if p_expected_version is null then
    insert into public.ping_directory (owner_id, published) values (auth.uid(), false)
    on conflict (owner_id) do nothing returning version into saved_version;
  else
    update public.ping_directory d
    set published = false, display_name = null, club = null, estimated_points = null,
        played = null, wins = null, recent_matches = null, updated_at = now(), version = d.version + 1
    where d.owner_id = auth.uid() and d.version = p_expected_version returning d.version into saved_version;
  end if;
  if saved_version is null then raise exception 'Le profil partagé a changé, recommence' using errcode = 'P0001'; end if;
  return saved_version;
end;
$$;

revoke all on function public.ping_publish_directory(bigint, text, text, numeric, integer, integer, jsonb) from public, anon;
revoke all on function public.ping_search_directory(text) from public, anon;
revoke all on function public.ping_my_directory_profile() from public, anon;
revoke all on function public.ping_unpublish_directory(bigint) from public, anon;
grant execute on function public.ping_publish_directory(bigint, text, text, numeric, integer, integer, jsonb) to authenticated;
grant execute on function public.ping_search_directory(text) to authenticated;
grant execute on function public.ping_my_directory_profile() to authenticated;
grant execute on function public.ping_unpublish_directory(bigint) to authenticated;

commit;
