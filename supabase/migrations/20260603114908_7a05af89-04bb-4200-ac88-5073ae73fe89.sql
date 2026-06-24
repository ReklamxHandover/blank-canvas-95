-- Split notifications policy: anyone authenticated can create notifications for any user,
-- but viewing/updating/deleting remains limited to the recipient.
DROP POLICY IF EXISTS nf_own ON public.notifications;

CREATE POLICY nf_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY nf_insert_any ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY nf_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY nf_delete_own ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());