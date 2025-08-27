module.exports = {
  eleventyComputed: {
    permalink: (data) => {
      const slug = data.galleryEntry?.slug;
      return slug ? `/collections/${slug}/index.html` : false;
    }
  }
};