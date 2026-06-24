import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROLES = ["owner", "staff", "designer", "producer"] as const;

async function assertOwner(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data || data.role !== "owner") {
    throw new Error("Forbidden: owner role required");
  }
}

export const listUsersWithEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.userId);

    // Fetch all profiles
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, created_at")
      .order("created_at", { ascending: true });
    if (profErr) throw new Error(profErr.message);

    // Fetch all auth users (first page; pagination kept simple)
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (authErr) throw new Error(authErr.message);

    const emailById = new Map<string, string>();
    for (const u of authData.users) {
      if (u.id && u.email) emailById.set(u.id, u.email);
    }

    return (profiles ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name ?? "",
      role: p.role,
      email: emailById.get(p.id) ?? "",
    }));
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      role: z.enum(ROLES),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId);
    // Don't allow demoting yourself
    if (data.userId === context.userId && data.role !== "owner") {
      throw new Error("You cannot remove your own owner role");
    }
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ role: data.role, updated_at: new Date().toISOString() })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
