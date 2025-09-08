const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function groupVariants(files, folder, slugPrefix, altText) {
  const map = {};
  for (const file of files || []) {
    if (!file.name.startsWith(slugPrefix)) continue;

    const isThumb = file.name.endsWith('_thumb.jpeg');
    const isBlur = file.name.endsWith('_blur.jpeg');
    const isFull = (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) && !file.name.includes('_');

    if (!isThumb && !isBlur && !isFull) continue;

    const base = file.name
      .replace(/_thumb\.jpeg$/, '')
      .replace(/_blur\.jpeg$/, '')
      .replace(/\.jpg$/, '')
      .replace(/\.jpeg$/, '');

    if (!map[base]) map[base] = { base, alt: altText };

    if (isThumb) {
      map[base].thumb = `${folder}/${file.name}`;
    } else if (isBlur) {
      map[base].blur = `${folder}/${file.name}`;
    } else if (isFull) {
      map[base].full = `${folder}/${file.name}`;
    }
  }
  return Object.values(map);
}

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

    const slugPrefix = `${slug}-photo-`;

    let publicImages = [];
    let memberImages = [];
    let premiumImages = [];

    // Load and group public images
    try {
      const { data: files } = await supabase.storage.from('photos').list('public');
      publicImages = groupVariants(files, 'public', slugPrefix, c.title);
    } catch (e) {
      console.warn(`⚠️ Failed to load public images for "${slug}":`, e);
    }

    // Load and group member images
    try {
      const { data: files } = await supabase.storage.from('photos').list('member');
      memberImages = groupVariants(files, 'member', slugPrefix, c.title);
    } catch (e) {
      console.warn(`⚠️ Failed to load member images for "${slug}":`, e);
    }

    // Load and group premium images
    try {
      const { data: files } = await supabase.storage.from('photos').list('premium');
      premiumImages = groupVariants(files, 'premium', slugPrefix, c.title);
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