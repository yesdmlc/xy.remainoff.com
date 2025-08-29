module.exports = async function () {
  const allPosts = await require('./supabasePosts')();

  const publicPosts = allPosts.filter(p =>
    p.access_level === 'public' &&
    typeof p.signed_cover_image_url === 'string' &&
    p.signed_cover_image_url.length > 0
  );

  return publicPosts;
};