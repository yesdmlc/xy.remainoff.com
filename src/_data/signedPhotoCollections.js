const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

module.exports = async function () {
  if (!supabase) return [];

  const getCollectionsWithSignedUrls = require('../../scripts/fetchCollections');
  const rawCollections = await getCollectionsWithSignedUrls();

  const seenSlugs = new Set();
  const signedCollections = [];

  for (const c of rawCollections) {
    const slug = c.slug?.trim().toLowerCase();
    if (!slug || seenSlugs.has(slug)) continue;

    let signedUrl = null;
    if (c.cover_image_url) {
      try {
        const url = new URL(c.cover_image_url);
        const fullPath = url.pathname.replace(/^\/storage\/v1\/object\/public\/photos\//, '');
        const { data } = await supabase.storage
          .from('photos')
          .createSignedUrl(fullPath, 3600);
        signedUrl = data?.signedUrl || null;
      } catch (e) {
        console.error(`❌ Failed to sign image for slug "${slug}":`, e);
        signedUrl = null;
      }
    }

    if (signedUrl) {
      seenSlugs.add(slug);
      signedCollections.push({
        ...c,
        cover_image_url: signedUrl,
      });
    }
  }

  console.log("✅ Final signed and deduplicated slugs:", signedCollections.map(c => c.slug));
  return signedCollections;
};