const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async function () {
  const { data, error } = await supabase
    .storage
    .from('media')
    .createSignedUrl('post-images/public/xy-home-cover.jpg', 3600);

  if (error) {
    console.warn('⚠️ Failed to sign hero image:', error.message);
    return { heroImageUrl: null };
  }

  return {
    heroImageUrl: data.signedUrl
  };
};