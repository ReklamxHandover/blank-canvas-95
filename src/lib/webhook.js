import { authedFetch } from './apiClient';

// Fire-and-forget. Webhook traffic is proxied through a Vercel serverless
// function so the destination URL and signing secret never reach the browser bundle.
export async function triggerWebhook(event, payload = {}) {
  try {
    await authedFetch('/api/webhook', { method: 'POST', body: JSON.stringify({ event, payload }) });
  } catch (e) {
    console.warn('Webhook failed silently:', e?.message || e);
  }
}
