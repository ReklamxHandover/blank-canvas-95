import type { VercelRequest } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/integrations/supabase/types";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireAuth(req: VercelRequest) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY");
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) throw new AuthError("Unauthorized: No authorization header provided");
  if (!authHeader.startsWith("Bearer ")) {
    throw new AuthError("Unauthorized: Only Bearer tokens are supported");
  }

  const token = authHeader.slice("Bearer ".length);
  if (!token) throw new AuthError("Unauthorized: No token provided");

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) throw new AuthError("Unauthorized: Invalid token");
  if (!data.claims.sub) throw new AuthError("Unauthorized: No user ID found in token");

  return { supabase, userId: data.claims.sub as string, claims: data.claims };
}
