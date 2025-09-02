module.exports = {
  pagination: {
    data: "publicSupabasePosts", // array of posts from Supabase
    size: 1,                     // one page per post
    alias: "post"               // each page gets a `post` variable
  },
  permalink: data => `/posts/${data.post.slug}/`, // generates /posts/in-the-forest/
  template: "post.njk",         // uses your post.njk template
  eleventyComputed: {
    title: data => data.post.title
  }
};
