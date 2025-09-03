const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const getPostsWithSignedImageUrls = require('../../scripts/fetchPosts'); // adjust path if needed

/*
pagination:
  data: supabasePosts
  size: 1
  alias: post
  addAllPagesToCollections: true
  key: "{{ post.slug }}"
*/

module.exports = async function () {
  return []; // Supabase temporarily disabled
}