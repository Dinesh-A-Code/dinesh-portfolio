/**
 * Dinesh A — Portfolio
 * Vanilla JS: mobile drawer, active nav highlighting, and
 * client-side contact form validation.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * Fixed header height sync
   * Keeps the --header-height CSS custom property in sync with the
   * real rendered height of the fixed header, so scroll-margin-top
   * (applied to .scroll-target elements) always clears the header
   * correctly, on both desktop and mobile, at any viewport width.
   * ------------------------------------------------------------------ */
  function syncHeaderHeight() {
    const header = document.getElementById('site-header');
    if (!header) return;

    function apply() {
      document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    }

    apply();

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(apply, 100);
    });

    // Header height can change once web fonts finish loading.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(apply).catch(() => {});
    }
  }

  /* ------------------------------------------------------------------
   * Mobile drawer
   * ------------------------------------------------------------------ */
  function initDrawer() {
    const openBtn = document.getElementById('open-drawer');
    const closeBtn = document.getElementById('close-drawer');
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');

    if (!openBtn || !closeBtn || !drawer || !overlay) return;

    function openDrawer() {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      overlay.hidden = false;
      // allow the browser to paint before transitioning opacity
      requestAnimationFrame(() => overlay.classList.add('is-visible'));
      openBtn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('drawer-open');
      closeBtn.focus();
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      overlay.classList.remove('is-visible');
      openBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('drawer-open');
      openBtn.focus();
      // wait for the CSS transition to finish before hiding
      window.setTimeout(() => {
        if (!drawer.classList.contains('is-open')) {
          overlay.hidden = true;
        }
      }, 300);
    }

    openBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    // Close on Escape
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    // Close drawer whenever a nav link inside it is used
    const drawerLinks = drawer.querySelectorAll('[data-drawer-link]');
    drawerLinks.forEach((link) => {
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });
  }

  /* ------------------------------------------------------------------
   * Active navigation state
   *
   * Two things drive the active link:
   *  1. Clicking a nav link marks it active immediately, and that
   *     choice is locked in until the resulting scroll settles, so the
   *     scroll-tracking logic below can't "steal back" the highlight
   *     mid-animation (the old off-by-one bug).
   *  2. While the user scrolls freely (no recent click), the active
   *     link is recalculated from scratch on every scroll frame: the
   *     active section is the last one whose top has crossed a probe
   *     line placed just below the fixed header. This replaces the
   *     previous IntersectionObserver-based approach, whose percentage
   *     based rootMargin didn't line up with the fixed header and
   *     produced the "highlight is one section ahead" bug.
   * ------------------------------------------------------------------ */
  function initActiveNav() {
    const header = document.getElementById('site-header');
    const sections = Array.from(document.querySelectorAll('main section[id]'));
    const allLinks = Array.from(
      document.querySelectorAll('[data-nav-link], [data-drawer-link], [data-brand-link]')
    );

    if (!sections.length || !allLinks.length) return;

    let manualOverrideId = null;
    let manualReleaseTimer = null;
    let currentActiveId = null;

    function setActive(id) {
      if (id === currentActiveId) return;
      currentActiveId = id;
      allLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
      });
    }

    function getProbeLine() {
      const headerHeight = header ? header.offsetHeight : 0;
      // Must match the section scroll offset used by CSS
      // (scroll-margin-top: calc(var(--header-height) + 1.5rem) on
      // .scroll-target), plus a couple of px of slack, so a section that
      // has just finished scrolling into its resting position is
      // recognised as "reached" rather than missed by a few pixels.
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const scrollOffsetExtra = 1.5 * rootFontSize;
      return headerHeight + scrollOffsetExtra + 2;
    }

    function recalcActive() {
      if (manualOverrideId) return;

      const probeLine = getProbeLine();
      let active = sections[0];

      for (const section of sections) {
        if (section.getBoundingClientRect().top - probeLine <= 0) {
          active = section;
        } else {
          break;
        }
      }

      // Near the bottom of the page the last section may never reach
      // the probe line (e.g. a short final section) — force it active.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        active = sections[sections.length - 1];
      }

      setActive(active.id);
    }

    // Scroll-linked recalculation, throttled to animation frames.
    let ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          recalcActive();
          ticking = false;
        });
        ticking = true;
      }

      // Treat "no scroll movement for a short while" as the scroll
      // having settled, so a manual click override doesn't linger and
      // block the natural scroll-driven state afterwards.
      if (manualOverrideId) {
        window.clearTimeout(manualReleaseTimer);
        manualReleaseTimer = window.setTimeout(() => {
          manualOverrideId = null;
          recalcActive();
        }, 150);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', recalcActive);

    // Clicking any nav/drawer/brand link activates it immediately and
    // locks that state until the resulting smooth scroll settles.
    allLinks.forEach((link) => {
      link.addEventListener('click', () => {
        const href = link.getAttribute('href') || '';
        if (!href.startsWith('#')) return;
        const id = href.slice(1);
        if (!document.getElementById(id)) return;

        manualOverrideId = id;
        setActive(id);

        window.clearTimeout(manualReleaseTimer);
        manualReleaseTimer = window.setTimeout(() => {
          manualOverrideId = null;
          recalcActive();
        }, 150);
      });
    });

    // Initial state on page load (handles a direct #hash URL too).
    recalcActive();
  }

  /* ------------------------------------------------------------------
   * Contact form — client-side validation only (no backend yet)
   * ------------------------------------------------------------------ */
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const nameField = document.getElementById('name');
    const emailField = document.getElementById('email');
    const messageField = document.getElementById('message');
    const status = document.getElementById('form-status');

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function setError(field, errorEl, message) {
      const wrapper = field.closest('.form-field');
      errorEl.textContent = message;
      wrapper.classList.toggle('has-error', Boolean(message));
    }

    function validateName() {
      const value = nameField.value.trim();
      const errorEl = document.getElementById('name-error');
      if (!value) {
        setError(nameField, errorEl, 'Please enter your name.');
        return false;
      }
      setError(nameField, errorEl, '');
      return true;
    }

    function validateEmail() {
      const value = emailField.value.trim();
      const errorEl = document.getElementById('email-error');
      if (!value) {
        setError(emailField, errorEl, 'Please enter your email.');
        return false;
      }
      if (!emailPattern.test(value)) {
        setError(emailField, errorEl, 'Please enter a valid email address.');
        return false;
      }
      setError(emailField, errorEl, '');
      return true;
    }

    function validateMessage() {
      const value = messageField.value.trim();
      const errorEl = document.getElementById('message-error');
      if (!value) {
        setError(messageField, errorEl, 'Please enter a message.');
        return false;
      }
      if (value.length < 10) {
        setError(messageField, errorEl, 'Message should be at least 10 characters.');
        return false;
      }
      setError(messageField, errorEl, '');
      return true;
    }

    nameField.addEventListener('blur', validateName);
    emailField.addEventListener('blur', validateEmail);
    messageField.addEventListener('blur', validateMessage);

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const isNameValid = validateName();
      const isEmailValid = validateEmail();
      const isMessageValid = validateMessage();

      if (!isNameValid || !isEmailValid || !isMessageValid) {
        status.textContent = 'Please fix the highlighted fields.';
        status.style.color = '#e08585';
        return;
      }

      // No backend is wired up yet. This is intentionally client-side only.
      status.textContent = 'Thanks! This form is not yet connected to a backend, so your message was not sent.';
      status.style.color = '';
      form.reset();
    });
  }

  /* ------------------------------------------------------------------
   * Project screenshots
   * Each .project-media has a real <img> pointing at assets/projects/
   * plus the original icon placeholder. If the image file exists and
   * loads, we reveal it and hide the icon; if it 404s (not added yet)
   * or is still loading, the icon placeholder stays visible exactly as
   * before — no missing-image icon is ever shown to the user.
   * ------------------------------------------------------------------ */
  function initProjectImages() {
    const images = document.querySelectorAll('.project-media .project-image');

    images.forEach((img) => {
      const reveal = () => img.closest('.project-media').classList.add('has-image');

      if (img.complete && img.naturalWidth > 0) {
        // Already loaded from cache by the time this script runs.
        reveal();
        return;
      }

      img.addEventListener('load', reveal);
      img.addEventListener('error', () => {
        // Leave the icon placeholder visible; nothing else to do.
      });
    });
  }

  /* ------------------------------------------------------------------
   * LeetCode / GitHub stats
   * Loads assets/data/stats.json and fills in every stat slot that has
   * a matching JSON field: LeetCode solved/easy/medium/hard, and
   * GitHub repositories/followers. Each [data-stat] element's value
   * (e.g. "leetcode-easy") maps directly to a "<section>.<field>" path
   * in the JSON. If the file is missing, fails to load, the JSON is
   * malformed, or an individual field is absent, that slot's existing
   * placeholder is left exactly as it is and nothing is shown to the
   * user.
   * ------------------------------------------------------------------ */
  async function initStats() {
    const statEls = Array.from(document.querySelectorAll('[data-stat]'));
    if (!statEls.length) return;

    try {
      // Cache protection: a plain "assets/data/stats.json" request can be
      // served stale by the browser's HTTP cache or an intermediate CDN
      // even after the automation commits a fresh file, since both key
      // on the URL and neither knows the file changed. The timestamp
      // query string makes every page load request a distinct URL (so
      // no cache layer keyed on the full URL can return a stale hit),
      // and { cache: 'no-store' } additionally tells the browser itself
      // to skip its HTTP cache for this request entirely.
      const response = await fetch(`assets/data/stats.json?v=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!response.ok) return;

      const data = await response.json();

      statEls.forEach((el) => {
        const [section, field] = el.dataset.stat.split('-');
        const value = data?.[section]?.[field];
        if (typeof value === 'number') {
          el.textContent = String(value);
        }
      });
    } catch (error) {
      // Network error or invalid JSON — silently keep the placeholders.
    }
  }

  /* ------------------------------------------------------------------
   * Init
   * ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    syncHeaderHeight();
    initDrawer();
    initActiveNav();
    initContactForm();
    initProjectImages();
    initStats();
  });
})();
