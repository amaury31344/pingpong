begin;

create function public.ping_delete_own_account()
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); signed_in timestamptz;
begin
  if me is null then raise exception 'Connexion nécessaire' using errcode = '42501'; end if;
  select u.last_sign_in_at into signed_in from auth.users u where u.id = me for update;
  if not found then raise exception 'Compte introuvable' using errcode = '42501'; end if;
  if signed_in is null or signed_in < now() - interval '15 minutes' or signed_in > now() then
    raise exception 'Reconnecte-toi puis réessaie dans les 15 minutes' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.sessions s where s.user_id = me
      and s.id::text = auth.jwt()->>'session_id'
      and s.created_at >= now() - interval '15 minutes' and s.created_at <= now()) then
    raise exception 'Reconnecte-toi sur cet appareil puis réessaie dans les 15 minutes' using errcode = '42501';
  end if;
  if exists (select 1 from storage.objects o where o.owner = me or o.owner_id = me::text) then
    raise exception 'Ce compte possède des fichiers Storage : contacte l’administrateur avant sa suppression' using errcode = 'P0001';
  end if;
  delete from auth.users where id = me;
end;
$$;
revoke all on function public.ping_delete_own_account() from public, anon, authenticated;
grant execute on function public.ping_delete_own_account() to authenticated;

commit;
