
-- CLIENTS
CREATE TABLE public.clients (
  id text PRIMARY KEY,
  company_name text NOT NULL,
  contact_person text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  org_number text NOT NULL DEFAULT '',
  total_spent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view clients" ON public.clients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update clients" ON public.clients
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete clients" ON public.clients
  FOR DELETE TO authenticated USING (true);

-- ORDERS
CREATE TABLE public.orders (
  id text PRIMARY KEY,
  client_id text NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  manufacturer text NOT NULL DEFAULT '',
  price numeric,
  invoice_sent boolean NOT NULL DEFAULT false,
  paid boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  pipeline jsonb NOT NULL DEFAULT '{}'::jsonb,
  needs_attention boolean NOT NULL DEFAULT false,
  needs_attention_note text NOT NULL DEFAULT '',
  change_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view orders" ON public.orders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update orders" ON public.orders
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete orders" ON public.orders
  FOR DELETE TO authenticated USING (true);

CREATE INDEX orders_client_id_idx ON public.orders(client_id);
CREATE INDEX orders_deleted_at_idx ON public.orders(deleted_at);

-- ACTIVITY LOG
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
  client_id text REFERENCES public.clients(id) ON DELETE SET NULL,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view activity" ON public.activity_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert activity" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update activity" ON public.activity_log
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete activity" ON public.activity_log
  FOR DELETE TO authenticated USING (true);

CREATE INDEX activity_log_timestamp_idx ON public.activity_log("timestamp" DESC);
