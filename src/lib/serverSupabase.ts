import { createClient } from "@supabase/supabase-js";

export function createServerAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing server Supabase configuration.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getBearerToken(request: Request) {
  const value = request.headers.get("authorization");
  return value?.replace(/^Bearer\s+/i, "") || null;
}
