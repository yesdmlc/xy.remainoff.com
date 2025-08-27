const { supabase } = require('../src/utils/supabaseClient');

async function getCollectionsWithSignedUrls() {
  const { data, error } = await supabase
    .from('collections')
    .select('*');

  if (error) {
    console.error('Supabase fetch error:', error);
    return [];
  }

  // Deduplicate by slug before returning
  const seen = new Set();
  const deduped = data.filter(c => {
    const slug = c.slug?.trim().toLowerCase();
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });

  return deduped;
}

module.exports = getCollectionsWithSignedUrls;
