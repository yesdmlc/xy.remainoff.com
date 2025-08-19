const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const mime = require('mime-types');
const { supabase } = require('./supabaseClient');
const { addPhotosToCollection } = require('./addPhotosToCollection');

const accessLevels = ['public', 'member', 'premium'];
const baseDir = __dirname;
const collectionTitle = process.argv[2];

if (!collectionTitle) {
  console.error('❌ Please provide a collection name: node uploadPhotos.js <collectionTitle>');
  process.exit(1);
}

function slugify(input) {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const slug = slugify(collectionTitle);
let photoIndex = 1;
const photoInputs = [];

async function uploadImage(buffer, storagePath, mimeType) {
  const { error } = await supabase.storage
    .from('photos')
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) throw error;
}

(async () => {
  for (const level of accessLevels) {
    const folderPath = path.join(baseDir, collectionTitle, level);
    if (!fs.existsSync(folderPath)) {
      console.warn(`⚠️ Skipping missing folder: ${folderPath}`);
      continue;
    }

    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const inputPath = path.join(folderPath, file);
      const outputFileName = `${slug}-photo-${photoIndex}.jpeg`;

      const buffer = await sharp(inputPath)
        .resize(1600)
        .jpeg({ quality: 80 })
        .toBuffer();

      let storagePath;
      if (level === 'public') {
        storagePath = `public/${outputFileName}`;
      } else {
        storagePath = `${slug}/${level}/${outputFileName}`;
      }

      await uploadImage(buffer, storagePath, 'image/jpeg');

      photoInputs.push({
        path: storagePath,
        access: level,
        title: outputFileName
      });

      console.log(`✅ Uploaded: ${storagePath}`);
      photoIndex++;
    }
  }

  const result = await addPhotosToCollection(collectionTitle, photoInputs);
  console.log(`📸 Added ${result.count} photos to collection ${collectionTitle} (ID: ${result.collectionId})`);
})();
