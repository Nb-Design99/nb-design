(() => {
  'use strict';

  // ---------- Config ----------
  const FRAME_COUNT = 145;
  const FRAME_URL = (i) => `frames/frame_${String(i + 1).padStart(3, '0')}.jpg`;

  // How many frames to load in parallel. Keep modest so the first frames
  // arrive fast and the page isn't dog-slow on a single TCP connection.
  const PARALLEL_LOADS = 6;

  // How many frames must be ready before we unhide the canvas + allow scrub.
  // We don't need every frame to start. Initial paint can begin as soon as
  // the first few are in.
  const MIN_FRAMES_FOR_READY = 12;

  // Lerp factor for smoothing during scroll (lower = silkier but laggier).
  const LERP = 0.18;
  const SEEK_THRESHOLD = 0.5; // sub-frame deltas aren't worth redrawing

  // ---------- Elements ----------
  const hero = document.querySelector('.hero');
  const stickyEl = document.querySelector('.hero__sticky');
  const canvas = document.querySelector('.hero__canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const overlay = document.querySelector('.hero__overlay');
  const loading = document.querySelector('.hero__loading');
  const loadingBar = document.querySelector('.hero__loading-bar');

  // ---------- State ----------
  const frames = new Array(FRAME_COUNT);     // Image elements (sparse until loaded)
  const loaded = new Array(FRAME_COUNT).fill(false);
  let loadedCount = 0;
  let ready = false;
  let isHeroVisible = true;
  let targetIndex = 0;
  let currentIndex = 0;
  let lastDrawnIndex = -1;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Canvas sizing (DPR-aware) ----------
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = stickyEl.clientWidth;
    const h = stickyEl.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    drawFrame(lastDrawnIndex >= 0 ? lastDrawnIndex : 0, true);
  }

  // ---------- Drawing (object-fit: cover semantics) ----------
  function drawFrame(index, force) {
    if (!ready && !force) return;
    const i = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(index)));
    if (i === lastDrawnIndex && !force) return;

    // Find nearest loaded frame (graceful fallback during preload)
    let useIdx = i;
    if (!loaded[useIdx]) {
      // search outward for the closest loaded frame
      let off = 1;
      while (off < FRAME_COUNT) {
        if (useIdx - off >= 0 && loaded[useIdx - off]) { useIdx = useIdx - off; break; }
        if (useIdx + off < FRAME_COUNT && loaded[useIdx + off]) { useIdx = useIdx + off; break; }
        off++;
      }
      if (!loaded[useIdx]) return;
    }

    const img = frames[useIdx];
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.drawImage(img, dx, dy, dw, dh);
    lastDrawnIndex = i;
  }

  // ---------- Frame preloading ----------
  let nextToLoad = 0;
  let inFlight = 0;

  function startLoading() {
    while (inFlight < PARALLEL_LOADS && nextToLoad < FRAME_COUNT) {
      const idx = nextToLoad++;
      inFlight++;
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        frames[idx] = img;
        loaded[idx] = true;
        loadedCount++;
        inFlight--;
        onFrameLoaded(idx);
        startLoading();
      };
      img.onerror = () => {
        inFlight--;
        // Keep going even if a frame fails. drawFrame skips missing ones.
        startLoading();
      };
      img.src = FRAME_URL(idx);
    }
  }

  function onFrameLoaded(idx) {
    const pct = (loadedCount / FRAME_COUNT) * 100;
    loadingBar.style.width = pct.toFixed(1) + '%';

    // First frame: draw it so we have something on screen
    if (idx === 0 || (!ready && loadedCount === 1)) {
      drawFrame(idx, true);
    }

    if (!ready && loadedCount >= MIN_FRAMES_FOR_READY) {
      markReady();
    }

    if (loadedCount >= FRAME_COUNT) {
      loading.classList.add('is-done');
    }
  }

  function markReady() {
    if (ready) return;
    ready = true;
    canvas.classList.add('is-ready');
    drawFrame(currentIndex, true);
    onScroll(); // sync to current scroll position
  }

  // ---------- Visibility gating ----------
  const io = new IntersectionObserver((entries) => {
    isHeroVisible = entries[0].isIntersecting;
  }, { threshold: 0 });
  io.observe(stickyEl);

  // ---------- Scrub logic ----------
  function recomputeTarget() {
    const rect = hero.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
    const progress = scrollable > 0 ? scrolled / scrollable : 0;

    const overlayProgress = Math.min(1, progress / 0.6);
    overlay.style.setProperty('--t', overlayProgress.toFixed(3));

    targetIndex = progress * (FRAME_COUNT - 1);
    return progress;
  }

  let rafAlive = false;
  let lastRafStamp = 0;

  function tick(stamp) {
    rafAlive = true;
    lastRafStamp = stamp;
    requestAnimationFrame(tick);
    if (!ready || !isHeroVisible) return;

    currentIndex += (targetIndex - currentIndex) * LERP;
    if (Math.abs(currentIndex - lastDrawnIndex) >= SEEK_THRESHOLD) {
      drawFrame(currentIndex, false);
    }
  }

  function onScroll() {
    if (!ready) {
      // still recompute target so once we're ready we land in the right place
      recomputeTarget();
      return;
    }
    recomputeTarget();
    const rafStale = !rafAlive || (performance.now() - lastRafStamp) > 250;
    if (rafStale) {
      currentIndex = targetIndex;
      drawFrame(currentIndex, true);
    }
  }

  // ---------- Wire up ----------
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  resizeCanvas();
  startLoading();

  if (prefersReducedMotion) {
    // Pick a strong middle frame for reduced-motion users.
    const staticIdx = Math.round(FRAME_COUNT * 0.5);
    const wait = setInterval(() => {
      if (loaded[staticIdx] || loadedCount > 0) {
        drawFrame(staticIdx, true);
        clearInterval(wait);
      }
    }, 100);
  } else {
    requestAnimationFrame(tick);
  }
})();
