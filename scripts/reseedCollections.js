const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const collection = process.argv[2]; // e.g. '2025-07-darkness-in-shower'
if (!collection || typeof collection !== 'string') {
  console.error('❌ Please provide a collection name: node reseedCollections.js <collection>');
  process.exit(1);
}

// Construct cover image URL
const coverImagePath = `public/${collection}-photo-1.jpeg`;
const coverImageUrl = `${SUPABASE_URL}/storage/v1/object/public/photos/${coverImagePath}`;

// Format title from slug
const title = collection.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Detect access level based on folder contents
const baseFolder = path.join(__dirname, '..', 'src', 'images', 'originals', collection);
const accessLevels = ['public', 'member', 'premium'];
let detectedLevel = 'public';
let photoCount = 0;

for (const level of accessLevels) {
  const folderPath = path.join(baseFolder, level);
  if (fs.existsSync(folderPath)) {
    const files = fs.readdirSync(folderPath).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpeg', '.jpg', '.png', '.webp'].includes(ext);
    });
    photoCount += files.length;
    if (files.length > 0) detectedLevel = level; // last level with files wins
  }
}

// Add local image path for public collections
let localImage = null;
if (detectedLevel === 'public') {
  const jpgPath = path.join(baseFolder, 'public', `${collection}-photo-1.jpg`);
  const jpegPath = path.join(baseFolder, 'public', `${collection}-photo-1.jpeg`);
  if (fs.existsSync(jpgPath)) {
    localImage = `src/images/originals/${collection}/public/${collection}-photo-1.jpg`;
  } else if (fs.existsSync(jpegPath)) {
    localImage = `src/images/originals/${collection}/public/${collection}-photo-1.jpeg`;
  }
}

(async () => {
  // Build base upsert object (no image property initially)
  const baseObj = {
    title,
    slug: collection,
    folder: collection,
    cover_image_url: coverImageUrl,
    description: `Auto-updated collection for ${title}`,
    access_level: detectedLevel,
    photo_count: photoCount
  };

  // Only add image key if we have a local image path
  const upsertObj = (typeof localImage === 'string') ? { ...baseObj, image: localImage } : baseObj;

  const { error } = await supabase
    .from('collections')
    .upsert([
      upsertObj
    ], {
      onConflict: 'slug'
    });

  if (error) {
    console.error(`❌ Failed to update collection:`, error.message);
  } else {
    console.log(`✅ Collection '${title}' updated with access level '${detectedLevel}' and ${photoCount} photos`);
    if (localImage) console.log(`   Local image path: ${localImage}`);
  }
})();
