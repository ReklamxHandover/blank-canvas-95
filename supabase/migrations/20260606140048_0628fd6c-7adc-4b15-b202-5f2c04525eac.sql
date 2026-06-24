
-- 1. calendar_tasks: split write policy
DROP POLICY IF EXISTS ct_write ON public.calendar_tasks;

CREATE POLICY ct_insert ON public.calendar_tasks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY ct_update ON public.calendar_tasks
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY ct_delete ON public.calendar_tasks
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Allow assignee to toggle completion fields on shared/assigned tasks
CREATE POLICY ct_update_assignee_complete ON public.calendar_tasks
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- 2. notifications: restrict insert to self
DROP POLICY IF EXISTS nf_insert_any ON public.notifications;

CREATE POLICY nf_insert_own ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. profiles: prevent role escalation via WITH CHECK
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owners can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- 4. Revoke public/anon EXECUTE on SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats() FROM PUBLIC, anon;
