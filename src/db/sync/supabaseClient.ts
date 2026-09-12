import type { Session, SupabaseClient } from '@supabase/supabase-js';

const url: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const anonKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

let cachedClient: SupabaseClient | null = null;
let loading: Promise<SupabaseClient | null> | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

// The Supabase SDK stays out of the startup bundle; most installs never sync.
export function loadSupabaseClient(): Promise<SupabaseClient | null> {
  if (!url || !anonKey) return Promise.resolve(null);
  loading ??= import('@supabase/supabase-js')
    .then(({ createClient }) => {
      cachedClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return cachedClient;
    })
    .catch((error: unknown) => {
      loading = undefined;
      throw error;
    });
  return loading;
}

// Null until loadSupabaseClient() resolves, and always null when not configured.
export function getSupabaseClient(): SupabaseClient | null {
  return cachedClient;
}

export async function getSession(): Promise<Session | null> {
  const client = await loadSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}
