import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// `name` is a Supabase Edge Function name (e.g. "users", "webhook") - these
// replace the old same-origin /api/* Vercel serverless functions, which
// GitHub Pages (static hosting) cannot run.
export async function authedFetch(name: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${FUNCTIONS_URL}/${name}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Request failed: ${res.status}`);
  return body;
}
