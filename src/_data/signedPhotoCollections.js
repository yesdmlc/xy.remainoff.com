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
  const cleanCollections = [];

  for (const c of rawCollections) {
    const slug = c.slug?.trim().toLowerCase();
    if (!slug || seenSlugs.has(slug)) continue;

    let imagePath = null;
    if (c.cover_image_url) {
      try {
        const url = new URL(c.cover_image_url);
        imagePath = url.pathname.replace(/^\/storage\/v1\/object\/public\/photos\//, '');
      } catch (e) {
        console.error(`❌ Failed to extract image path for slug "${slug}":`, e);
        imagePath = null;
      }
    }

    if (imagePath) {
      seenSlugs.add(slug);
      cleanCollections.push({
        ...c,
        cover_image_path: `photos/${imagePath}`, // only the storage key
      });
    }
  }

  console.log("✅ Final deduplicated slugs with storage keys:", cleanCollections.map(c => c.slug));
  return cleanCollections;
};