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

  const cleanPosts = [];

  for (const post of data) {
    if (
      post.access_level !== 'public' ||
      !post.image_url ||
      post.image_url.includes('/object/sign/')
    ) continue;

    let imagePath = null;
    try {
      const url = new URL(post.image_url);
      imagePath = url.pathname.replace(/^\/storage\/v1\/object\/public\/media\//, 'media/');
    } catch (e) {
      console.error(`❌ Failed to extract image path for post: ${post.title}`, e);
      imagePath = null;
    }

    if (imagePath) {
      cleanPosts.push({
        ...post,
        image_path: imagePath, // only the storage key, e.g. 'media/public/image.jpg'
      });
    }
  }

  console.log("✅ Final posts with storage keys:", cleanPosts.map(p => p.slug));
  return cleanPosts;
};