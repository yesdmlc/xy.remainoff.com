const getPostsWithSignedImageUrls = require('../../scripts/fetchPosts');

module.exports = async function (data) {
  const supabasePosts = await getPostsWithSignedImageUrls();

  const markdownPosts = (data?.collections?.posts || []).filter(post =>
    post.data &&
    post.data.access_level === 'public' &&
    typeof post.data.slug === 'string' &&
    post.data.slug.length > 0
  );

  const normalizedMarkdownPosts = markdownPosts.map(post => ({
    title: post.data.title,
    slug: post.data.slug,
    alt: post.data.alt,
    access_level: post.data.access_level,
    date: post.data.date,
    caption: post.data.caption,
    tags: post.data.tags
  }));

  const allPosts = [...supabasePosts, ...normalizedMarkdownPosts].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  return allPosts;
};