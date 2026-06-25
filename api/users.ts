import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { requireAuth, AuthError } from "./_lib/auth";
import { supabaseAdmin } from "../src/integrations/supabase/client.server";

const ROLES = ["owner", "staff", "designer", "producer"] as const;

async function assertOwner(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data || data.role !== "owner") {
    throw new AuthError("Forbidden: owner role required", 403);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { userId } = await requireAuth(req);
    await assertOwner(userId);

    if (req.method === "GET") {
      const { data: profiles, error: profErr } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, role, created_at")
        .order("created_at", { ascending: true });
      if (profErr) throw new Error(profErr.message);

      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (authErr) throw new Error(authErr.message);

      const emailById = new Map<string, string>();
      for (const u of authData.users) {
        if (u.id && u.email) emailById.set(u.id, u.email);
      }

      return res.status(200).json(
        (profiles ?? []).map((p) => ({
          id: p.id,
          fullName: p.full_name ?? "",
          role: p.role,
          email: emailById.get(p.id) ?? "",
        })),
      );
    }

    if (req.method === "POST") {
      const Body = z.object({
        userId: z.string().uuid(),
        role: z.enum(ROLES),
      });
      const data = Body.parse(req.body);

      if (data.userId === userId && data.role !== "owner") {
        return res.status(400).json({ error: "You cannot remove your own owner role" });
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ role: data.role, updated_at: new Date().toISOString() })
        .eq("id", data.userId);
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    if (e instanceof AuthError) return res.status(e.status).json({ error: e.message });
    console.error(e);
    return res.status(500).json({ error: (e as Error).message });
  }
}
