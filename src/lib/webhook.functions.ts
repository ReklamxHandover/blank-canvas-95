import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { createHmac } from 'crypto';

const InputSchema = z.object({
  event: z.string().min(1).max(120),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const sendWebhook = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const url = process.env.WEBHOOK_URL;
    if (!url) return { ok: false, skipped: true };

    const body = JSON.stringify({
      event: data.event,
      ...data.payload,
      userId: context.userId,
      timestamp: new Date().toISOString(),
    });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const secret = process.env.WEBHOOK_SECRET;
    if (secret) {
      headers['X-Webhook-Signature'] = createHmac('sha256', secret).update(body).digest('hex');
    }

    try {
      await fetch(url, { method: 'POST', headers, body });
      return { ok: true };
    } catch (e) {
      console.warn('Webhook failed:', (e as Error)?.message);
      return { ok: false };
    }
  });
