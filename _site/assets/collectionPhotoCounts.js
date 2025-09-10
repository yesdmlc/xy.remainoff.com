window.updatePhotoCounts = async function () {
  const config = window.SUPABASE_CONFIG;
  if (!config?.url || !config.anonKey) {
    console.error("❌ Supabase config missing or invalid");
    return;
  }

  const supabase = window.supabaseClient || window.Supabase.createClient(
    config.url,
    config.anonKey
  );

  const sections = document.querySelectorAll('.collection-thumbnail');

  for (const section of sections) {
    const slug = section.dataset.slug;
    const photoCountEl = section.querySelector('.photo-count');
    const debugEl = section.querySelector('.debug-count');
    if (debugEl) {
      debugEl.textContent = '✅ Count attempted';
    }
    if (!slug || !photoCountEl) continue;

    try {
      const { data, error } = await supabase
        .from('collections')
        .select('photo_count')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        console.warn(`❌ Failed to fetch photo count for "${slug}"`, error);
        photoCountEl.textContent = 'Error';
        continue;
      }

      const count = typeof data.photo_count === 'number' ? data.photo_count : 0;
      photoCountEl.textContent = `${count} photo${count !== 1 ? 's' : ''}`;
      console.log(`📸 ${slug}: ${count} photo${count !== 1 ? 's' : ''}`);
    } catch (err) {
      console.error(`⚠️ Unexpected error for "${slug}"`, err);
      photoCountEl.textContent = 'Error';
    }
  }
};