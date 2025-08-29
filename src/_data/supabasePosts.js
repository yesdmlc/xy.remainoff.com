const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const { getSignedCoverImage } = require('../utils/supabaseClient');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = async function () {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Supabase posts fetch error:', error);
    return [];
  }

  const cleanPosts = [];

  for (const post of posts) {
    if (post.access_level !== 'public') continue;

    const signedUrl = await getSignedCoverImage(post.slug);

    cleanPosts.push({
      ...post,
      signed_cover_image_url: signedUrl
    });
  }

  console.log("✅ Final posts with signed URLs:", cleanPosts.map(p => p.slug));
  return cleanPosts;
};