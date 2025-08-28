const { createClient } = require('@supabase/supabase-js');

const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteFolder(prefix) {
  const { data, error } = await supabaseClient
    .storage
    .from('photos')
    .list(prefix);

  if (error) {
    console.error(`❌ Failed to list ${prefix}:`, error.message);
    return;
  }

  if (!data.length) {
    console.log(`✅ No files found under ${prefix}`);
    return;
  }

  const keysToDelete = data.map(file => `${prefix}/${file.name}`);
  const { error: deleteError } = await supabaseClient
    .storage
    .from('photos')
    .remove(keysToDelete);

  if (deleteError) {
    console.error(`❌ Failed to delete files in ${prefix}:`, deleteError.message);
  } else {
    console.log(`✅ Deleted ${keysToDelete.length} files from ${prefix}`);
  }
}

// Run this for each folder you want to clean
(async () => {
  await deleteFolder('2025-06-burnaby-photo');
})();
