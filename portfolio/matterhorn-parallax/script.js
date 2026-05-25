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
      - texte → glisse vers le bas et passe DERRIÈRE la montagne, avec fade
      - mont. → reste immobile (z-index supérieur, masque le texte)
      - hint  → s'efface dès qu'on commence à scroller
    */
    bg.style.transform   = `translate3d(0, ${-progress * 4}vh, 0) scale(1.08)`;
    text.style.transform = `translate3d(0, ${-32 + progress * 28}vh, 0)`;
    fg.style.transform   = `translate3d(0, 0, 0) scale(1.02)`;

    // Petit fade : texte plein opaque jusqu'à 15 % du scroll, puis fond en douceur
    const fadeStart = 0.15;
    const fadeEnd   = 0.75;
    const fadeT     = Math.min(1, Math.max(0, (progress - fadeStart) / (fadeEnd - fadeStart)));
    const eased     = fadeT * fadeT * (3 - 2 * fadeT);   // smoothstep
    text.style.opacity = String(1 - eased * 0.85);       // 1.0 → 0.15

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
