const eleventyImage = /** @type {any} */ (require("@11ty/eleventy-img"));
const path = require("path");

/**
 * @typedef {{ src: string; alt?: string }} ImageOpts
 */

/**
 * @param {ImageOpts} opts
 * @returns {Promise<string>}
 */
module.exports = async function imageShortcode({ src, alt }) {
  try {
    if (typeof src !== 'string' || !src.trim()) return '';
    const safeAlt = typeof alt === 'string' && alt.trim() ? alt : 'Post image';

    // ✅ Prepend image directory if src is just a filename
    const fullSrc = src.startsWith('src/') ? src : path.join('src/images/originals', src);

    const metadata = await eleventyImage(fullSrc, {
      widths: [600, 1200, 1600],
      formats: ['avif', 'webp', 'jpeg'],
      urlPath: '/img/',
      outputDir: './_site/img/',
      sharpOptions: {
        quality: 80,
        animated: true,
      },
    });

    const imageAttributes = {
      alt: safeAlt,
      sizes: '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 1200px',
      loading: 'lazy',
      decoding: 'async',
    };

    return eleventyImage.generateHTML(metadata, imageAttributes, {
      whitespaceMode: 'inline',
    });
  } catch (err) {
    console.error('optimizedImage shortcode failed:', err);
    return '';
  }
};