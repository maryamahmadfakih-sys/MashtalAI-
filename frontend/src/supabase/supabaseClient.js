import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://drtnhykkcvnhmtcwedxx.supabase.co';
const supabaseKey = "sb_publishable_61tdoMJ_orGIFiYNXeZNTA_ZhJG6AMP";

export const supabase = createClient(supabaseUrl, supabaseKey);