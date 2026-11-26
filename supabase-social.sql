-- Migration: existing shared profiles stay visible only to signed-in users.
begin;

alter table public.ping_directory
  add column visibility text not null default 'accounts' check (visibility in ('accounts', 'public')),
  add column bio text,
  add column photo text;

create table public.ping_friendships (
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null,
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high),
  check (requested_by = user_low or requested_by = user_high)
);

create table public.ping_blocks (
  blocker uuid not null references auth.users(id) on delete cascade,
  blocked uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create table public.ping_messages (
  id bigint generated always as identity primary key,
  user_low uuid not null,
  user_high uuid not null,
  sender uuid not null,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key (user_low, user_high) references public.ping_friendships(user_low, user_high) on delete cascade,
  check (sender = user_low or sender = user_high)
);
create index ping_messages_pair_id on public.ping_messages(user_low, user_high, id desc);
create index ping_messages_sender_created on public.ping_messages(sender, created_at desc);

alter table public.ping_friendships enable row level security;
alter table public.ping_blocks enable row level security;
alter table public.ping_messages enable row level security;
revoke all on public.ping_friendships, public.ping_blocks, public.ping_messages from public, anon, authenticated;

create function public.ping_lock_social_pair(p_a uuid, p_b uuid)
returns void language sql set search_path = pg_catalog
as $$ select pg_advisory_xact_lock(hashtextextended(least(p_a, p_b)::text || ':' || greatest(p_a, p_b)::text, 0)); $$;
revoke all on function public.ping_lock_social_pair(uuid,uuid) from public, anon, authenticated;

create function public.ping_publish_social_profile(
  p_expected_version bigint, p_name text, p_club text, p_points numeric,
  p_played integer, p_wins integer, p_matches jsonb, p_visibility text, p_bio text, p_photo text
) returns bigint
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare saved_version bigint;
begin
  if auth.uid() is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  if p_visibility not in ('public', 'accounts') or p_visibility is null
     or (p_bio is not null and length(p_bio) > 300)
     or (p_photo is not null and (length(p_photo) > 140000 or p_photo !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$')) then
    raise exception 'Bio, photo ou visibilité invalide' using errcode = '22023';
  end if;
  saved_version := public.ping_publish_directory(p_expected_version, p_name, p_club, p_points, p_played, p_wins, p_matches);
  update public.ping_directory set visibility = p_visibility, bio = nullif(trim(p_bio), ''), photo = p_photo
    where owner_id = auth.uid() and version = saved_version;
  return saved_version;
end;
$$;

create function public.ping_search_social_profiles(p_query text)
returns table(user_id uuid, display_name text, club text, estimated_points numeric, played integer, wins integer,
  recent_matches jsonb, updated_at timestamptz, bio text, photo text)
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if p_query is null or length(trim(p_query)) not between 2 and 80 then
    raise exception 'Recherche : 2 à 80 caractères' using errcode = '22023';
  end if;
  return query select d.owner_id, d.display_name, d.club, d.estimated_points, d.played, d.wins,
    d.recent_matches, d.updated_at, d.bio, d.photo
    from public.ping_directory d
    where d.published and (d.visibility = 'public' or auth.uid() is not null)
      and position(lower(trim(p_query)) in lower(d.display_name)) > 0
      and not exists (select 1 from public.ping_blocks b where auth.uid() is not null and
        ((b.blocker = auth.uid() and b.blocked = d.owner_id) or (b.blocked = auth.uid() and b.blocker = d.owner_id)))
    order by lower(d.display_name), d.updated_at desc limit 30;
end;
$$;

create function public.ping_my_social_profile()
returns table(version bigint, published boolean, display_name text, club text, estimated_points numeric, played integer,
  wins integer, recent_matches jsonb, updated_at timestamptz, visibility text, bio text, photo text)
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  return query select d.version, d.published, d.display_name, d.club, d.estimated_points, d.played, d.wins,
    d.recent_matches, d.updated_at, d.visibility, d.bio, d.photo from public.ping_directory d where d.owner_id = auth.uid();
end;
$$;

create or replace function public.ping_unpublish_directory(p_expected_version bigint)
returns bigint language plpgsql security definer set search_path = pg_catalog, public
as $$
declare saved_version bigint;
begin
  if auth.uid() is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  if p_expected_version is null then
    insert into public.ping_directory(owner_id, published) values (auth.uid(), false)
      on conflict (owner_id) do nothing returning version into saved_version;
  else
    update public.ping_directory d set published = false, display_name = null, club = null, estimated_points = null,
      played = null, wins = null, recent_matches = null, bio = null, photo = null, visibility = 'accounts',
      updated_at = now(), version = d.version + 1
      where d.owner_id = auth.uid() and d.version = p_expected_version returning d.version into saved_version;
  end if;
  if saved_version is null then raise exception 'Le profil partagé a changé, recommence' using errcode = 'P0001'; end if;
  return saved_version;
end;
$$;

create function public.ping_request_friend(p_user uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  if p_user is null or me = p_user then raise exception 'Demande impossible' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ping-request:' || me::text, 0));
  perform public.ping_lock_social_pair(me, p_user);
  if (select count(*) from public.ping_friendships f where f.requested_by = me and not f.accepted) >= 20 then
    raise exception 'Trop de demandes en attente' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.ping_directory d where d.owner_id = p_user and d.published)
    or not exists (select 1 from public.ping_directory d where d.owner_id = me and d.published)
    or exists (select 1 from public.ping_blocks b where (b.blocker = me and b.blocked = p_user) or (b.blocker = p_user and b.blocked = me))
    then raise exception 'Demande impossible' using errcode = '22023'; end if;
  insert into public.ping_friendships(user_low, user_high, requested_by)
    values (least(me, p_user), greatest(me, p_user), me);
exception when unique_violation then
  raise exception 'Une demande ou une amitié existe déjà' using errcode = 'P0001';
end;
$$;

create function public.ping_respond_friend(p_user uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  if p_accept is null then raise exception 'Réponse invalide' using errcode = '22023'; end if;
  perform public.ping_lock_social_pair(me, p_user);
  if p_accept then
    update public.ping_friendships f set accepted = true
      where f.user_low = least(me, p_user) and f.user_high = greatest(me, p_user)
        and f.requested_by = p_user and not f.accepted
        and not exists (select 1 from public.ping_blocks b where (b.blocker = me and b.blocked = p_user) or (b.blocker = p_user and b.blocked = me));
  else
    delete from public.ping_friendships f where f.user_low = least(me, p_user) and f.user_high = greatest(me, p_user)
      and f.requested_by = p_user and not f.accepted;
  end if;
  if not found then raise exception 'Demande introuvable' using errcode = 'P0001'; end if;
end;
$$;

create function public.ping_remove_friend(p_user uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  perform public.ping_lock_social_pair(me, p_user);
  delete from public.ping_friendships f where f.user_low = least(me, p_user) and f.user_high = greatest(me, p_user);
  if not found then raise exception 'Relation introuvable' using errcode = 'P0001'; end if;
end;
$$;

create function public.ping_block_user(p_user uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  if p_user is null or p_user = me or not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'Joueur invalide' using errcode = '22023';
  end if;
  perform public.ping_lock_social_pair(me, p_user);
  insert into public.ping_blocks(blocker, blocked) values (me, p_user) on conflict do nothing;
  delete from public.ping_friendships f where f.user_low = least(me, p_user) and f.user_high = greatest(me, p_user);
end;
$$;

create function public.ping_unblock_user(p_user uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  perform public.ping_lock_social_pair(auth.uid(), p_user);
  delete from public.ping_blocks where blocker = auth.uid() and blocked = p_user;
  if not found then raise exception 'Blocage introuvable' using errcode = 'P0001'; end if;
end;
$$;

create function public.ping_list_social()
returns table(user_id uuid, display_name text, relationship text)
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  return query
    select peer.id, coalesce(d.display_name, 'Profil privé'),
      case when f.accepted then 'friend' when f.requested_by = auth.uid() then 'sent' else 'received' end
    from public.ping_friendships f
    cross join lateral (select case when f.user_low = auth.uid() then f.user_high else f.user_low end as id) peer
    left join public.ping_directory d on d.owner_id = peer.id and d.published
    where f.user_low = auth.uid() or f.user_high = auth.uid()
    union all
    select b.blocked, coalesce(d.display_name, 'Profil privé'), 'blocked'
    from public.ping_blocks b left join public.ping_directory d on d.owner_id = b.blocked and d.published
    where b.blocker = auth.uid();
end;
$$;

create function public.ping_send_message(p_user uuid, p_body text)
returns bigint language plpgsql security definer set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); message_id bigint;
begin
  if me is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  if p_body is null or length(trim(p_body)) not between 1 and 2000 then raise exception 'Message invalide' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('ping-message:' || me::text, 0));
  perform public.ping_lock_social_pair(me, p_user);
  perform 1 from public.ping_friendships f where f.user_low = least(me, p_user) and f.user_high = greatest(me, p_user)
    and f.accepted for update;
  if not found or exists (select 1 from public.ping_blocks b where (b.blocker = me and b.blocked = p_user) or (b.blocker = p_user and b.blocked = me))
    then raise exception 'Messagerie réservée aux amis' using errcode = '42501'; end if;
  if (select count(*) from public.ping_messages m where m.sender = me and m.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Trop de messages : attends une minute' using errcode = 'P0001';
  end if;
  insert into public.ping_messages(user_low, user_high, sender, body)
    values (least(me, p_user), greatest(me, p_user), me, trim(p_body)) returning id into message_id;
  return message_id;
end;
$$;

create function public.ping_read_messages(p_user uuid)
returns table(id bigint, sender uuid, body text, created_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  perform public.ping_lock_social_pair(me, p_user);
  if not exists (select 1 from public.ping_friendships f where f.user_low = least(me, p_user) and f.user_high = greatest(me, p_user) and f.accepted)
    or exists (select 1 from public.ping_blocks b where (b.blocker = me and b.blocked = p_user) or (b.blocker = p_user and b.blocked = me))
    then raise exception 'Messagerie réservée aux amis' using errcode = '42501'; end if;
  return query select m.id, m.sender, m.body, m.created_at from public.ping_messages m
    where m.user_low = least(me, p_user) and m.user_high = greatest(me, p_user) order by m.id desc limit 100;
end;
$$;

revoke all on function public.ping_publish_social_profile(bigint,text,text,numeric,integer,integer,jsonb,text,text,text) from public, anon;
revoke all on function public.ping_search_social_profiles(text) from public;
revoke all on function public.ping_my_social_profile() from public, anon;
revoke all on function public.ping_request_friend(uuid), public.ping_respond_friend(uuid,boolean), public.ping_remove_friend(uuid),
  public.ping_block_user(uuid), public.ping_unblock_user(uuid), public.ping_list_social(),
  public.ping_send_message(uuid,text), public.ping_read_messages(uuid) from public, anon;
grant execute on function public.ping_search_social_profiles(text) to anon, authenticated;
grant execute on function public.ping_publish_social_profile(bigint,text,text,numeric,integer,integer,jsonb,text,text,text),
  public.ping_my_social_profile(), public.ping_request_friend(uuid), public.ping_respond_friend(uuid,boolean),
  public.ping_remove_friend(uuid), public.ping_block_user(uuid), public.ping_unblock_user(uuid), public.ping_list_social(),
  public.ping_send_message(uuid,text), public.ping_read_messages(uuid) to authenticated;

commit;
