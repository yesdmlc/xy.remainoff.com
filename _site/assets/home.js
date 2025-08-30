document.addEventListener("DOMContentLoaded", () => {
  const images = document.querySelectorAll(".supabase-image");

  images.forEach(img => {
    const skeleton = img.previousElementSibling;

    const applyFadeIn = () => {
      img.classList.add("loaded");
      if (skeleton) skeleton.style.display = "none";
    };

    if (img.complete && img.naturalWidth !== 0) {
      applyFadeIn();
    } else {
      img.addEventListener("load", applyFadeIn);
    }

    img.addEventListener("error", () => {
      console.warn("🚫 Image failed to load:", img.src);
    });
  });

  const heroImg = document.querySelector(".hero-image");

  const fadeIn = () => heroImg.classList.add("loaded");

  if (heroImg && heroImg.complete && heroImg.naturalWidth !== 0) {
    fadeIn();
  } else if (heroImg) {
    heroImg.addEventListener("load", fadeIn);
  }
});