const { supabase } = require('../src/utils/supabaseClient');

async function getPostsWithSignedImageUrls() {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const signedPosts = await Promise.all(
    posts.map(async (post) => {
      // Clone post.data if needed
      const images = post.data?.images;

      if (Array.isArray(images)) {
        const signedImages = await Promise.all(
          images.map(async (imgPath) => {
            const { data: signedData, error: signError } = await supabase
              .storage
              .from('media')
              .createSignedUrl(imgPath, 3600);

            return signedData?.signedUrl || '/img/fallback-thumb.jpg';
          })
        );

        post.data.images = signedImages;
      }

      return post;
    })
  );

  return signedPosts;
}

module.exports = getPostsWithSignedImageUrls;
