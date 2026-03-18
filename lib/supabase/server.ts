// lib/supabase/server.ts
// Server-side admin client (uses service role key — never expose to client)
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  if (!adminClient) {
    adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return adminClient;
}

// Passcode validator
export function validatePasscode(passcode: string): boolean {
  return passcode === process.env.CLASS_PASSCODE;
}
