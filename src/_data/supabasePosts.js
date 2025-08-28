const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const { createClient } = require('@supabase/supabase-js');

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

module.exports = async function () {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Supabase posts fetch error:', error);
    return [];
  }

  const signedPosts = [];

  for (const post of data) {
    if (
      post.access_level !== 'public' ||
      !post.image_url ||
      post.image_url.includes('/object/sign/')
    ) continue;

    console.log("🔍 Raw image_url:", post.image_url);


    try {
      const url = new URL(post.image_url);
      const rawPath = decodeURIComponent(
        url.pathname.replace('/storage/v1/object/public/media/', '')
      );



      // ✅ Use correct folder inside 'media' bucket
      const correctedPath = rawPath.replace(/^Posts\//, 'post-images/');

      const { data: signed } = await supabase.storage
        .from('media')
        .createSignedUrl(rawPath, 3600);


      if (signed?.signedUrl) {
        signedPosts.push({
          ...post,
          image_url: signed.signedUrl,
        });
      } else {
        console.warn(`⚠️ No signed URL returned for ${correctedPath}`);
      }
    } catch (e) {
      console.error(`❌ Failed to sign post image: ${post.title}`, e);
    }
  }

  console.log("✅ Final signed posts:", signedPosts.map(p => p.image_url));
  return signedPosts;
};