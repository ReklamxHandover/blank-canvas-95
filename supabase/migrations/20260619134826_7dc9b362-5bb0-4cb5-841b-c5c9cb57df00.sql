
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS end_time time without time zone,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence text,
  ADD COLUMN IF NOT EXISTS subtasks jsonb DEFAULT '[]'::jsonb;
