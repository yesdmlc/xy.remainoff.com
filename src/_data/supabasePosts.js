const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const getPostsWithSignedImageUrls = require('../../scripts/fetchPosts'); // adjust path if needed

/*
pagination:
  data: supabasePosts
  size: 1
  alias: post
  addAllPagesToCollections: true
  key: "{{ post.slug }}"
*/

module.exports = async function () {
  const posts = await getPostsWithSignedImageUrls();
  const cleanPosts = [];
  const expiresIn = 60 * 60 * 24; // 24 hours

  const seen = new Set();

  for (const post of posts) {
    if (post.access_level !== 'public') continue;
    if (!post.slug || seen.has(post.slug)) continue;
    seen.add(post.slug);

    // Get signed image URL
    let signedUrl = null;
    if (post.image_url) {
      const { data: signed } = await supabase.storage
        .from('media')
        .createSignedUrl(post.image_url, expiresIn);
      signedUrl = signed?.signedUrl || null;
    }

    // Normalize date
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

  console.log("✅ Final deduplicated posts:", cleanPosts.map(p => p.slug));

  const slugCounts = {};
  cleanPosts.forEach(post => {
    if (!post.slug) return;
    slugCounts[post.slug] = (slugCounts[post.slug] || 0) + 1;
  });
  console.log("🔍 Slug counts:", slugCounts);

  return cleanPosts;
};