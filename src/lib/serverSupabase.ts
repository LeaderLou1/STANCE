
import "server-only";

import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  return url;
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return key;
}

/**
 * Administrative client.
 * Server-only. Uses elevated credentials that bypass RLS.
 * Every caller must independently enforce authentication,
 * authorization, and input validation.
 */
export function createServerAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * User-scoped client for API routes using explicit Bearer tokens.
 * Always verify the token with supabase.auth.getUser(token)
 * before trusting the authenticated user.
 */
export function createServerUserClient(accessToken: string) {
  const token = accessToken.trim();

  if (!token) {
    throw new Error("An access token is required.");
  }

  return createClient(getSupabaseUrl(), getAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

/**
 * Extracts a Bearer token from an incoming HTTP request.
 * Returns null for missing or malformed authorization headers.
 */
export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.trim().match(/^Bearer\s+(\S+)$/i);

  return match?.[1] ?? null;
}
