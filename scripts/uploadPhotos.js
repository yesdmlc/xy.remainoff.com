const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const mime = require('mime-types');
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const accessLevels = ['public', 'member', 'premium'];
const collection = process.argv[2]; // e.g. '2025-06-burnaby'

if (!collection) {
  console.error('❌ Please provide a collection name: node uploadPhotos.js <collection>');
  process.exit(1);
}

let photoIndex = 1;

(async () => {
  for (const level of accessLevels) {
    const folderPath = path.join(__dirname, '..', 'src', 'images', 'originals', collection, level);
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
        const metadata = await sharp(inputPath).metadata();
        console.log(`📸 ${file} detected as ${metadata.format}`);

        const fullBuffer = await sharp(inputPath)
          .resize(1600)
          .jpeg({ quality: 80 })
          .toBuffer();

        const thumbBuffer = await sharp(inputPath)
          .resize(400)
          .jpeg({ quality: 60 })
          .toBuffer();

        const outputFileName = `${collection}-photo-${photoIndex}.jpeg`;
        const thumbFileName = `${collection}-photo-${photoIndex}_thumb.jpeg`;
        const basePath = level === 'public' ? 'public' : `${collection}/${level}`;
        const fullPath = `${basePath}/${outputFileName}`;
        const thumbPath = `${basePath}/${thumbFileName}`;

        // Define blur variant filenames/paths early
        const blurFileName = `${collection}-photo-${photoIndex}_blur.jpeg`;
        const blurFullFileName = `${collection}-photo-${photoIndex}_blurfull.jpeg`;
        const blurPath = `${basePath}/${blurFileName}`;
        const blurFullPath = `${basePath}/${blurFullFileName}`;

        const { data: existingFull } = await supabase.storage
          .from('photos')
          .list(basePath, { search: outputFileName });

        const { data: existingThumb } = await supabase.storage
          .from('photos')
          .list(basePath, { search: thumbFileName });

        const { data: existingBlur } = await supabase.storage
          .from('photos')
          .list(basePath, { search: blurFileName });

        const { data: existingBlurFull } = await supabase.storage
          .from('photos')
          .list(basePath, { search: blurFullFileName });

        // if (existingFull?.length || existingThumb?.length || existingBlur?.length || existingBlurFull?.length) {
        //   console.log(`⏭️ Skipping already uploaded: ${outputFileName}`);
        //   photoIndex++;
        //   continue;
        // }

        const { error: fullErr } = await supabase.storage
          .from('photos')
          .upload(fullPath, fullBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        const { error: thumbErr } = await supabase.storage
          .from('photos')
          .upload(thumbPath, thumbBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        // Using previously defined blurFileName and blurPath
        const blurBuffer = await sharp(inputPath)
          .resize(80)
          .blur(6)
          .jpeg({ quality: 30 })
          .toBuffer();

        const { error: blurErr } = await supabase.storage
          .from('photos')
          .upload(blurPath, blurBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        // Using previously defined blurFullFileName and blurFullPath
        const blurFullBuffer = await sharp(inputPath)
          .resize(800)
          .blur(16)
          .jpeg({ quality: 45 })
          .toBuffer();

        const { error: blurFullErr } = await supabase.storage
          .from('photos')
          .upload(blurFullPath, blurFullBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (fullErr || thumbErr || blurErr || blurFullErr) {
          console.error(`❌ Failed to upload ${file}:`, (fullErr || thumbErr || blurErr || blurFullErr).message);
        } else {
          console.log(`✅ Uploaded ${outputFileName}, thumbnail, and blur variant to ${level}`);
        }
      } catch (err) {
        console.error(`❌ Error processing ${file}:`, err.message);
      }

      photoIndex++;
    }
  }
})();
