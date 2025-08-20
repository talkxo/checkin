import { createClient } from '@supabase/supabase-js';

// Avoid throwing during build if env vars are not injected yet (e.g., preview misconfig).
// We fall back to placeholders so the module can be imported; real values are read at runtime.
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role';

export const supabase = createClient(SB_URL, SB_ANON);
export const supabaseAdmin = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });


