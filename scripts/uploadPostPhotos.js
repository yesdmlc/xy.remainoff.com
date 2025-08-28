const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const mime = require('mime-types');
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const accessLevels = ['public', 'member', 'premium'];

// CLI args: node uploadPostPhotos.js <source-folder> <storage-prefix>
// - <source-folder>: local folder under src/images/originals (default 'Posts')
// - <storage-prefix>: object prefix inside 'photos' or 'media' bucket (default to source-folder lowercased)
const SRC_ROOT = process.argv[2] || 'Posts';
const STORAGE_PREFIX = (process.argv[3] || process.argv[2] || 'Posts').toLowerCase();
const BUCKET_NAME = STORAGE_PREFIX.startsWith('post-images') ? 'media' : 'photos';

const baseFolder = path.join(__dirname, '..', 'src', 'images', 'originals', SRC_ROOT);

(async () => {
  console.log(`Using local source: ${baseFolder}`);
  console.log(`Uploading to bucket: ${BUCKET_NAME}`);
  console.log(`Object key prefix: ${STORAGE_PREFIX}/<level>/...`);

  if (!fs.existsSync(baseFolder)) {
    console.error(`❌ Source folder not found: ${baseFolder}`);
    console.error('Usage: node scripts/uploadPostPhotos.js <source-folder> <storage-prefix>');
    console.error('Example: node scripts/uploadPostPhotos.js post-images post-images');
    process.exit(1);
  }

  for (const level of accessLevels) {
    const folderPath = path.join(baseFolder, level);
    if (!fs.existsSync(folderPath)) {
      console.warn(`⚠️ Skipping missing folder: ${folderPath}`);
      continue;
    }

    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const inputPath = path.join(folderPath, file);
      const ext = path.extname(file).toLowerCase();
      const mimeType = mime.lookup(ext);

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        console.warn(`⚠️ Skipping unsupported file type: ${file}`);
        continue;
      }

      try {
        const basePath = `${STORAGE_PREFIX}/${level}`; // e.g., post-images/public
        const outputFileName = file;
        const thumbFileName = file.replace(ext, `_thumb.jpeg`);
        const blurFileName = file.replace(ext, `_blur.jpeg`);
        const blurFullFileName = file.replace(ext, `_blurfull.jpeg`);

        const fullBuffer = await sharp(inputPath).resize(1600).jpeg({ quality: 80 }).toBuffer();
        const thumbBuffer = await sharp(inputPath).resize(400).jpeg({ quality: 60 }).toBuffer();
        const blurBuffer = await sharp(inputPath).resize(80).blur(6).jpeg({ quality: 30 }).toBuffer();
        const blurFullBuffer = await sharp(inputPath).resize(800).blur(16).jpeg({ quality: 45 }).toBuffer();

        const uploads = [
          { name: outputFileName, buffer: fullBuffer },
          { name: thumbFileName, buffer: thumbBuffer },
          { name: blurFileName, buffer: blurBuffer },
          { name: blurFullFileName, buffer: blurFullBuffer }
        ];

        for (const { name, buffer } of uploads) {
          const objectKey = `${basePath}/${name}`;
          console.log(`Uploading -> ${BUCKET_NAME}/${objectKey}`);
          const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(objectKey, buffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (error) {
            console.error(`❌ Failed to upload ${name}:`, error.message);
          } else {
            console.log(`✅ Uploaded ${name} to ${BUCKET_NAME}/${basePath}`);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`❌ Error processing ${file}:`, msg);
      }
    }
  }
})();
