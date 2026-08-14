import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from env or local storage configuration
const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
const envKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '';

const localUrl = typeof window !== 'undefined' ? localStorage.getItem('supabase_custom_url') || '' : '';
const localKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_custom_key') || '' : '';

export const SUPABASE_URL = localUrl || envUrl;
export const SUPABASE_ANON_KEY = localKey || envKey;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('your-project')
);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!client) {
    try {
      client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.warn('[Supabase] Init error:', err);
      client = null;
    }
  }
  return client;
}

export function saveCustomSupabaseConfig(url: string, key: string) {
  if (typeof window !== 'undefined') {
    if (url.trim() && key.trim()) {
      localStorage.setItem('supabase_custom_url', url.trim());
      localStorage.setItem('supabase_custom_key', key.trim());
    } else {
      localStorage.removeItem('supabase_custom_url');
      localStorage.removeItem('supabase_custom_key');
    }
    // Reset instance
    client = null;
  }
}
