const supabasePosts = require('./supabasePosts');

module.exports = async function () {
  const posts = await supabasePosts();
  return posts.filter(p =>
    p.access_level === 'public' &&
    p.image_url &&
    p.image_url.includes('/object/sign/')
  );
};
