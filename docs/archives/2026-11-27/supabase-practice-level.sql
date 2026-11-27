begin;

alter table public.ping_practices
  add column level_min numeric,
  add column level_max numeric,
  add constraint ping_practice_level_range check (
    (level_min is null or (level_min between 0 and 5000 and level_min <> 'NaN'::numeric))
    and (level_max is null or (level_max between 0 and 5000 and level_max <> 'NaN'::numeric))
    and (level_min is null or level_max is null or level_min <= level_max)
  );

create function public.ping_create_practice_with_level(
  p_title text, p_starts_at timestamptz, p_city text, p_venue text, p_goal text,
  p_wheelchair text, p_fee text, p_equipment text, p_changing text, p_beginners text,
  p_capacity integer, p_level_min numeric, p_level_max numeric
) returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $$
declare result uuid;
begin
  if (p_level_min is not null and (p_level_min not between 0 and 5000 or p_level_min = 'NaN'::numeric))
    or (p_level_max is not null and (p_level_max not between 0 and 5000 or p_level_max = 'NaN'::numeric))
    or (p_level_min is not null and p_level_max is not null and p_level_min > p_level_max) then
    raise exception 'Fourchette de niveau invalide' using errcode = '22023';
  end if;
  result := public.ping_create_practice_with_capacity(p_title, p_starts_at, p_city, p_venue, p_goal,
    p_wheelchair, p_fee, p_equipment, p_changing, p_beginners, p_capacity);
  update public.ping_practices set level_min = p_level_min, level_max = p_level_max
    where id = result and owner_id = auth.uid();
  return result;
end;
$$;

create function public.ping_practice_levels(p_ids uuid[])
returns table(id uuid, level_min numeric, level_max numeric)
language sql security definer set search_path = pg_catalog, public
as $$
  select s.id, s.level_min, s.level_max
  from public.ping_practice_availability(p_ids) visible
  join public.ping_practices s on s.id = visible.id;
$$;

revoke all on function public.ping_create_practice_with_level(text,timestamptz,text,text,text,text,text,text,text,text,integer,numeric,numeric),
  public.ping_practice_levels(uuid[]) from public, anon, authenticated;
grant execute on function public.ping_create_practice_with_level(text,timestamptz,text,text,text,text,text,text,text,text,integer,numeric,numeric),
  public.ping_practice_levels(uuid[]) to authenticated;

commit;
