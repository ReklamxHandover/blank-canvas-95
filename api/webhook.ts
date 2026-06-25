import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { createHmac } from "crypto";
import { requireAuth, AuthError } from "./_lib/auth";

const InputSchema = z.object({
  event: z.string().min(1).max(120),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = await requireAuth(req);
    const data = InputSchema.parse(req.body);

    const url = process.env.WEBHOOK_URL;
    if (!url) return res.status(200).json({ ok: false, skipped: true });

    const body = JSON.stringify({
      event: data.event,
      ...data.payload,
      userId,
      timestamp: new Date().toISOString(),
    });

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const secret = process.env.WEBHOOK_SECRET;
    if (secret) {
      headers["X-Webhook-Signature"] = createHmac("sha256", secret).update(body).digest("hex");
    }

    await fetch(url, { method: "POST", headers, body });
    return res.status(200).json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return res.status(e.status).json({ error: e.message });
    console.warn("Webhook failed:", (e as Error)?.message);
    return res.status(200).json({ ok: false });
  }
}
