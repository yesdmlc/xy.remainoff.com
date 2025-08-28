const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔒 Lock to post-images structure
const SOURCE_ROOT = 'post-images';
const baseFolder = path.join(__dirname, '..', 'src', 'images', 'originals', SOURCE_ROOT);
const accessLevels = ['public', 'member', 'premium'];
const validExtensions = ['.jpeg', '.jpg', '.png', '.webp'];

const bucketName = 'media';
const prefix = 'post-images';

const postMap = new Map(); // slug → { access_level, photo_count, image_url }

for (const level of accessLevels) {
  const folderPath = path.join(baseFolder, level);
  if (!fs.existsSync(folderPath)) continue;

  const files = fs.readdirSync(folderPath).filter(f =>
    validExtensions.includes(path.extname(f).toLowerCase())
  );

  for (const file of files) {
    const slug = path.basename(file, path.extname(file));
    const imagePath = `${prefix}/${level}/${file}`;
    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${imagePath}`;

    console.log(`📝 Seeding: ${slug} → ${imageUrl}`);

    if (!postMap.has(slug)) {
      postMap.set(slug, {
        slug,
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        access_level: level,
        photo_count: 1,
        image_url: imageUrl
      });
    } else {
      const entry = postMap.get(slug);
      entry.photo_count += 1;
      if (accessLevels.indexOf(level) > accessLevels.indexOf(entry.access_level)) {
        entry.access_level = level;
        entry.image_url = imageUrl;
      }
    }
  }
}

(async () => {
  const posts = Array.from(postMap.values());
  if (!posts.length) {
    console.log(`⚠️ No post images found in ${SOURCE_ROOT} folder.`);
    return;
  }

  // Optional: Clear existing posts before reseeding
  // await supabase.from('posts').delete().neq('slug', '');
  // console.log('🧹 Cleared existing posts');

  const { error } = await supabase.from('posts').upsert(posts, { onConflict: 'slug' });

  if (error) {
    console.error(`❌ Failed to update posts:`, error.message);
  } else {
    console.log(`✅ Updated ${posts.length} posts from ${SOURCE_ROOT} folder (bucket: ${bucketName}).`);
  }
})();
