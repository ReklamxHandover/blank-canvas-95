import { sendWebhook } from './webhook.functions';

// Fire-and-forget. All webhook traffic is proxied through a server function so
// the destination URL and signing secret never reach the browser bundle.
export async function triggerWebhook(event, payload = {}) {
  try {
    await sendWebhook({ data: { event, payload } });
  } catch (e) {
    console.warn('Webhook failed silently:', e?.message || e);
  }
}
