(() => {
  'use strict';

  // ---------- Config ----------
  // Lerp factor for smoothing (lower = silkier but laggier).
  const LERP = 0.14;
  // Sub-frame seek deltas aren't worth a video.currentTime write.
  const SEEK_THRESHOLD = 0.008; // seconds
  // Safety margin so we never request currentTime exactly at duration
  // (some browsers refuse to seek past duration - epsilon).
  const END_EPSILON = 0.05;

  // ---------- Elements ----------
  const hero = document.querySelector('.hero');
  const stickyEl = document.querySelector('.hero__sticky');
  const video = document.querySelector('.hero__video');
  const canvas = document.querySelector('.hero__canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const overlay = document.querySelector('.hero__overlay');
  const loading = document.querySelector('.hero__loading');
  const loadingBar = document.querySelector('.hero__loading-bar');

  // ---------- State ----------
  let duration = 0;
  let ready = false;
  let isHeroVisible = true;
  let targetTime = 0;
  let currentTime = 0;
  let lastDrawnTime = -1;
  let needsRedraw = false;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

  // ---------- Canvas sizing (DPR-aware) ----------
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = stickyEl.clientWidth;
    const h = stickyEl.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    drawFrame(true);
  }

  // ---------- Drawing (object-fit: cover semantics) ----------
  function drawFrame(force) {
    if (!ready && !force) return;
    if (video.readyState < 2) return; // HAVE_CURRENT_DATA

    const iw = video.videoWidth;
    const ih = video.videoHeight;
    if (!iw || !ih) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    try {
      ctx.drawImage(video, dx, dy, dw, dh);
      lastDrawnTime = video.currentTime;
    } catch (e) {
      // Video not ready for drawImage yet — ignore, will retry next tick.
    }
  }

  // ---------- Scroll → target video time ----------
  // Map scroll progress [0..1] to time:
  //   progress 0   → time 0           (chaos initial)
  //   progress 0.5 → time = duration  (plat composé, l'instant de grâce)
  //   progress 1   → time 0           (chaos final, miroir du début)
  function recomputeTarget() {
    const rect = hero.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
    const progress = scrollable > 0 ? scrolled / scrollable : 0;

    // Triangle wave: 0 → 1 → 0 across progress 0 → 0.5 → 1
    const wave = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    const safeDuration = Math.max(0, duration - END_EPSILON);
    targetTime = wave * safeDuration;

    // Overlay fades out as the user enters the hero and stays gone.
    // Re-appears subtly only near the very end (return to chaos).
    let overlayProgress;
    if (progress < 0.18) {
      overlayProgress = progress / 0.18;        // fade out 0 → 1 quickly
    } else if (progress > 0.92) {
      overlayProgress = 1 - (progress - 0.92) / 0.08; // peek back briefly
    } else {
      overlayProgress = 1;
    }
    overlay.style.setProperty('--t', overlayProgress.toFixed(3));

    return progress;
  }

  // ---------- rAF loop ----------
  let rafAlive = false;
  let lastRafStamp = 0;

  function tick(stamp) {
    rafAlive = true;
    lastRafStamp = stamp;
    requestAnimationFrame(tick);

    if (!ready || !isHeroVisible) return;

    // Smooth toward target.
    currentTime += (targetTime - currentTime) * LERP;

    // Only request a seek if we've moved meaningfully.
    if (Math.abs(currentTime - lastDrawnTime) > SEEK_THRESHOLD) {
      const t = Math.max(0, Math.min(duration - END_EPSILON, currentTime));
      // Setting currentTime triggers async decode; the 'seeked' / rVFC
      // handler does the actual draw. We also draw opportunistically here
      // in case the frame is already decoded and the seek is a no-op.
      try { video.currentTime = t; } catch (_) {}
      if (!hasRVFC) drawFrame(false);
    }
  }

  // ---------- Video lifecycle ----------
  function onMetadata() {
    duration = video.duration;
    // Pin to first frame so the user sees something while preload finishes.
    try { video.currentTime = 0; } catch (_) {}
  }

  function onLoadedData() {
    drawFrame(true);
  }

  function onCanPlayThrough() {
    if (ready) return;
    ready = true;
    canvas.classList.add('is-ready');
    loading.classList.add('is-done');
    recomputeTarget();
    drawFrame(true);
  }

  function onProgress() {
    if (!video.duration || !isFinite(video.duration)) return;
    if (video.buffered.length === 0) return;
    const end = video.buffered.end(video.buffered.length - 1);
    const pct = (end / video.duration) * 100;
    loadingBar.style.width = Math.min(100, pct).toFixed(1) + '%';
  }

  function onSeeked() {
    drawFrame(false);
  }

  video.addEventListener('loadedmetadata', onMetadata);
  video.addEventListener('loadeddata', onLoadedData);
  video.addEventListener('canplaythrough', onCanPlayThrough);
  video.addEventListener('canplay', onCanPlayThrough); // fallback if canplaythrough never fires
  video.addEventListener('progress', onProgress);
  video.addEventListener('seeked', onSeeked);
  video.addEventListener('error', () => {
    console.warn('[raclette] video error', video.error);
    loading.classList.add('is-done');
  });

  // requestVideoFrameCallback gives a precise paint moment after each decoded frame.
  if (hasRVFC) {
    const onVideoFrame = () => {
      drawFrame(false);
      video.requestVideoFrameCallback(onVideoFrame);
    };
    video.requestVideoFrameCallback(onVideoFrame);
  }

  // ---------- Visibility gating ----------
  const io = new IntersectionObserver((entries) => {
    isHeroVisible = entries[0].isIntersecting;
  }, { threshold: 0 });
  io.observe(stickyEl);

  // ---------- Scroll wiring ----------
  function onScroll() {
    recomputeTarget();
    if (!ready) return;
    const rafStale = !rafAlive || (performance.now() - lastRafStamp) > 250;
    if (rafStale) {
      currentTime = targetTime;
      try { video.currentTime = Math.max(0, Math.min(duration - END_EPSILON, currentTime)); } catch (_) {}
      drawFrame(true);
    }
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---------- Boot ----------
  resizeCanvas();

  // Some mobile browsers refuse to decode until a load() nudge.
  try { video.load(); } catch (_) {}

  if (prefersReducedMotion) {
    // Show a strong "plat composé" frame and skip the scrub loop.
    const showStillFrame = () => {
      if (!duration) return;
      const t = Math.max(0, duration - END_EPSILON);
      try { video.currentTime = t; } catch (_) {}
      ready = true;
      canvas.classList.add('is-ready');
      loading.classList.add('is-done');
      drawFrame(true);
    };
    video.addEventListener('loadeddata', showStillFrame, { once: true });
  } else {
    requestAnimationFrame(tick);
  }
})();
