/**
 * @param {string} url
 */
function extractStorageKey(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/storage\/v1\/object\/public\/photos\/(.+)/);
    return match ? match[1] : null; // ✅ no extra 'public/' added
  } catch {
    return null;
  }
}


module.exports = { extractStorageKey };
