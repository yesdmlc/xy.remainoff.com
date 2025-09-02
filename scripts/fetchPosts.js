const { supabase } = require('../src/utils/supabaseClient');

async function getPostsWithSignedImageUrls() {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, created_at, slug, title, content, access_level, alt, caption, tags, image_url, date')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const signedPosts = posts.map(post => ({
    ...post,
    signed_cover_image_url: post.image_url || '/img/fallback-thumb.jpg'
  }));

  return signedPosts;
}

module.exports = getPostsWithSignedImageUrls;
