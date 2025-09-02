const imageShortcode = require("./src/utils/image");
const { DateTime } = require("luxon");
const fs = require('fs');
const path = require('path');
const getPostsWithSignedImageUrls = require('./scripts/fetchPosts');
const getCollectionsWithSignedUrls = require('./scripts/fetchCollections');


module.exports = function (eleventyConfig) {
  eleventyConfig.addFilter("date", (dateObj, format = "yyyy-MM-dd") => {
    return DateTime.fromJSDate(dateObj).toFormat(format);
  });

  eleventyConfig.addNunjucksAsyncShortcode("optimizedImage", imageShortcode);
  eleventyConfig.addPassthroughCopy("src/assets");


  eleventyConfig.addCollection("posts", collection => {
    // Include nested posts and multiple template types
    return collection.getFilteredByGlob("src/posts/**/*.{md,njk,html}");
  });

  // Rename to avoid collision with tag-based collections['collections']
  eleventyConfig.addCollection("allCollections", function (collectionApi) {
    // Include nested collections and multiple template types
    return collectionApi.getFilteredByGlob("src/collections/**/*.{md,njk,html}");
  });

  // Latest Collections: all items in src/collections sorted newest-first
  eleventyConfig.addCollection('latestCollections', (collectionApi) => {
    return collectionApi
      .getFilteredByGlob('src/collections/**/*.{md,njk,html}')
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  });

  // Replace or add a robust exists filter that resolves from project root
  eleventyConfig.addNunjucksFilter('exists', (p) => {
    if (!p || typeof p !== 'string') return false;
    try {
      const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
      return fs.existsSync(abs);
    } catch (_) {
      return false;
    }
  });

  eleventyConfig.addGlobalData("supabasePosts", async () => {
    return await getPostsWithSignedImageUrls();
  });

  eleventyConfig.addGlobalData("photoCollections", async () => {
    return await getCollectionsWithSignedUrls();
  });

  eleventyConfig.addNunjucksShortcode("supabaseUrl", function() {
    return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  });

  eleventyConfig.addNunjucksShortcode("supabaseAnonKey", function() {
    return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  });

  eleventyConfig.addNunjucksFilter("supabaseConfig", function() {
    return JSON.stringify({
      url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    });
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

  // ✅ Register custom filter
  eleventyConfig.addFilter("filterPublicMarkdownPosts", function (posts) {
    return posts.filter(post =>
      post.data &&
      post.data.access_level === "public" &&
      typeof post.data.slug === "string" &&
      post.data.slug.length > 0 &&
      typeof post.data.image === "string" &&
      post.data.image.length > 0
    );
  });

  eleventyConfig.on('beforeBuild', ({ templateMap }) => {
    if (templateMap) {
      const inputs = templateMap.getInputPaths();
      const duplicates = inputs.filter((item, index) => inputs.indexOf(item) !== index);
      console.log("🔍 All input templates:", inputs);
      if (duplicates.length) {
        console.warn("⚠️ Duplicate input paths detected:", duplicates);
      }
    }
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "11ty.js"],
  };
};