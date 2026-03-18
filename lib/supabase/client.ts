// lib/supabase/client.ts
// Browser-side singleton client — safe to call multiple times, same instance returned.
// Realtime is enabled for the confession board live updates.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (!_client) {
    _client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        realtime: {
          params: { eventsPerSecond: 10 },
        },
      }
    );
  }
  return _client;
}
