/* eslint-env browser */
/* global window, document */

(async () => {
  try {
    /** @type {any} */
    const win = globalThis;
    /** @type {any} */
    const doc = (win && win.document) ? win.document : null;

    // Ensure browser environment
    if (!win || !doc) {
      return;
    }

    // Helper: dynamically load a UMD script
    /**
     * @param {string} src
     * @returns {Promise<void>}
     */
    const loadScript = (src) => new Promise((resolve, reject) => {
      const s = doc.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve(undefined);
      s.onerror = (/** @type {any} */ e) => reject(e);
      doc.head.appendChild(s);
    });

    // Resolve public env (inject via window or meta tags)
    const metaUrl = doc.querySelector('meta[name="supabase-url"]')?.getAttribute('content');
    const metaKey = doc.querySelector('meta[name="supabase-anon-key"]')?.getAttribute('content');
    const SUPABASE_URL = win.SUPABASE_URL || metaUrl;
    const SUPABASE_ANON_KEY = win.SUPABASE_ANON_KEY || metaKey;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Supabase public env not found. Provide SUPABASE_URL and SUPABASE_ANON_KEY via window or meta tags.');
      return;
    }

    // Use existing createClient if available, else load UMD bundle
    if (!win.supabase || !win.supabase.createClient) {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js');
    }

    const supabaseLib = win.supabase;
    if (!supabaseLib || !supabaseLib.createClient) {
      console.error('Supabase library not available in the browser.');
      return;
    }

    const supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Generate signed URLs for all images with data-photo
    async function loadSignedImages() {
      const nodes = doc.querySelectorAll('img[data-photo]');
      for (const img of nodes) {
        // @ts-ignore dataset typing in JS
        const path = img.dataset && img.dataset.photo ? img.dataset.photo : null;
        if (!path) continue;
        const { data, error } = await supabase
          .storage
          .from('photos')
          .createSignedUrl(path, 3600);
        if (data && data.signedUrl) {
          // @ts-ignore
          img.src = data.signedUrl;
        } else if (error) {
          console.error('Failed to load image:', error.message || error);
        }
      }
    }

    await loadSignedImages();
  } catch (e) {
    const msg = (e && typeof e === 'object' && 'message' in e) ? e.message : String(e);
    console.error('loadImage failed:', msg);
  }
})();
