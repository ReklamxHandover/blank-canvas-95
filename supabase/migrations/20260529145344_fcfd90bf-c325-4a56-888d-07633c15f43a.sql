
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.activity_log REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
