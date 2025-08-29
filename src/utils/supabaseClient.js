// Example: Supabase client setup (ESM)
// import { createClient } from '@supabase/supabase-js'
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase env vars: SUPABASE_URL and SUPABASE_ANON_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getCollections() {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function getSignedCoverImage(slug) {
  const { data, error } = await supabase
    .from('posts')
    .select('image_url')
    .eq('slug', slug)
    .single();

  if (!data?.image_url) {
    console.error(`❌ No image_url found for slug "${slug}"`);
    return null;
  }

  const imageKey = data.image_url;
  console.log(`🔑 Attempting to sign: ${imageKey} from bucket: media`);

  const { data: signed, error: signError } = await supabase
    .storage
    .from('media')
    .createSignedUrl(imageKey, 3600);

  if (!signError && signed?.signedUrl) {
    return signed.signedUrl;
  }

  console.error(`❌ Failed to sign image for slug "${slug}"`);
  return null;
}


module.exports = { supabase, getCollections, getSignedCoverImage };

// Optional: expose to browser for debugging
if (typeof window !== 'undefined') {
  window.supabaseClient = supabase;
}
