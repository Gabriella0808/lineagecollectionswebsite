/*
 * Lineage Collections — motion
 *
 * Everything that moves as you scroll or move the mouse. Styles live under "Motion" in
 * css/styles.css. The <head> of each page adds .motion to <html> (and .intro on the first
 * visit of a session) before anything is drawn; this file does the rest.
 *
 *   data-reveal            element rises in the first time it scrolls into view
 *   data-reveal="image"    image is wiped in while it settles from a zoom
 *   data-reveal-stagger    its children rise in one after another
 *   data-split             heading's words rise out of a mask, one by one
 *   data-marquee           filled with collection names; speed and direction follow your scroll
 *
 * Mouse-only extras (skipped on touch screens): magnetic buttons, 3D tilt on product and
 * Instagram photos, drag-to-swipe on the carousel.
 * Visitors who prefer reduced motion get the page without any of it.
 */
(function () {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const data = window.LINEAGE_DATA || {};
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Split headings into words ---------- */

  function splitWords(el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 1) { child.setAttribute('aria-hidden', 'true'); walk(child); return; }
        if (child.nodeType !== 3 || !child.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          w.setAttribute('aria-hidden', 'true');
          w.innerHTML = `<span class="wi" style="--wi:${i++}"></span>`;
          w.firstChild.textContent = part;
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      });
    };
    walk(el);
  }
  document.querySelectorAll('[data-split]').forEach(splitWords);

  /* ---------- Marquee ---------- */

  const marquee = document.querySelector('[data-marquee]');
  if (marquee) {
    const names = (data.collections || []).map((c) => c.name.replace(/\s+Collection$/i, ''));
    const words = [...names, 'Design for Living', 'Since 1997'];
    const group = () => `<div class="marquee-group">${[...words, ...words].map((w, i) =>
      `<span class="marquee-item${i % 2 ? ' is-outline' : ''}">${w.replace(/[&<>]/g, '')}</span><span class="marquee-star">&#10022;</span>`).join('')}</div>`;
    marquee.innerHTML = group() + group();
  }

  /* ---------- Reveal on scroll ---------- */

  const targets = document.querySelectorAll('[data-reveal], [data-reveal-stagger], [data-split]');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return; // everything below is motion only
  }
  const revealer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  targets.forEach((el) => revealer.observe(el));

  // The intro curtain is pure CSS; tidy its class away once it has played.
  if (root.classList.contains('intro')) setTimeout(() => root.classList.remove('intro'), 2600);

  /* ---------- Smooth scroll (Lenis, loaded from the CDN before this file) ---------- */

  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({
      lerp: 0.085,
      anchors: true,
      // Let drawers and menus scroll natively.
      prevent: (node) => !!(node.closest && node.closest('.cart-drawer, .search-panel, .mobile-nav, .mega'))
    });
    // Pause while the cart drawer / mobile menu has locked the page.
    new MutationObserver(() => {
      if (document.body.classList.contains('no-scroll')) lenis.stop(); else lenis.start();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- Scroll progress line ---------- */

  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  /* ---------- Measurements (cached; refreshed on resize) ---------- */

  const hero = document.querySelector('.hero');
  const marqueeSection = marquee && marquee.closest('.marquee');
  let heroH = 0;
  let maxScroll = 1;
  let marqueeW = 0;

  function measure() {
    heroH = hero ? hero.offsetHeight : 0;
    maxScroll = Math.max(root.scrollHeight - window.innerHeight, 1);
    // Distance between the two copies, to the sub-pixel, so the loop wraps without a jump.
    marqueeW = marquee && marquee.children.length > 1
      ? marquee.children[1].getBoundingClientRect().left - marquee.children[0].getBoundingClientRect().left
      : 0;
  }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  if (document.fonts) document.fonts.ready.then(measure);
  // Product and Instagram grids fill in later and change the page height.
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);

  let marqueeInView = false;
  // Slows down while the mouse is over it. Only a real mouse move counts, not the marquee
  // scrolling up underneath a mouse that's standing still.
  let marqueeHover = false;
  if (marqueeSection) {
    new IntersectionObserver(([e]) => { marqueeInView = e.isIntersecting; }).observe(marqueeSection);
    marqueeSection.addEventListener('pointermove', () => { marqueeHover = true; });
    marqueeSection.addEventListener('pointerleave', () => { marqueeHover = false; });
  }

  /* ---------- Parallax: things inside these containers drift at their own speed ---------- */

  const PARALLAX = [
    { container: '.showroom-media', items: 'img', speed: -0.12 },
    { container: '.social-grid', items: '.social-tile:nth-child(even)', speed: -0.07 },
    { container: '.social-grid', items: '.social-tile:nth-child(odd)', speed: 0.04 }
  ];

  /* ---------- Mouse: magnets, tilt ---------- */

  const mouse = { x: -100, y: -100 };
  const magnets = new Map(); // element -> { x, y, tx, ty }
  let magnetEl = null;
  let tiltEl = null;

  const MAGNETIC = '.btn, .carousel-arrow, .newsletter-form button, .site-header .icon-btn';
  const TILT = '.product-media, .social-tile';
  if (finePointer) {
    root.classList.add('has-cursor');

    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      // Magnetic buttons
      const m = e.target.closest(MAGNETIC);
      if (magnetEl && magnetEl !== m) { const s = magnets.get(magnetEl); if (s) { s.tx = 0; s.ty = 0; } }
      magnetEl = m;
      if (m) {
        const r = m.getBoundingClientRect();
        const s = magnets.get(m) || { x: 0, y: 0, tx: 0, ty: 0 };
        s.tx = (mouse.x - (r.left + r.width / 2) - s.x) * 0.3;
        s.ty = (mouse.y - (r.top + r.height / 2) - s.y) * 0.4;
        magnets.set(m, s);
      }

      // 3D tilt + glare
      const t = e.target.closest(TILT);
      if (tiltEl && tiltEl !== t) { tiltEl.classList.remove('is-tilting'); tiltEl.style.removeProperty('--rx'); tiltEl.style.removeProperty('--ry'); }
      tiltEl = t;
      if (t) {
        const r = t.getBoundingClientRect();
        const px = (mouse.x - r.left) / r.width;
        const py = (mouse.y - r.top) / r.height;
        t.classList.add('is-tilting');
        t.style.setProperty('--rx', `${(0.5 - py) * 10}deg`);
        t.style.setProperty('--ry', `${(px - 0.5) * 12}deg`);
        t.style.setProperty('--mx', `${px * 100}%`);
        t.style.setProperty('--my', `${py * 100}%`);
      }
    }, { passive: true });
  }

  /* ---------- Carousel: drag with the mouse to change slide ---------- */

  const track = document.getElementById('carouselTrack');
  if (track && finePointer) {
    let startX = null;
    let dx = 0;
    let dragged = false;
    track.addEventListener('dragstart', (e) => e.preventDefault());
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('.hotspot')) return;
      startX = e.clientX; dx = 0; dragged = false;
      track.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', (e) => {
      if (startX === null) return;
      dx = e.clientX - startX;
      if (Math.abs(dx) > 6) dragged = true;
      track.style.translate = `${dx * 0.35}px 0`;
    });
    window.addEventListener('pointerup', () => {
      if (startX === null) return;
      startX = null;
      track.classList.remove('is-dragging');
      track.style.translate = '';
      if (Math.abs(dx) > 60) document.getElementById(dx < 0 ? 'carouselNext' : 'carouselPrev').click();
    });
    // A drag shouldn't also count as a click on the slide or its link.
    track.addEventListener('click', (e) => {
      if (!dragged) return;
      e.preventDefault();
      e.stopPropagation();
      dragged = false;
    }, true);
  }

  /* ---------- One animation loop for everything ---------- */

  let lastY = window.scrollY;
  let velocity = 0;
  let marqueeX = 0;
  let marqueeDir = 1;
  let marqueeSpeed = 0; // eased, so speed-ups and direction changes glide instead of snapping
  let skew = 0;
  let lastTime = 0;

  function frame(time) {
    if (lenis) lenis.raf(time);
    // Keep the marquee the same speed on 60Hz and 120Hz screens.
    const k = lastTime ? Math.min((time - lastTime) / 16.667, 3) : 1;
    lastTime = time;

    const y = window.scrollY;
    const v = lenis ? lenis.velocity : y - lastY;
    lastY = y;
    velocity = lerp(velocity, v, 0.12);

    // Parallax: read every position before writing anything, so the browser lays out once.
    const vh = window.innerHeight;
    const moves = [];
    PARALLAX.forEach(({ container, items, speed }) => {
      document.querySelectorAll(container).forEach((c) => {
        const r = c.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const offset = (r.top + r.height / 2 - vh / 2) * speed;
        c.querySelectorAll(items).forEach((el) => moves.push([el, offset]));
      });
    });
    moves.forEach(([el, offset]) => { el.style.translate = `0 ${offset.toFixed(1)}px`; });

    progress.style.transform = `scaleX(${clamp(y / maxScroll, 0, 1)})`;
    if (hero && heroH) hero.style.setProperty('--hero-p', clamp(y / heroH, 0, 1).toFixed(4));

    // Marquee: drifts on its own, races and leans with your scroll, follows its direction.
    if (marquee && marqueeInView && marqueeW) {
      const scrolling = Math.abs(velocity) > 0.4;
      if (scrolling) marqueeDir = velocity > 0 ? 1 : -1;
      const slow = marqueeHover && !scrolling ? 0.25 : 1;
      const target = (0.6 + Math.min(Math.abs(velocity), 40) * 0.35) * slow * marqueeDir;
      marqueeSpeed = lerp(marqueeSpeed, target, 0.08 * k);
      marqueeX = (marqueeX + marqueeSpeed * k) % marqueeW;
      if (marqueeX < 0) marqueeX += marqueeW;
      skew = lerp(skew, clamp(-velocity * 0.3, -8, 8), 0.08 * k);
      marquee.style.transform = `translate3d(${(-marqueeX).toFixed(2)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
    }

    // Magnetic buttons ease toward their target and spring back when the mouse leaves.
    magnets.forEach((s, el) => {
      s.x = lerp(s.x, s.tx, 0.18);
      s.y = lerp(s.y, s.ty, 0.18);
      if (el !== magnetEl && Math.abs(s.x) < 0.1 && Math.abs(s.y) < 0.1) {
        el.style.translate = '';
        magnets.delete(el);
        return;
      }
      el.style.translate = `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px`;
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
