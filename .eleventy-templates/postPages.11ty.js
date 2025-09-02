module.exports = class {
  data() {
    return {
      pagination: {
        data: "supabasePosts",
        size: 1,
        alias: "post",
        key: (data) => data.slug,
      },
      permalink: ({ post }) => `/posts/${post.slug}/`,
      eleventyComputed: {
        layout: "layouts/base.njk", // explicitly resolve layout path
      },
    };
  }

  render({ post }) {
    return `
      <h1>${post.title}</h1>
      <img src="${post.signed_cover_image_url}" alt="${post.alt || post.title}">
      ${post.content}
    `;
  }
};