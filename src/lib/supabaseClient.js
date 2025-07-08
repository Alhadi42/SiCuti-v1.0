import { createClient } from "@supabase/supabase-js";
import EnvironmentValidator from "./environmentValidator";

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
