export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

export function handleOptions(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return null;
}
