const { supabase } = require('../src/utils/supabaseClient');

async function getCollectionsWithSignedUrls() {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('published', true); // Optional: filter only published collections

  if (error) {
    console.error('Supabase fetch error:', error);
    return [];
  }

  // Deduplicate by slug
  const seen = new Set();
  const deduped = data.filter(c => {
    const slug = c.slug?.trim().toLowerCase();
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });

  // Normalize structure for downstream use
  return deduped.map(c => ({
    ...c,
    slug: c.slug?.trim().toLowerCase(),
    folder: c.folder?.trim(),
    access_level: c.access_level?.trim().toLowerCase(),
    cover_image_url: c.cover_image_url || '',
    title: c.title || 'Untitled',
    // Optional: expose gated folders for JS loaders
    member_folder: c.folder ? `member/${c.folder.trim()}` : null,
    premium_folder: c.folder ? `premium/${c.folder.trim()}` : null
  }));
}

module.exports = getCollectionsWithSignedUrls;