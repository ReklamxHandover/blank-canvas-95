import { corsHeaders, handleOptions } from "../_shared/cors.ts";

Deno.serve((req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
