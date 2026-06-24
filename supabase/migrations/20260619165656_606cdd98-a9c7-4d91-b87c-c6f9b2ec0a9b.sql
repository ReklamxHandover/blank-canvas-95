
-- 1. Remove the legacy public-read policy on the doc-assets bucket.
DROP POLICY IF EXISTS docassets_read ON storage.objects;

-- 2. Restrict calendar_tasks assignee updates to completion fields only.
CREATE OR REPLACE FUNCTION public.restrict_assignee_task_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Creators (and service_role / owners via other paths) bypass this check.
  IF OLD.created_by IS NOT DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;
  -- Assignees may only change completion-related fields.
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.due_date IS DISTINCT FROM OLD.due_date
     OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.visibility IS DISTINCT FROM OLD.visibility
     OR NEW.list_id IS DISTINCT FROM OLD.list_id
     OR NEW.bucket IS DISTINCT FROM OLD.bucket
     OR NEW.points IS DISTINCT FROM OLD.points
     OR NEW.recurrence IS DISTINCT FROM OLD.recurrence
     OR NEW.reminder_at IS DISTINCT FROM OLD.reminder_at
     OR NEW.reminder_location IS DISTINCT FROM OLD.reminder_location
     OR NEW.subtasks IS DISTINCT FROM OLD.subtasks
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'Assignees may only update completion fields on calendar_tasks';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_assignee_task_updates ON public.calendar_tasks;
CREATE TRIGGER trg_restrict_assignee_task_updates
  BEFORE UPDATE ON public.calendar_tasks
  FOR EACH ROW EXECUTE FUNCTION public.restrict_assignee_task_updates();
