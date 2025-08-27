const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const { createClient } = require('@supabase/supabase-js');
const getCollectionsWithSignedUrls = require('../../scripts/fetchCollections');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

module.exports = async function () {
  const collections = await getCollectionsWithSignedUrls();

  const seen = new Set();
  const filtered = collections.filter(c => {
    const slug = c.slug?.trim().toLowerCase();
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });

  console.log("Deduplicated photoCollections:", filtered.map(c => c.slug));

  return filtered;
};
