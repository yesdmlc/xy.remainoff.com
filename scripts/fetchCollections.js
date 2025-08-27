const { supabase } = require('../src/utils/supabaseClient');
const { extractStorageKey } = require('../src/utils/supabaseHelpers');



async function getCollectionsWithSignedUrls() {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const signedCollections = await Promise.all(
    data.map(async (collection) => {
      const key = extractStorageKey(collection.cover_image_url);

      if (key) {
        const { data: signedData, error: signError } = await supabase
          .storage
          .from('photos')
          .createSignedUrl(key, 3600);

        if (signedData?.signedUrl) {
          collection.cover_image_url = signedData.signedUrl;
        } else {
          console.warn(`❌ Signing failed for key: ${key}`);
          collection.cover_image_url = null;
        }
      } else {
        console.warn(`⚠️ Could not extract key from URL: ${collection.cover_image_url}`);
        collection.cover_image_url = null;
      }

      return collection;
    })
  );

  // Remove duplicate slugs to prevent Eleventy output conflicts
  const seen = new Set();
  const uniqueCollections = signedCollections.filter(col => {
    if (!col.slug) return false;
    if (seen.has(col.slug)) return false;
    seen.add(col.slug);
    return true;
  });

  return uniqueCollections;
}

module.exports = getCollectionsWithSignedUrls;
