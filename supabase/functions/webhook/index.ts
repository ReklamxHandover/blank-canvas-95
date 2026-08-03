import { z } from "npm:zod@3";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { requireAuth, AuthError } from "../_shared/auth.ts";

const InputSchema = z.object({
  event: z.string().min(1).max(120),
  payload: z.record(z.string(), z.unknown()).default({}),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { userId } = await requireAuth(req);
    const data = InputSchema.parse(await req.json());

    const url = Deno.env.get("WEBHOOK_URL");
    if (!url) return json({ ok: false, skipped: true });

    const body = JSON.stringify({
      event: data.event,
      ...data.payload,
      userId,
      timestamp: new Date().toISOString(),
    });

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const secret = Deno.env.get("WEBHOOK_SECRET");
    if (secret) {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
      headers["X-Webhook-Signature"] = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    await fetch(url, { method: "POST", headers, body });
    return json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    console.warn("Webhook failed:", (e as Error)?.message);
    return json({ ok: false });
  }
});
