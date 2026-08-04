-- Store a plaintext copy of each user's current password so the super-owner
-- (owner@reklamx.se) can view/copy it. This is only ever written and read via
-- the "users" edge function using the service_role key.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plain_password TEXT;

-- Column-level privilege lock: even though profiles rows are readable by all
-- authenticated users (existing RLS policy), the plain_password column itself
-- must never be reachable through direct PostgREST/table queries - only the
-- service_role used by the edge function (which is not affected by this
-- REVOKE) can read or write it.
REVOKE SELECT (plain_password), UPDATE (plain_password) ON public.profiles FROM authenticated, anon;
