const imageShortcode = require("./src/utils/image");
const { DateTime } = require("luxon");

module.exports = function(eleventyConfig) {
  eleventyConfig.addFilter("date", (dateObj, format = "yyyy-MM-dd") => {
    return DateTime.fromJSDate(dateObj).toFormat(format);
  });

  eleventyConfig.addNunjucksAsyncShortcode("optimizedImage", imageShortcode);
  eleventyConfig.addPassthroughCopy("src/assets");

  eleventyConfig.addCollection("posts", collection => {
    return collection.getFilteredByGlob("src/posts/*.md");
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