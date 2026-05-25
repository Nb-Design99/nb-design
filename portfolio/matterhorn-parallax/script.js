(() => {
  const heroWrap = document.querySelector('.hero-wrap');
  const bg       = document.querySelector('.layer-bg img');
  const text     = document.querySelector('.hero-title');
  const fg       = document.querySelector('.layer-fg img');
  const hint     = document.querySelector('.scroll-hint');
  const meta     = document.querySelector('.hero-meta');

  if (!heroWrap || !bg || !text || !fg) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  let ticking = false;

  const update = () => {
    const rect       = heroWrap.getBoundingClientRect();
    const scrollable = heroWrap.offsetHeight - window.innerHeight;
    const scrolled   = Math.max(0, Math.min(-rect.top, scrollable));
    const progress   = scrollable > 0 ? scrolled / scrollable : 0;   // 0 → 1

    /*
      Effet :
      - fond  → monte très doucement (parallaxe lointain)
      - texte → glisse vers le bas et passe DERRIÈRE la montagne
      - mont. → reste immobile (z-index supérieur, masque le texte)
      - hint  → s'efface dès qu'on commence à scroller
    */
    bg.style.transform   = `translate3d(0, ${-progress * 4}vh, 0) scale(1.08)`;
    text.style.transform = `translate3d(0, ${-32 + progress * 28}vh, 0)`;
    fg.style.transform   = `translate3d(0, 0, 0) scale(1.02)`;

    if (hint) hint.style.opacity = String(Math.max(0, 1 - progress * 4));
    if (meta) meta.style.opacity = String(Math.max(0, 1 - progress * 2.5));

    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
