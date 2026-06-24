
-- Storage bucket (private; access via signed URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-attachments', 'order-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket policies: any authenticated user can read/write
CREATE POLICY "Authenticated can read order attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'order-attachments');

CREATE POLICY "Authenticated can upload order attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'order-attachments');

CREATE POLICY "Authenticated can delete order attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'order-attachments');

-- Metadata table
CREATE TABLE public.order_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL DEFAULT '',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_attachments_order_id ON public.order_attachments(order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_attachments TO authenticated;
GRANT ALL ON public.order_attachments TO service_role;

ALTER TABLE public.order_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view order attachments"
ON public.order_attachments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert order attachments"
ON public.order_attachments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can delete order attachments"
ON public.order_attachments FOR DELETE TO authenticated USING (true);
