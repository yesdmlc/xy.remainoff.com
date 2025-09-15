const imageShortcode = require("./src/utils/image");
const { DateTime } = require("luxon");
const fs = require("fs");
const path = require("path");
const getPostsWithSignedImageUrls = require("./scripts/fetchPosts");
const getCollectionsWithSignedUrls = require("./scripts/fetchCollections");

module.exports = function (eleventyConfig) {
  // Filters
  eleventyConfig.addFilter("date", (dateObj, format = "yyyy-MM-dd") => {
    return DateTime.fromJSDate(dateObj).toFormat(format);
  });

  eleventyConfig.addFilter("merge", (arr1, arr2) => {
    return [...(Array.isArray(arr1) ? arr1 : []), ...(Array.isArray(arr2) ? arr2 : [])];
  });

  eleventyConfig.addFilter("sortByDate", (arr) => {
    return arr.slice().sort((a, b) => {
      const aDate = new Date(a.data?.date || a.date);
      const bDate = new Date(b.data?.date || b.date);
      return bDate - aDate;
    });
  });

  eleventyConfig.addFilter("filterPublicMarkdownPosts", function (posts) {
    return posts.filter(post =>
      post.data &&
      post.data.access_level === "public" &&
      typeof post.data.slug === "string" &&
      post.data.slug.length > 0 &&
      typeof post.data.cover_image === "string" &&
      post.data.cover_image.length > 0
    );
  });

  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toFormat("MMMM dd, yyyy");
  });

  eleventyConfig.addNunjucksFilter("exists", (p) => {
    if (!p || typeof p !== "string") return false;
    try {
      const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
      return fs.existsSync(abs);
    } catch (_) {
      return false;
    }
  });

  // Shortcodes
  eleventyConfig.addNunjucksAsyncShortcode("optimizedImage", imageShortcode);

  eleventyConfig.addNunjucksShortcode("supabaseUrl", () => {
    return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  });

  eleventyConfig.addNunjucksShortcode("supabaseAnonKey", () => {
    return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  });

  eleventyConfig.addNunjucksFilter("supabaseConfig", () => {
    return JSON.stringify({
      url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    });
  });

  // Passthrough copy for static assets
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/images"); // ✅ Enables local post cover images

  // Collections
  eleventyConfig.addCollection("posts", collection => {
    return collection.getFilteredByTag("posts");
  });

  eleventyConfig.addCollection("allCollections", async () => {
    return await getCollectionsWithSignedUrls();
  });

  eleventyConfig.addCollection("latestCollections", collectionApi => {
    return collectionApi
      .getFilteredByGlob("src/collections/**/*.{md,njk,html}")
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  });

  // Global Data
  eleventyConfig.addGlobalData("supabasePosts", async () => {
    return await getPostsWithSignedImageUrls();
  });

  eleventyConfig.addGlobalData("photoCollections", async () => {
    return await getCollectionsWithSignedUrls();
  });

  // Directory and formats
  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["md", "11ty.md", "njk", "11ty.js"],
  };
};