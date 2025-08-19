// Example: Supabase client setup (ESM)
// import { createClient } from '@supabase/supabase-js'
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getCollections() {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

module.exports = { supabase, getCollections };
