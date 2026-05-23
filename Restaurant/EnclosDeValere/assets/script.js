/* L'Enclos de Valère — interactions minimales */
(function () {
  'use strict';

  // Header scroll state
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 24) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile menu toggle
  const toggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      navLinks.classList.toggle('open');
      const open = navLinks.classList.contains('open');
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        toggle.classList.remove('open');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // Fade-up on scroll
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.fade-up').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('in'));
  }

  // Today highlight on hours list
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  document.querySelectorAll('.hours-list li[data-day="' + today + '"]').forEach(li => {
    if (!li.classList.contains('closed')) li.classList.add('today');
  });

  // Min date on reservation date input = today
  const dateInput = document.querySelector('input[type="date"]');
  if (dateInput) {
    const d = new Date();
    const iso = d.toISOString().split('T')[0];
    dateInput.min = iso;
    if (!dateInput.value) dateInput.value = iso;
  }

  // Friendly form submission stub (démo)
  const form = document.querySelector('form[data-demo]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = form.querySelector('.form-status');
      if (status) {
        status.textContent = 'Merci, votre demande a bien été reçue. Nous vous répondons sous 24 h. (démo)';
        status.style.opacity = '1';
      }
      form.reset();
    });
  }
})();
