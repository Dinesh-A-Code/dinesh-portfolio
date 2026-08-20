/**
 * Dinesh A — Software Developer Portfolio
 * Vanilla JS: Navigation, Mobile Drawer, Live Stats Animation,
 * Ambient Mouse Spotlight, Form Validation, and Scroll Reveals.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * 1. Header Height Sync & Scrolled State
   * ------------------------------------------------------------------ */
  function initHeaderSync() {
    const header = document.getElementById('site-header');
    if (!header) return;

    function apply() {
      document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    }

    function checkScroll() {
      if (window.scrollY > 20) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }

    apply();
    checkScroll();

    window.addEventListener('scroll', checkScroll, { passive: true });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(apply, 100);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(apply).catch(() => {});
    }
  }

  /* ------------------------------------------------------------------
   * 2. Mobile Navigation Drawer
   * ------------------------------------------------------------------ */
  function initMobileDrawer() {
    const openBtn = document.getElementById('open-drawer');
    const closeBtn = document.getElementById('close-drawer');
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');

    if (!openBtn || !closeBtn || !drawer || !overlay) return;

    function openDrawer() {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      overlay.hidden = false;
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

      window.setTimeout(() => {
        if (!drawer.classList.contains('is-open')) {
          overlay.hidden = true;
        }
      }, 350);
    }

    openBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    const drawerLinks = drawer.querySelectorAll('[data-drawer-link]');
    drawerLinks.forEach((link) => {
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });
  }

  /* ------------------------------------------------------------------
   * 3. Active Navigation State Tracking
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
      const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const scrollOffsetExtra = 1.5 * rootFontSize;
      return headerHeight + scrollOffsetExtra + 10;
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

      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10;
      if (atBottom) {
        active = sections[sections.length - 1];
      }

      setActive(active.id);
    }

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          recalcActive();
          ticking = false;
        });
        ticking = true;
      }

      if (manualOverrideId) {
        window.clearTimeout(manualReleaseTimer);
        manualReleaseTimer = window.setTimeout(() => {
          manualOverrideId = null;
          recalcActive();
        }, 200);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', recalcActive);

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
        }, 200);
      });
    });

    recalcActive();
  }

  /* ------------------------------------------------------------------
   * 4. Ambient Interactive Mouse Spotlight
   * ------------------------------------------------------------------ */
  function initAmbientSpotlight() {
    const spotlight = document.querySelector('.mouse-spotlight');
    if (!spotlight || window.matchMedia('(pointer: coarse)').matches) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let isVisible = false;

    window.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY + window.scrollY;

      if (!isVisible) {
        spotlight.style.opacity = '1';
        isVisible = true;
      }
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      spotlight.style.opacity = '0';
      isVisible = false;
    });

    function animateSpotlight() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      spotlight.style.left = `${currentX}px`;
      spotlight.style.top = `${currentY}px`;

      requestAnimationFrame(animateSpotlight);
    }

    requestAnimationFrame(animateSpotlight);
  }

  /* ------------------------------------------------------------------
   * 5. Live LeetCode & GitHub Stats + Animated Counter
   * ------------------------------------------------------------------ */
  function animateValue(element, start, end, duration) {
    if (start === end) {
      element.textContent = String(end);
      return;
    }
    const range = end - start;
    const startTime = performance.now();

    function update(time) {
      const progress = Math.min((time - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      const val = Math.floor(start + range * easeProgress);
      element.textContent = String(val);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = String(end);
      }
    }

    requestAnimationFrame(update);
  }

  async function initLiveStats() {
    const statEls = Array.from(document.querySelectorAll('[data-stat]'));
    if (!statEls.length) return;

    let statsData = {
      leetcode: { solved: 181, easy: 86, medium: 73, hard: 22 },
      github: { repositories: 6, followers: 4 }
    };

    try {
      const response = await fetch('assets/data/stats.json');
      if (response.ok) {
        const json = await response.json();
        if (json?.leetcode) statsData.leetcode = json.leetcode;
        if (json?.github) statsData.github = json.github;
      }
    } catch (error) {
      // Fallback to initial stats
    }

    let hasAnimated = false;

    function triggerStatsAnimation() {
      if (hasAnimated || !statsData) return;
      hasAnimated = true;

      statEls.forEach((el) => {
        const [section, field] = el.dataset.stat.split('-');
        const targetVal = statsData?.[section]?.[field];
        if (typeof targetVal === 'number') {
          animateValue(el, 0, targetVal, 1200);
        }
      });
    }

    const statsSection = document.getElementById('problem-solving');
    if (statsSection && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            triggerStatsAnimation();
            observer.disconnect();
          }
        });
      }, { threshold: 0.15 });

      observer.observe(statsSection);
    } else {
      triggerStatsAnimation();
    }
  }

  /* ------------------------------------------------------------------
   * 6. Scroll Reveal Observer
   * ------------------------------------------------------------------ */
  function initScrollReveal() {
    document.documentElement.classList.add('js-anim');
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (!revealElements.length) return;

    function checkVisible() {
      const windowHeight = window.innerHeight;
      revealElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= windowHeight + 80) {
          el.classList.add('is-revealed');
        }
      });
    }

    checkVisible();
    window.addEventListener('scroll', checkVisible, { passive: true });
    window.addEventListener('resize', checkVisible);

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '120px 0px 40px 0px',
        threshold: 0.05
      });

      revealElements.forEach((el) => observer.observe(el));
    }
  }

  /* ------------------------------------------------------------------
   * 7. Contact Form Validation
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
      const wrapper = field.closest('.form-group') || field.closest('.form-field');
      if (errorEl) errorEl.textContent = message;
      if (wrapper) wrapper.classList.toggle('has-error', Boolean(message));
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
        setError(emailField, errorEl, 'Please enter your email address.');
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
        setError(messageField, errorEl, 'Please enter your message.');
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
        status.textContent = 'Please review and fill the required fields.';
        status.style.color = '#EF4444';
        return;
      }

      status.textContent = 'Preparing email draft...';
      status.style.color = '#059669';

      const mailtoSubject = encodeURIComponent(`Portfolio Inquiry from ${nameField.value.trim()}`);
      const mailtoBody = encodeURIComponent(`${messageField.value.trim()}\n\n---\nFrom: ${nameField.value.trim()} (${emailField.value.trim()})`);
      
      window.setTimeout(() => {
        window.location.href = `mailto:adinesh09092005@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;
        status.textContent = 'Email client opened! You can also contact adinesh09092005@gmail.com directly.';
        form.reset();
      }, 500);
    });
  }

  /* ------------------------------------------------------------------
   * 8. Copy Email Utility
   * ------------------------------------------------------------------ */
  function initCopyEmail() {
    const copyBtns = document.querySelectorAll('[data-copy-email]');
    copyBtns.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = 'adinesh09092005@gmail.com';
        try {
          await navigator.clipboard.writeText(email);
          const valEl = btn.querySelector('.contact-method-val');
          if (valEl) {
            const orig = valEl.textContent;
            valEl.textContent = 'Copied to Clipboard! ✓';
            valEl.style.color = 'var(--accent-emerald)';
            setTimeout(() => {
              valEl.textContent = orig;
              valEl.style.color = '';
            }, 2500);
          }
        } catch (err) {
          window.location.href = `mailto:${email}`;
        }
      });
    });
  }

  /* ------------------------------------------------------------------
   * 9. Initialization
   * ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    initHeaderSync();
    initMobileDrawer();
    initActiveNav();
    initAmbientSpotlight();
    initLiveStats();
    initScrollReveal();
    initContactForm();
    initCopyEmail();
  });
})();
