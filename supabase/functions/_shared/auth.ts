import { createClient } from "npm:@supabase/supabase-js@2";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireAuth(req: Request) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_ANON_KEY");
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) throw new AuthError("Unauthorized: No authorization header provided");
  if (!authHeader.startsWith("Bearer ")) {
    throw new AuthError("Unauthorized: Only Bearer tokens are supported");
  }

  const token = authHeader.slice("Bearer ".length);
  if (!token) throw new AuthError("Unauthorized: No token provided");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) throw new AuthError("Unauthorized: Invalid token");
  if (!data.claims.sub) throw new AuthError("Unauthorized: No user ID found in token");

  return { supabase, userId: data.claims.sub as string, claims: data.claims };
}
