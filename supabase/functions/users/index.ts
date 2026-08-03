import { z } from "npm:zod@3";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { requireAuth, AuthError } from "../_shared/auth.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";

const ROLES = ["owner", "staff", "designer", "producer"] as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function assertOwner(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data || data.role !== "owner") {
    throw new AuthError("Forbidden: owner role required", 403);
  }
}

async function countOwners() {
  const { count, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const supabaseAdmin = getSupabaseAdmin();
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

      return json(
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
      const data = Body.parse(await req.json());

      if (data.role !== "owner") {
        const { data: target, error: targetErr } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("id", data.userId)
          .maybeSingle();
        if (targetErr) throw new Error(targetErr.message);
        if (target?.role === "owner" && (await countOwners()) <= 1) {
          return json({ error: "Cannot remove the last owner" }, 400);
        }
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ role: data.role, updated_at: new Date().toISOString() })
        .eq("id", data.userId);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    if (req.method === "PUT") {
      const Body = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().trim().min(1),
        role: z.enum(ROLES),
      });
      const data = Body.parse(await req.json());

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName },
      });
      if (createErr) return json({ error: createErr.message }, 400);

      const newId = created.user.id;
      const now = new Date().toISOString();

      // The signup trigger creates the profile but forces role to 'staff';
      // a service-role update afterwards sets the requested role.
      const { error: upsertErr } = await supabaseAdmin
        .from("profiles")
        .upsert({ id: newId, full_name: data.fullName, updated_at: now });
      if (upsertErr) throw new Error(upsertErr.message);

      const { error: roleErr } = await supabaseAdmin
        .from("profiles")
        .update({ full_name: data.fullName, role: data.role, updated_at: now })
        .eq("id", newId);
      if (roleErr) throw new Error(roleErr.message);

      return json({
        id: newId,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
      });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message }, e.status);
    if (e instanceof z.ZodError) {
      return json({ error: e.issues.map((i) => i.message).join(", ") }, 400);
    }
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
