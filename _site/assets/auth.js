// @ts-nocheck
/* eslint-env browser */
/* global window, document, alert */

(async () => {
  /** @type {any} */
  const win = globalThis;
  /** @type {any} */
  const doc = (win && win.document) ? win.document : null;
  if (!win || !doc) return;

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

  // Use window.SUPABASE_CONFIG for config and client creation
  const config = window.SUPABASE_CONFIG;
  if (!config?.url || !config?.anonKey) {
    console.error("❌ Missing Supabase config object.");
    return;
  }
  const supabase = window.supabase.createClient(config.url, config.anonKey);
  window.supabaseClient = supabase;

  // Retry-capable initializer with UMD fallback; avoids duplicate clients
  (function ensureSupabaseClient() {
    const create = () => {
      if (window.supabaseClient) return true;
      const url = document.querySelector('meta[name="supabase-url"]')?.content;
      const key = document.querySelector('meta[name="supabase-anon-key"]')?.content;
      const ctor = (window.supabase && window.supabase.createClient) || (typeof Supabase !== 'undefined' && Supabase.createClient);
      if (ctor && url && key) {
        try {
          window.supabaseClient = ctor(url, key, { auth: { persistSession: true, storageKey: 'xy-auth-v1' } });
          try { document.dispatchEvent(new Event('supabase-ready')); } catch (_) { }
          return true;
        } catch (_) { /* noop */ }
      }
      return false;
    };
    if (!create()) {
      window.addEventListener('load', create, { once: true });
      document.addEventListener('DOMContentLoaded', create, { once: true });
    }
  })();

  // Dispatch supabase-ready once
  (function dispatchReadyOnce() {
    if (window.__supabaseReadyDispatched) return;
    if (window.supabaseClient) {
      window.__supabaseReadyDispatched = true;
      try { doc.dispatchEvent(new Event('supabase-ready')); } catch (_) { }
    }
  })();

  // Global image hydrator for Supabase Storage (photos/media bucket)
  (function attachImageHydrator() {
    // Only define once
    if (window.hydrateSignedImages) return;

    function inferBucketAndKey(path) {
      let key = path.replace(/^\/+/, '');
      let bucket = key.startsWith('media/') ? 'media' : 'photos';
      if (key.startsWith('photos/')) key = key.slice('photos/'.length);
      if (key.startsWith('media/')) key = key.slice('media/'.length);
      return { bucket, key };
    }

    window.hydrateSignedImages = async function hydrateSignedImages() {
      const supa = window.supabaseClient;
      if (!supa) return;
      // Select all images with .supabase-image, data-path, data-photo, or data-cover-url
      const imgs = Array.from(document.querySelectorAll('img.supabase-image, img[data-path], img[data-photo], img[data-cover-url]'));
      await Promise.all(imgs.map(async (img) => {
        let path = img.dataset.path || img.getAttribute('data-photo') || img.getAttribute('data-cover-url') || '';
        path = path.trim();
        if (!path || path.includes('?token=')) return;
        const { bucket, key } = inferBucketAndKey(path);
        try {
          const { data, error } = await supa.storage.from(bucket).createSignedUrl(key, 3600);
          if (!error && data?.signedUrl) img.src = data.signedUrl;
        } catch (_) { /* noop */ }
      }));
    };

    // Run on events
    document.addEventListener('supabase-ready', () => { try { window.hydrateSignedImages(); } catch (_) { } });
    document.addEventListener('DOMContentLoaded', () => { if (window.supabaseClient) try { window.hydrateSignedImages(); } catch (_) { } });
    window.addEventListener('load', () => { if (window.supabaseClient) try { window.hydrateSignedImages(); } catch (_) { } });
  })();

  // Enhance hydrator with debug logging
  (function enhanceHydratorDebug() {
    if (!window.hydrateSignedImages) return; // only enhance after defined
    const original = window.hydrateSignedImages;
    window.hydrateSignedImages = async function wrappedHydrator() {
      const supa = window.supabaseClient;
      const imgs = Array.from(document.querySelectorAll('img[data-photo], img[data-cover-url]'));
      try { console.log(`[hydrator] found ${imgs.length} img(s)`); } catch (_) { }
      await Promise.all(imgs.map(async (img, idx) => {
        const photo = (img.getAttribute('data-photo') || '').trim();
        const cover = (img.getAttribute('data-cover-url') || '').trim();
        if (!photo && !cover) {
          try { console.warn(`[hydrator] img#${idx} missing data-photo and data-cover-url`); } catch (_) { }
          return;
        }
        const source = photo !== '' ? photo : cover;
        if (source.includes('?token=')) { img.src = source; return; }

        let key = '';
        let bucket = '';
        if (/^(https?:)?\/\//.test(source)) {
          const q = source.indexOf('?');
          const noQ = q > -1 ? source.slice(0, q) : source;
          const cases = [
            ['/storage/v1/object/sign/photos/', 'photos'],
            ['/storage/v1/object/public/photos/', 'photos'],
            ['/storage/v1/object/photos/', 'photos'],
            ['/storage/v1/object/sign/media/', 'media'],
            ['/storage/v1/object/public/media/', 'media'],
            ['/storage/v1/object/media/', 'media']
          ];
          for (const [p, b] of cases) {
            const i = noQ.indexOf(p);
            if (i > -1) { key = noQ.slice(i + p.length); bucket = b; break; }
          }
          if (!key) {
            const j = noQ.indexOf('/photos/'); if (j > -1) { key = noQ.slice(j + '/photos/'.length); bucket = 'photos'; }
            const k = noQ.indexOf('/media/'); if (!key && k > -1) { key = noQ.slice(k + '/media/'.length); bucket = 'media'; }
          }
          if (!key) { img.src = source; return; }
          if (!bucket) bucket = key.startsWith('post-images/') ? 'media' : 'photos';
        } else {
          key = source.replace(/^\/+/, '').replace(/^(photos|media)\//, '');
          bucket = key.startsWith('post-images/') ? 'media' : 'photos';
        }

        try { console.log('[hydrator] signing', { bucket, key }); } catch (_) { }
        if (!supa) return;
        const { data, error } = await supa.storage.from(bucket).createSignedUrl(key, 3600);
        if (error || !data?.signedUrl) {
          try { console.error('[hydrator] sign failed:', { bucket, key }, error || 'no url'); } catch (_) { }
          return;
        }
        img.src = data.signedUrl;
      }));
    };
  })();

  // Expose auth helpers
  /**
   * @param {string} email
   * @param {string} password
   */
  win.login = async function (email, password) {
    const { error } = await win.supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      if (win && typeof win.alert === 'function') win.alert('Login failed: ' + error.message);
    } else {
      if (win && typeof win.alert === 'function') win.alert('Logged in!');
      win.location.reload();
    }
  };

  win.logout = async function () {
    await win.supabaseClient.auth.signOut();
    if (win && typeof win.alert === 'function') win.alert('Logged out');
    win.location.reload();
  };

  /**
   * Get current user access level
   * @returns {Promise<string>}
   */
  win.getUserAccessLevel = async function () {
    try {
      const { data: userData } = await win.supabaseClient.auth.getUser();
      const user = userData && userData.user ? userData.user : null;
      if (!user) return 'public';

      const { data, error } = await win.supabaseClient
        .from('profiles')
        .select('access_level')
        .eq('id', user.id)
        .single();

      if (error) return 'public';
      return (data && data.access_level) ? data.access_level : 'public';
    } catch (_e) {
      return 'public';
    }
  };

  /**
   * Load signed URLs for all images with data-photo
   * @returns {Promise<void>}
   */
  win.loadSignedImages = async function () {
    try {
      const accessLevel = await win.getUserAccessLevel();
      const nodes = doc.querySelectorAll('img[data-photo]');
      for (const img of nodes) {
        // @ts-ignore dataset typing in JS
        const raw = img && img.dataset ? img.dataset.photo : '';
        if (!raw) continue;
        const path = raw.startsWith(`${accessLevel}/`) ? raw : `${accessLevel}/${raw}`;
        const { data, error } = await win.supabaseClient
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
    } catch (e) {
      const msg = (e && typeof e === 'object' && 'message' in e) ? e.message : String(e);
      console.error('loadSignedImages failed:', msg);
    }
  };

  // Only hydrate images in the collections list
  if (document.querySelector('.collection-list')) {
    document.querySelectorAll('.collection-list img[data-photo]').forEach(img => {
      img.src = img.dataset.photo;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registerForm");
    const message = document.getElementById("registerMessage");

    if (!form || !window.supabaseClient) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = form.email.value.trim();
      const password = form.password.value;
      const confirm = form.confirm.value;

      if (password !== confirm) {
        message.textContent = "Passwords do not match.";
        return;
      }

      const { error } = await window.supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "https://xy.remainoff.com/setup-profile/"
        }
      });

      if (error) {
        message.textContent = error.message;
      } else {
        message.textContent = "Account created! Please check your inbox to confirm your email.";
        form.reset();
      }
    });
  });

  document.addEventListener("supabase-ready", () => {
    const form = document.getElementById("registerForm");
    const message = document.getElementById("registerMessage");

    if (!form || !window.supabaseClient) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = form.email.value.trim();
      const password = form.password.value;
      const confirm = form.confirm.value;

      if (password !== confirm) {
        message.textContent = "Passwords do not match.";
        return;
      }

      const { error } = await window.supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: "https://xy.remainoff.com/setup-profile/"
        }
      });

      if (error) {
        message.textContent = error.message;
      } else {
        message.textContent = "Account created! Please check your inbox to confirm your email.";
        form.reset();
      }
    });
  });

  document.addEventListener('DOMContentLoaded', () => {
    const images = document.querySelectorAll('.supabase-image');
    console.log(`[hydrator] found ${images.length} img(s)`);

    images.forEach(async (img) => {
      const path = img.dataset.path;
      if (!path) return;

      const { data, error } = await window.supabaseClient
        .storage
        .from('photos')
        .createSignedUrl(path, 3600);

      if (data?.signedUrl) {
        img.src = data.signedUrl;
      } else {
        console.error(`❌ Failed to sign image: ${path}`, error);
      }
    });
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const loginLink = document.querySelector('.nav-links a[href="/login/"]');

    const { data: { session } } = await window.supabaseClient.auth.getSession();

    if (session) {
      // User is logged in — change link to "Logout"
      loginLink.textContent = "Logout";
      loginLink.href = "#";
      loginLink.addEventListener("click", async (e) => {
        e.preventDefault();
        await window.supabaseClient.auth.signOut();
        window.location.reload(); // or redirect to homepage
      });
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const { data: { session } } = await window.supabaseClient.auth.getSession();

    if (session) {
      const username = session.user.user_metadata?.username || session.user.email;
      const userStatus = document.getElementById("userStatus");
      if (userStatus) {
        userStatus.innerHTML = `<p>Signed in as ${username} · remainoff.com</p>`;
      }
    }
  });
})();