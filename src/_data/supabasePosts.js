const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = async function () {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, date')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Supabase posts fetch error:', error);
    return [];
  }

  const cleanPosts = [];
  const expiresIn = 60 * 60 * 24; // 24 hours

  for (const post of posts) {
    if (post.access_level !== 'public') continue;

    // Get image_url for this post
    let signedUrl = null;
    if (post.image_url) {
      const { data: signed, error: signError } = await supabase.storage
        .from('media')
        .createSignedUrl(post.image_url, expiresIn);
      signedUrl = signed?.signedUrl || null;
    }

    // Ensure date is a JS Date object for Nunjucks compatibility
    let date = post.date;
    if (date && typeof date === 'string' && date.length === 10) {
      date = new Date(date + 'T00:00:00Z');
    } else if (date && typeof date === 'string') {
      date = new Date(date);
    }

    cleanPosts.push({
      ...post,
      date,
      signed_cover_image_url: signedUrl
    });
  }

  console.log("✅ Final posts with signed URLs:", cleanPosts.map(p => p.slug));
  return cleanPosts;
};