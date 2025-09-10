const lightboxOverlay = document.getElementById('lightbox-overlay');
const lightboxImage = document.getElementById('lightbox-image');
const closeBtn = document.querySelector('.lightbox-close');
const prevBtn = document.querySelector('.lightbox-prev');
const nextBtn = document.querySelector('.lightbox-next');
const loader = document.getElementById('lightbox-loader');

let galleryImages = [];
let currentIndex = 0;
let supabase;
const signedUrlCache = {};
let hasPreloaded = false;

function waitForSupabaseClient() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.supabaseClient) {
        supabase = window.supabaseClient;
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

async function getSignedUrl(path) {
  if (signedUrlCache[path]) {
    console.log("✅ Using cached signed URL:", path);
    return signedUrlCache[path];
  }

  console.log("🔗 Attempting to sign full image:", path);

  try {
    const { data, error } = await supabase.storage.from('photos').createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      signedUrlCache[path] = data.signedUrl;
      return data.signedUrl;
    } else {
      console.warn("❌ Failed to sign image:", path, error);
      return null;
    }
  } catch (err) {
    console.error("⚠️ Error signing image:", err);
    return null;
  }
}

async function openLightbox(path) {
  console.log("🔗 Attempting to sign full image:", path);
  const signedUrl = await getSignedUrl(path);
  if (!signedUrl) {
    lightboxImage.alt = 'Image unavailable';
    return;
  }

  // Fade out current image before changing
  lightboxImage.style.transition = 'opacity 0.5s';
  lightboxImage.style.opacity = '0';

  // Wait for fade-out to finish before changing src
  setTimeout(() => {
    // Reset state
    lightboxOverlay.style.display = 'flex';
    lightboxOverlay.classList.remove('active');
    lightboxImage.src = '';

    // Assign new image
    lightboxImage.onload = () => {
      lightboxImage.style.opacity = '1';
      lightboxOverlay.classList.add('active'); // triggers CSS fade-in
    };

    lightboxImage.onerror = () => {
      console.warn("❌ Failed to load image:", path);
      lightboxImage.alt = 'Image unavailable';
    };

    lightboxImage.src = signedUrl;

    preloadAdjacentImages();
  }, 300); // 300ms fade-out duration
}



function preloadAdjacentImages() {
  const prevIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
  const nextIndex = (currentIndex + 1) % galleryImages.length;

  const prevPath = galleryImages[prevIndex]?.getAttribute('data-full') || galleryImages[prevIndex]?.getAttribute('data-full-url');
  const nextPath = galleryImages[nextIndex]?.getAttribute('data-full') || galleryImages[nextIndex]?.getAttribute('data-full-url');

  if (prevPath) getSignedUrl(prevPath);
  if (nextPath) getSignedUrl(nextPath);
}

function closeLightbox() {
  lightboxOverlay.style.display = 'none';
  lightboxImage.src = '';
  lightboxOverlay.classList.remove('active');
  lightboxImage.style.opacity = '0'; // Reset for next view
}

function showPrev() {
  currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
  const path = galleryImages[currentIndex].getAttribute('data-full') || galleryImages[currentIndex].getAttribute('data-full-url');
  if (path) openLightbox(path);
}

function showNext() {
  currentIndex = (currentIndex + 1) % galleryImages.length;
  const path = galleryImages[currentIndex].getAttribute('data-full') || galleryImages[currentIndex].getAttribute('data-full-url');
  if (path) openLightbox(path);
}

async function preloadAllFullImages() {
  if (hasPreloaded) return;
  hasPreloaded = true;

  loader.style.display = 'flex';

  const preloadPromises = galleryImages.map(async img => {
    const path = img.getAttribute('data-full') || img.getAttribute('data-full-url');
    if (path) await getSignedUrl(path);
  });

  await Promise.all(preloadPromises);
  setTimeout(() => { loader.style.display = 'none'; }, 1000);
}

function refreshLightboxGallery() {
  galleryImages = Array.from(document.querySelectorAll('.lightbox-enabled'));
  galleryImages.forEach((img, index) => {
    img.style.cursor = 'pointer';
    img.addEventListener('click', async () => {
      currentIndex = index;
      const path = img.getAttribute('data-full') || img.getAttribute('data-full-url');
      if (path) await openLightbox(path);
      await preloadAllFullImages();
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await waitForSupabaseClient();
  refreshLightboxGallery();
});

closeBtn.addEventListener('click', closeLightbox);
prevBtn.addEventListener('click', showPrev);
nextBtn.addEventListener('click', showNext);

document.addEventListener('keydown', (e) => {
  if (lightboxOverlay.style.display === 'flex') {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPrev();
    if (e.key === 'ArrowRight') showNext();
  }
});

window.refreshLightboxGallery = refreshLightboxGallery;