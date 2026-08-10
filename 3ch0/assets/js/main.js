/* 3CH0 — interactions */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ *
   * Intro : le wordmark s'efface comme un écho, puis on rend la main.
   * Rejouée à chaque chargement de page — seul prefers-reduced-motion
   * la court-circuite.
   * ------------------------------------------------------------------ */
  var loader = document.getElementById('loader');
  if (loader) {
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      root.classList.remove('intro-on');
      loader.classList.add('is-done');
      window.setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 900);
    };

    if (reduced) {
      finish();
    } else {
      // fondu CSS : 2,05 s de délai + 0,7 s (voir .loader / @keyframes loaderOut)
      window.setTimeout(finish, 2800);
      // On peut toujours écourter
      loader.addEventListener('click', finish);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === ' ') finish();
      }, { once: true });
    }
  }

  /* --- Header : état "collé" au scroll --- */
  var header = document.getElementById('header');
  var onScroll = function () {
    header.classList.toggle('is-stuck', window.scrollY > 24);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --- Parallaxe discrète sur l'image du hero --- */
  var heroImg = document.querySelector('.hero__bg img');
  if (heroImg && !reduced) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, 900);
        heroImg.style.transform = 'scale(1.06) translate3d(0,' + (y * 0.12) + 'px,0)';
        ticking = false;
      });
    }, { passive: true });
  }

  /* --- Menu mobile --- */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
        toggle.focus();
      }
    });
  }

  /* --- Apparition au scroll (blocs + volets sur les images) --- */
  var revealables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealables.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var siblings = Array.prototype.slice.call(el.parentNode.children);
        var idx = Math.min(siblings.indexOf(el), 5);
        el.style.transitionDelay = (idx * 70) + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    revealables.forEach(function (el) { io.observe(el); });

    // Filet de sécurité : si l'observateur ne se déclenche pas (onglet en
    // arrière-plan, moteur exotique), on affiche tout plutôt que rien.
    window.setTimeout(function () {
      revealables.forEach(function (el) { el.classList.add('is-in'); });
    }, 4000);
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* --- Nav : lien actif selon la section visible --- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav__links a'));
  var sections = links
    .map(function (a) {
      var id = a.getAttribute('href');
      return id && id.charAt(0) === '#' ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* --- Quitter vite : redirige l'onglet et ouvre une page neutre --- */
  var exit = document.getElementById('quickExit');
  if (exit) {
    var leave = function () {
      window.open('https://www.google.ch', '_blank', 'noopener');
      window.location.replace('https://www.meteosuisse.admin.ch');
    };
    exit.addEventListener('click', function (e) {
      e.preventDefault();
      leave();
    });
    // Échap x2 rapproché = sortie immédiate
    var last = 0;
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var now = Date.now();
      if (now - last < 600) leave();
      last = now;
    });
  }
})();
