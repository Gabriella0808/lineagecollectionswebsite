/*
 * Lineage Collections — home page extras (index.html). Styles: "Home page" in css/styles.css.
 *
 *   [data-home-rooms]   "Shop by room": pointing at a room fills the section with its photo; on
 *                       touch screens the room in the middle of the screen does the same
 */
(function () {
  'use strict';

  const box = document.querySelector('[data-home-rooms]');
  if (!box) return;

  const photos = Array.from(box.querySelectorAll('.home-rooms-photos img'));
  const rows = Array.from(box.querySelectorAll('.home-room'));
  let current = 0;

  // Load the other photos once the section is near, so switching is instant
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      photos.forEach((img) => { img.loading = 'eager'; });
    }, { rootMargin: '600px 0px' });
    io.observe(box);
  }

  function show(k) {
    if (k === current) return;
    current = k;
    photos.forEach((img) => img.classList.toggle('is-on', Number(img.dataset.k) === k));
    rows.forEach((r) => r.classList.toggle('is-on', Number(r.dataset.k) === k));
  }
  rows[0].classList.add('is-on');
  rows.forEach((r) => {
    r.addEventListener('pointerenter', () => show(Number(r.dataset.k)));
    r.addEventListener('focus', () => show(Number(r.dataset.k)));
  });

  if (!window.matchMedia('(hover: hover)').matches) {
    (function follow() {
      const mid = window.innerHeight / 2;
      let best = current;
      let dist = Infinity;
      rows.forEach((r, k) => {
        const b = r.getBoundingClientRect();
        const d = Math.abs(b.top + b.height / 2 - mid);
        if (d < dist) { dist = d; best = k; }
      });
      show(best);
      requestAnimationFrame(follow);
    })();
  }
})();
