import { createClient } from "@supabase/supabase-js";
import EnvironmentValidator from "./environmentValidator";

// Re-export useAuth hook for backward compatibility
// Note: useAuth is now in @/hooks/useAuth, but we export it here for convenience
export { useAuth } from "@/hooks/useAuth";

// Validate environment before creating client
const config = EnvironmentValidator.getConfig();

// Create Supabase client with optimized configuration
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
    db: {
      schema: "public",
    },
    global: {
      headers: {
        "x-application-name": "sistem-cuti",
        "x-client-version": config.app.version,
      },
    },
  },
);

// Create admin client with service role for server-side operations
// Falls back to anon key if service role key is not available (client-side usage)
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey || config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
    global: {
      headers: {
        "x-application-name": "sistem-cuti-admin",
        "x-client-version": config.app.version,
      },
    },
  },
);
