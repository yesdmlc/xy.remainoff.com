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
    const folder = c.folder?.trim();
    const accessLevel = c.access_level?.trim().toLowerCase();

    if (!slug || seenSlugs.has(slug) || !folder || !accessLevel) continue;

    let imagePath = null;
    let signedCoverImageUrl = null;
    if (c.cover_image_url) {
      try {
        const url = new URL(c.cover_image_url);
        imagePath = url.pathname.replace(/^\/storage\/v1\/object\/public\/photos\//, '');
        signedCoverImageUrl = c.signed_cover_image_url || c.cover_image_url;
      } catch (e) {
        console.error(`❌ Failed to extract image path for slug "${slug}":`, e);
      }
    }

    const slugPrefix = `${slug}-`;

    let publicImages = [];
    let memberImages = [];
    let premiumImages = [];

    // Load public images
    try {
      const { data: files } = await supabase.storage.from('photos').list('public');
      publicImages = (files || [])
        .filter(file => file.name.startsWith(slugPrefix))
        .map(file => ({
          path: `public/${file.name}`,
          alt: c.title || file.name
        }));
    } catch (e) {
      console.warn(`⚠️ Failed to load public images for "${slug}":`, e);
    }

    // Load member images
    try {
      const { data: files } = await supabase.storage.from('photos').list('member');
      memberImages = (files || [])
        .filter(file => file.name.startsWith(slugPrefix))
        .map(file => ({
          path: `member/${file.name}`,
          alt: c.title || file.name
        }));
    } catch (e) {
      console.warn(`⚠️ Failed to load member images for "${slug}":`, e);
    }

    // Load premium images
    try {
      const { data: files } = await supabase.storage.from('photos').list('premium');
      premiumImages = (files || [])
        .filter(file => file.name.startsWith(slugPrefix))
        .map(file => ({
          path: `premium/${file.name}`,
          alt: c.title || file.name
        }));
    } catch (e) {
      console.warn(`⚠️ Failed to load premium images for "${slug}":`, e);
    }

    seenSlugs.add(slug);
    cleanCollections.push({
      ...c,
      slug,
      cover_image_path: imagePath,
      signed_cover_image_url: signedCoverImageUrl,
      images: publicImages,
      photo_count: publicImages.length,
      member_images: memberImages,
      premium_images: premiumImages
    });
  }

  console.log("✅ Final deduplicated slugs:", cleanCollections.map(c => c.slug));
  console.log("📸 Photo counts:", cleanCollections.map(c => `${c.slug}: ${c.photo_count}`));

  return cleanCollections;
};