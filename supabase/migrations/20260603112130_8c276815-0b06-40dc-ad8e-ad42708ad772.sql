
-- 1. SECURITY DEFINER helper to safely check roles in RLS
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id and role = _role
  )
$$;

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- 2. Fix prevent_role_change (previously referenced non-existent get_my_role)
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if new.role is distinct from old.role and coalesce(caller_role, 'staff') <> 'owner' then
    new.role := old.role;
  end if;
  return new;
end;
$$;

revoke execute on function public.prevent_role_change() from public, anon, authenticated;

-- 3. Force role=staff on profile insert unless caller is owner (prevents self-assigning admin)
create or replace function public.enforce_insert_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if coalesce(caller_role, 'staff') <> 'owner' then
    new.role := 'staff';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_insert_role() from public, anon, authenticated;

drop trigger if exists guard_role_insert on public.profiles;
create trigger guard_role_insert
  before insert on public.profiles
  for each row execute function public.enforce_insert_role();

-- 4. Set search_path on remaining mutable-path functions
alter function public.next_order_id() set search_path = public;
alter function public.set_kundnr() set search_path = public;

-- 5. Revoke EXECUTE on SECURITY DEFINER trigger functions (they only need to run from triggers)
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 6. Tighten clients: read for any authenticated user with profile; writes for owner/staff only
drop policy if exists clients_insert on public.clients;
drop policy if exists clients_update on public.clients;
drop policy if exists clients_delete on public.clients;

create policy clients_insert_staff on public.clients
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'owner') or public.has_role(auth.uid(), 'staff'));

create policy clients_update_staff on public.clients
  for update to authenticated
  using (public.has_role(auth.uid(), 'owner') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'owner') or public.has_role(auth.uid(), 'staff'));

create policy clients_delete_owner on public.clients
  for delete to authenticated
  using (public.has_role(auth.uid(), 'owner'));

-- 7. Tighten orders: read for authenticated; writes for owner/staff; delete owner only
drop policy if exists orders_insert on public.orders;
drop policy if exists orders_update on public.orders;
drop policy if exists orders_delete on public.orders;

create policy orders_insert_staff on public.orders
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'owner') or public.has_role(auth.uid(), 'staff'));

create policy orders_update_workflow on public.orders
  for update to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy orders_delete_owner on public.orders
  for delete to authenticated
  using (public.has_role(auth.uid(), 'owner'));

-- 8. Tighten activity_log: append-only for authenticated; edit/delete owner only
drop policy if exists activity_update on public.activity_log;
drop policy if exists activity_delete on public.activity_log;

create policy activity_update_owner on public.activity_log
  for update to authenticated
  using (public.has_role(auth.uid(), 'owner'))
  with check (public.has_role(auth.uid(), 'owner'));

create policy activity_delete_owner on public.activity_log
  for delete to authenticated
  using (public.has_role(auth.uid(), 'owner'));

-- 9. Tighten order_attachments: delete by uploader or owner/staff
drop policy if exists attach_delete on public.order_attachments;

create policy attach_delete_owner_or_uploader on public.order_attachments
  for delete to authenticated
  using (
    uploaded_by = auth.uid()
    or public.has_role(auth.uid(), 'owner')
    or public.has_role(auth.uid(), 'staff')
  );

-- 10. Storage policies for order-attachments bucket: delete by owner/staff only
drop policy if exists "Authenticated can delete order attachments" on storage.objects;

create policy "Owner or staff can delete order attachments" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'order-attachments'
    and (public.has_role(auth.uid(), 'owner') or public.has_role(auth.uid(), 'staff'))
  );
