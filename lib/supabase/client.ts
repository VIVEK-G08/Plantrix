import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | undefined

// Use global variable in browser to persist across hot reloads
if (typeof window !== "undefined") {
  // @ts-ignore
  if (!window.__supabaseClient) {
    // @ts-ignore
    window.__supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  // @ts-ignore
  client = window.__supabaseClient
}

export function createClient() {
  if (client) {
    return client
  }

  client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  // Store in global variable for reuse
  if (typeof window !== "undefined") {
    // @ts-ignore
    window.__supabaseClient = client
  }

  return client
}
