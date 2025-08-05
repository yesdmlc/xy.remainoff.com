const eleventyImage = require("@11ty/eleventy-img");
const path = require("path");

module.exports = async function({ src, alt }) {
  if (!src) return ""; // ✅ Prevent crash if src is missing

  // ✅ Prepend image directory if src is just a filename
  const fullSrc = src.startsWith("src/") ? src : path.join("src/images/originals", src);

  let metadata = await eleventyImage(fullSrc, {
    widths: [600, 1200, 1600],
    formats: ["avif", "webp", "jpeg"],
    urlPath: "/img/",
    outputDir: "./_site/img/",
    sharpOptions: {
      quality: 80,
      animated: true
    }
  });

  let imageAttributes = {
    alt: alt || "Post image",
    sizes: "(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 1200px",
    loading: "lazy",
    decoding: "async"
  };

  return eleventyImage.generateHTML(metadata, imageAttributes, {
    whitespaceMode: "inline"
  });
};