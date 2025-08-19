const supa = /** @type {any} */ (require('../utils/supabaseClient.js'));

module.exports = async function () {
  try {
    const collections = await supa.getCollections();
    return collections;
  } catch (e) {
    const msg = (e && typeof e === 'object' && 'message' in e) ? e.message : String(e);
    console.error('Failed to fetch collections:', msg);
    return [];
  }
};
