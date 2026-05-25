(() => {
  'use strict';

  // ---------- Config ----------
  const FRAME_COUNT = 121;
  const FRAME_URL = (i) => `frames/frame_${String(i + 1).padStart(3, '0')}.jpg`;

  // How many frames to load in parallel. Keep modest so first frames arrive fast
  // and we don't choke the single TCP connection of HTTP/1.1.
  const PARALLEL_LOADS = 6;

  // Frames needed before the canvas is revealed and scrub is enabled.
  // Set to 1 so the user sees the first frame instantly and can already scrub
  // (drawFrame falls back to the nearest loaded neighbor while preload continues).
  const MIN_FRAMES_FOR_READY = 1;

  // Lerp factor for smoothing (lower = silkier but laggier).
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
  const frames = new Array(FRAME_COUNT);
  const loaded = new Array(FRAME_COUNT).fill(false);
  let loadedCount = 0;
  let ready = false;
  let isHeroVisible = true;
  let targetIndex = 0;
  let currentIndex = 0;
  let lastDrawnIndex = -1;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Focal point (cover-style framing) ----------
  // Image source = paysage, sujet "fromage qui coule" sur le tiers droit.
  // On mobile portrait, on décale le cadrage à droite pour centrer le fromage.
  // 0.5 = centre, 1.0 = bord droit. 0.85 = fromage bien au centre, soupçon de planche visible.
  const portraitMQ = window.matchMedia('(max-width: 768px) and (orientation: portrait)');
  let focalX = 0.5;
  function updateFocal() {
    focalX = portraitMQ.matches ? 0.85 : 0.5;
  }
  updateFocal();
  // matchMedia.addEventListener may not exist on older browsers — fallback to addListener.
  if (portraitMQ.addEventListener) {
    portraitMQ.addEventListener('change', () => { updateFocal(); drawFrame(lastDrawnIndex >= 0 ? lastDrawnIndex : 0, true); });
  } else if (portraitMQ.addListener) {
    portraitMQ.addListener(() => { updateFocal(); drawFrame(lastDrawnIndex >= 0 ? lastDrawnIndex : 0, true); });
  }

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
    // Cover positioning with focal point — focalX=0.5 = centered, 0.85 = biased right.
    const dx = (cw - dw) * focalX;
    const dy = (ch - dh) * 0.5;

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
        // Keep going. drawFrame falls back to the nearest neighbor.
        startLoading();
      };
      img.src = FRAME_URL(idx);
    }
  }

  function onFrameLoaded(idx) {
    const pct = (loadedCount / FRAME_COUNT) * 100;
    loadingBar.style.width = pct.toFixed(1) + '%';

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
    onScroll();
  }

  // ---------- Visibility gating ----------
  const io = new IntersectionObserver((entries) => {
    isHeroVisible = entries[0].isIntersecting;
  }, { threshold: 0 });
  io.observe(stickyEl);

  // ---------- Scroll → target frame ----------
  // Linear mapping: scroll 0 -> frame 0 (raclette sèche),
  //                 scroll 1 -> last frame (fromage qui coule à fond).
  function recomputeTarget() {
    const rect = hero.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
    const progress = scrollable > 0 ? scrolled / scrollable : 0;

    // Hero overlay fades out as user scrolls into the scrub zone.
    const overlayProgress = Math.min(1, progress / 0.25);
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
    // Reduced-motion users get the "fromage coule" final frame, not the dry start.
    const staticIdx = FRAME_COUNT - 1;
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
