const eleventyImage = require("@11ty/eleventy-img");
const path = require("path");

module.exports = async function imageShortcode(src, alt, widths = [600, 1200, 1600], formats = ["avif", "webp", "jpeg"]) {
  if (!alt) {
    throw new Error(`Missing \`alt\` on image from: ${src}`);
  }

  const fullSrc = path.join("src/images/originals", src);

  let metadata = await eleventyImage(fullSrc, {
    widths: widths,
    formats: formats,
    outputDir: "./_site/img/",
    urlPath: "/img/",
    sharpOptions: {
      quality: 80, // 🧠 Better visual fidelity
      animated: true
    }
  });

  let imageAttributes = {
    alt,
    sizes: "(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 1200px", // 🧠 Smarter responsive sizing
    loading: "lazy", // Change to "eager" for hero images
    decoding: "async"
  };

  return eleventyImage.generateHTML(metadata, imageAttributes, {
    whitespaceMode: "inline"
  });
};