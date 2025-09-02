const supabasePosts = require('./supabasePosts');

module.exports = async function (data) {
  const allSupabasePosts = await supabasePosts();

  // Get markdown posts from Eleventy collections
  const markdownPosts = data.collections?.posts || [];

  // Normalize markdown post data
  const formattedMarkdownPosts = markdownPosts.map(p => ({
    title: p.data.title,
    slug: p.data.slug,
    access_level: p.data.access_level || 'public',
    alt: p.data.alt,
    caption: p.data.caption,
    date: p.data.date,
    url: p.url,
    content: p.templateContent
  }));

  // Combine both sources
  const combinedPosts = [...allSupabasePosts, ...formattedMarkdownPosts];

  // Filter for public posts with valid slugs
  const publicPosts = combinedPosts.filter(p =>
    p.access_level === 'public' &&
    typeof p.slug === 'string' &&
    p.slug.length > 0
  );

  return publicPosts;
};
