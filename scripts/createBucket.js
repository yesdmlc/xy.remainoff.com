const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.local') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase env vars (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

(async () => {
  const bucketName = 'photos';

  // Check if bucket already exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ Failed to list buckets:', listError.message);
    return;
  }

  const bucketsArr = Array.isArray(buckets) ? buckets : [];
  const exists = bucketsArr.some((bucket) => bucket && bucket.name === bucketName);

  if (exists) {
    console.log(`ℹ️ Bucket "${bucketName}" already exists.`);
    return;
  }

  // Create bucket
  const { data, error } = await supabase.storage.createBucket(bucketName, {
    public: true,
  });

  if (error) {
    console.error('❌ Failed to create bucket:', error.message);
  } else {
    console.log(`✅ Bucket "${bucketName}" created successfully`);
  }
})();
