import { supabaseAdmin } from './supabase';
export async function getSetting(key: string){ const { data } = await supabaseAdmin.from('settings').select('value').eq('key', key).single(); return data?.value ?? null; }
export async function setSetting(key: string, value: any){ await supabaseAdmin.from('settings').upsert({ key, value }); }


