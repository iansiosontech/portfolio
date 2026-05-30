/**
 * main.js
 * General-purpose page interactivity:
 *   • Custom cursor tracking
 *   • Scroll-reveal observer
 *   • Navbar scroll shrink + active-link spy
 *   • Mobile hamburger menu
 *   • Footer year
 */

(() => {
  'use strict';

  /* ══════════════════════════════════════════════════
     1. Custom Cursor
  ══════════════════════════════════════════════════ */
  const cursor    = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursor-dot');

  if (cursor && cursorDot) {
    let mouseX = 0, mouseY = 0;
    let curX   = 0, curY   = 0;

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      // Dot follows instantly
      cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    });

    // Ring follows with slight lag for a smooth feel
    function animateCursor() {
      curX += (mouseX - curX) * 0.18;
      curY += (mouseY - curY) * 0.18;
      cursor.style.transform = `translate(${curX}px, ${curY}px)`;
      requestAnimationFrame(animateCursor);
    }
    animateCursor();
  }

  /* ══════════════════════════════════════════════════
     2. Scroll Reveal
  ══════════════════════════════════════════════════ */
  const revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && revealEls.length) {
    const revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);  // fire once
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback: show everything immediately
    revealEls.forEach(el => el.classList.add('visible'));
  }

  /* ══════════════════════════════════════════════════
     3. Navbar — scroll shrink + active link spy
  ══════════════════════════════════════════════════ */
  const navbar    = document.getElementById('navbar');
  const navLinks  = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections  = document.querySelectorAll('section[id]');

  function onScroll() {
    /* Shrink navbar after scrolling 60px */
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    }

    /* Active link spy */
    let currentId = '';
    sections.forEach(section => {
      const top = section.getBoundingClientRect().top;
      if (top <= 120) currentId = section.id;
    });

    navLinks.forEach(link => {
      link.classList.toggle(
        'active',
        link.getAttribute('href') === `#${currentId}`
      );
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();   // run once on load

  /* ══════════════════════════════════════════════════
     4. Mobile Hamburger Menu
  ══════════════════════════════════════════════════ */
  const navToggle  = document.getElementById('navToggle');
  const navLinksEl = document.getElementById('navLinks');

  if (navToggle && navLinksEl) {
    navToggle.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = navLinksEl.classList.toggle('open');
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close menu when a link is clicked
    navLinksEl.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinksEl.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', e => {
      if (!navbar.contains(e.target)) {
        navLinksEl.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ══════════════════════════════════════════════════
     5. Footer Year
  ══════════════════════════════════════════════════ */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ══════════════════════════════════════════════════
     6. Smooth scroll for nav links (iOS Safari fix)
  ══════════════════════════════════════════════════ */
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navH = navbar ? navbar.offsetHeight : 0;
        const top  = target.getBoundingClientRect().top + window.scrollY - navH - 8;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

})();
