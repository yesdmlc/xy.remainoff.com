const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async function () {
  try {
    const { data, error } = await supabase.storage
      .from('open')
      .createSignedUrl('xy-home-cover.jpg', 3600);

    if (error) {
      console.warn('⚠️ Failed to sign hero image:', error.message || error);
      return { heroImageUrl: null };
    }

    return {
      heroImageUrl: data?.signedUrl || null
    };
  } catch (e) {
    console.error('❌ homeData.js failed:', e.message || e);
    return { heroImageUrl: null };
  }
};
