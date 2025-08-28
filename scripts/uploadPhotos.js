const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const mime = require('mime-types');
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const accessLevels = ['public', 'member', 'premium'];
const collection = process.argv[2]; // e.g. '2025-06-burnaby'

if (!collection || typeof collection !== 'string') {
  console.error('❌ Please provide a collection name: node uploadPhotos.js <collection>');
  process.exit(1);
}

let coverImagePath = null;
let coverFileIndex = null;

(async () => {
  for (const level of accessLevels) {
    const folderPath = path.join(__dirname, '..', 'src', 'images', 'originals', collection, level);
    if (!fs.existsSync(folderPath)) {
      console.warn(`⚠️ Skipping missing folder: ${folderPath}`);
      continue;
    }

    const files = fs.readdirSync(folderPath).filter(file => {
      const ext = path.extname(file).toLowerCase();
      const mimeType = mime.lookup(ext);
      return ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType);
    });

    // Determine cover image from public folder
    if (level === 'public' && !coverImagePath) {
      const coverCandidate = files.find(f => f.toLowerCase().includes('cover'));
      const fallback = files[0];

      if (coverCandidate) {
        coverFileIndex = files.indexOf(coverCandidate) + 1;
        coverImagePath = `${level}/${collection}-photo-${coverFileIndex}_thumb.jpeg`;
        console.log(`🖼️ Using '${coverCandidate}' as cover image (matched 'cover' in filename)`);
      } else if (fallback) {
        coverFileIndex = files.indexOf(fallback) + 1;
        coverImagePath = `${level}/${collection}-photo-${coverFileIndex}_thumb.jpeg`;
        console.log(`🖼️ No 'cover' image found — using first image '${fallback}' as fallback cover`);
      } else {
        console.warn(`⚠️ No valid image found in public folder to assign as cover`);
      }
    }


    for (const [i, file] of files.entries()) {
      const inputPath = path.join(folderPath, file);
      const currentIndex = i + 1;

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

        const blurBuffer = await sharp(inputPath)
          .resize(80)
          .blur(6)
          .jpeg({ quality: 30 })
          .toBuffer();

        const blurFullBuffer = await sharp(inputPath)
          .resize(800)
          .blur(16)
          .jpeg({ quality: 45 })
          .toBuffer();

        const outputFileName = `${collection}-photo-${currentIndex}.jpeg`;
        const thumbFileName = `${collection}-photo-${currentIndex}_thumb.jpeg`;
        const blurFileName = `${collection}-photo-${currentIndex}_blur.jpeg`;
        const blurFullFileName = `${collection}-photo-${currentIndex}_blurfull.jpeg`;

        const basePath = level;
        const fullPath = `${basePath}/${outputFileName}`;
        const thumbPath = `${basePath}/${thumbFileName}`;
        const blurPath = `${basePath}/${blurFileName}`;
        const blurFullPath = `${basePath}/${blurFullFileName}`;

        const { error: fullErr } = await supabase.storage
          .from('photos')
          .upload(fullPath, fullBuffer, { contentType: 'image/jpeg', upsert: true });

        const { error: thumbErr } = await supabase.storage
          .from('photos')
          .upload(thumbPath, thumbBuffer, { contentType: 'image/jpeg', upsert: true });

        const { error: blurErr } = await supabase.storage
          .from('photos')
          .upload(blurPath, blurBuffer, { contentType: 'image/jpeg', upsert: true });

        const { error: blurFullErr } = await supabase.storage
          .from('photos')
          .upload(blurFullPath, blurFullBuffer, { contentType: 'image/jpeg', upsert: true });

        const firstErr = fullErr || thumbErr || blurErr || blurFullErr;
        if (firstErr) {
          const emsg = (firstErr && typeof firstErr === 'object' && 'message' in firstErr)
            ? /** @type {any} */ (firstErr).message
            : String(firstErr);
          console.error(`❌ Failed to upload ${file}:`, emsg);
        } else {
          console.log(`✅ Uploaded ${outputFileName}, thumbnail, and blur variants to ${level}`);
        }
      } catch (err) {
        const msg = (err && typeof err === 'object' && 'message' in err) ? err.message : String(err);
        console.error(`❌ Error processing ${file}:`, msg);
      }
    }
  }

  // Update cover_image_url in Supabase
  if (coverImagePath) {
    try {
      const { error: updateErr } = await supabase
        .from('collections')
        .update({ cover_image_url: coverImagePath })
        .eq('slug', collection);

      if (updateErr) {
        console.error(`❌ Failed to update cover_image_url for ${collection}:`, updateErr.message);
      } else {
        console.log(`✅ cover_image_url set to ${coverImagePath} for ${collection}`);
      }
    } catch (err) {
      const msg = (err && typeof err === 'object' && 'message' in err) ? err.message : String(err);
      console.error(`❌ Error updating cover_image_url:`, msg);
    }
  } else {
    console.warn(`⚠️ No valid public image found to assign as cover_image_url`);
  }
})();
