// scripts/seedCollections.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("Missing Supabase env vars. Skipping fetch.");
  process.exit(0);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const collection = process.argv[2]; // e.g. '2025-06-burnaby'
if (!collection) {
  console.error('❌ Please provide a collection name: node seedCollections.js <collection>');
  process.exit(1);
}

// Construct cover image URL
const coverImagePath = `public/${collection}-photo-1.jpeg`;
const coverImageUrl = `${SUPABASE_URL}/storage/v1/object/public/photos/${coverImagePath}`;

// Format title from slug
const title = collection.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Detect access level and count photos
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

(async () => {
  // Add local image path for public collections
  let localImage = null;
  if (detectedLevel === 'public') {
    // Try .jpg first, then .jpeg in the originals/public folder
    const jpgPath = path.join(baseFolder, 'public', `${collection}-photo-1.jpg`);
    const jpegPath = path.join(baseFolder, 'public', `${collection}-photo-1.jpeg`);
    if (fs.existsSync(jpgPath)) {
      localImage = `src/images/originals/${collection}/public/${collection}-photo-1.jpg`;
    } else if (fs.existsSync(jpegPath)) {
      localImage = `src/images/originals/${collection}/public/${collection}-photo-1.jpeg`;
    }
  }

  const { error } = await supabase
    .from('collections')
    .insert([
      {
        title,
        slug: collection,
        folder: collection,
        cover_image_url: coverImageUrl,
        description: `Auto-seeded collection for ${title}`,
        access_level: detectedLevel,
        photo_count: photoCount,
      }
    ]);

  if (error) {
    console.error(`❌ Failed to insert collection:`, error.message);
  } else {
    console.log(`✅ Collection '${title}' seeded with ${photoCount} photos (level: ${detectedLevel}) and cover image: ${coverImageUrl}`);
    if (localImage) console.log(`   Local image path: ${localImage}`);
  }
})();
