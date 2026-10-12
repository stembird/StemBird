// Browser/shared anon client — uses centralized env helpers with fallbacks.
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabaseEnv';

let supabaseClient: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (supabaseClient) {
    return supabaseClient;
  }

  supabaseClient = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
  return supabaseClient;
};

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    return (client as any)[prop];
  },
});

export { createClient };
