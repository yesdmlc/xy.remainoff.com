const fs = require("fs");
const path = require("path");
const { DateTime } = require("luxon");
const imageShortcode = require("./src/utils/image");


module.exports = function(eleventyConfig) {
  // 🔍 Debug: Check if layout file exists
  const layoutPath = path.resolve(__dirname, "src/_includes/layouts/base.njk");
  console.log("🔍 Checking layout path:", layoutPath);
  console.log("🔍 Exists?", fs.existsSync(layoutPath));

  // Add date filter for Nunjucks
  eleventyConfig.addFilter("date", (dateObj, format = "yyyy-MM-dd") => {
    return DateTime.fromJSDate(dateObj).toFormat(format);
  });

  // Register image shortcodes
  eleventyConfig.addNunjucksAsyncShortcode("optimizedImage", imageShortcode);
  eleventyConfig.addLiquidShortcode("optimizedImage", imageShortcode);
  eleventyConfig.addJavaScriptFunction("optimizedImage", imageShortcode);

  // Passthrough copy for static assets
  eleventyConfig.addPassthroughCopy("src/assets");

  // Add posts collection
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md");
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      layouts: "_includes/layouts", 
      output: "_site"
    }
  };
};