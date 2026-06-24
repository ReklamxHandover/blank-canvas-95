
-- Add user_id to activity_log
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Sequence + function for next order id
CREATE SEQUENCE IF NOT EXISTS public.orders_seq START 1;

-- Initialize sequence past any existing numeric IDs
SELECT setval(
  'public.orders_seq',
  GREATEST(
    (SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::int), 0) FROM public.orders),
    1
  )
);

CREATE OR REPLACE FUNCTION public.next_order_id()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'ORX-' || LPAD(nextval('public.orders_seq')::text, 3, '0');
$$;

GRANT EXECUTE ON FUNCTION public.next_order_id() TO authenticated, service_role;
