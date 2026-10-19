/*
 * Lineage Collections — storage page (storage.html). Styles: "Storage page" in css/styles.css.
 * The pieces and photos are chosen in js/data.js (storagePage); names and prices are live.
 *
 *   [data-hero-piece]   hero: the word parts like a pair of doors and the credenza opens
 *   [data-inside]       "Look inside": every piece closed; point at one (or tap) and its doors open
 *   [data-rooms]        where the pieces live: room photos that drift as you scroll
 *
 * The closed and open photos of a piece are framed differently, so both are cropped to the
 * furniture itself in the browser and lined up on the same baseline before they swap.
 */
(function () {
  'use strict';

  const page = document.querySelector('.sto-page');
  if (!page) return;

  const Catalog = window.LineageCatalog;
  const CONFIG = (window.LINEAGE_DATA || {}).storagePage || {};
  const motion = document.documentElement.classList.contains('motion');
  const touch = !window.matchMedia('(hover: hover)').matches;
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);

  /* ---------- Crop a cut-out photo to the furniture (white trimmed away) ---------- */

  const crops = new Map();
  function cropped(url) {
    if (!crops.has(url)) {
      crops.set(url, new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            const px = ctx.getImageData(0, 0, w, h).data;
            let minX = w, minY = h, maxX = -1, maxY = -1;
            for (let y = 0; y < h; y += 2) {
              for (let x = 0; x < w; x += 2) {
                const k = (y * w + x) * 4;
                if (px[k] > 236 && px[k + 1] > 236 && px[k + 2] > 236) continue;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
            if (maxX < 0) { resolve({ src: url, ratio: w / h }); return; }
            const pad = 6;
            minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
            maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
            const out = document.createElement('canvas');
            out.width = maxX - minX + 1;
            out.height = maxY - minY + 1;
            out.getContext('2d').drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
            resolve({ src: out.toDataURL('image/jpeg', 0.9), ratio: out.width / out.height });
          } catch (e) {
            resolve({ src: url, ratio: img.naturalWidth / img.naturalHeight });
          }
        };
        img.onerror = () => resolve({ src: url, ratio: 1 });
        img.src = url;
      }));
    }
    return crops.get(url);
  }

  // A piece's two photos, cropped; the open one may be wider (doors swung out), so both sit in a
  // box as wide as the widest, anchored to the bottom
  async function doorsHtml(piece) {
    const [closed, open] = await Promise.all([cropped(piece.closed), cropped(piece.open)]);
    return { closed, open };
  }

  /* ---------- Hero: the doors open as you scroll ---------- */

  const heroBox = document.querySelector('[data-hero-piece]');
  const hero = document.querySelector('.sto-hero');
  async function renderHero(piece) {
    if (!heroBox || !piece) return;
    const { closed, open } = await doorsHtml(piece);
    heroBox.innerHTML = `
      <img class="sto-hero-closed" src="${escapeHtml(closed.src)}" alt="">
      <img class="sto-hero-open" src="${escapeHtml(open.src)}" alt="">`;
    heroBox.style.setProperty('--ratio', Math.max(closed.ratio, open.ratio));
    heroBox.classList.add('is-ready');
  }
  function paintHero() {
    if (!hero) return;
    const p = motion ? clamp(-hero.getBoundingClientRect().top / (hero.offsetHeight - window.innerHeight || 1), 0, 1) : 1;
    const open = clamp((p - 0.1) / 0.55, 0, 1);
    hero.style.setProperty('--open', open.toFixed(4));
    hero.classList.toggle('is-open', open > 0.45);
    hero.style.setProperty('--hp', p.toFixed(4));
  }

  /* ---------- Look inside ---------- */

  const grid = document.querySelector('[data-inside]');
  // What's behind the doors, from the name: "4-Door / 3-Drawer", "Wine Rack", "Baskets"…
  function features(name) {
    const out = [];
    const doors = name.match(/(\d)-Door/i);
    const drawers = name.match(/(\d)-Drawer/i);
    if (doors) out.push(`${doors[1]} doors`);
    if (drawers) out.push(`${drawers[1]} drawers`);
    if (/wine rack/i.test(name)) out.push('wine rack');
    if (/basket/i.test(name)) out.push('baskets');
    if (/silver tray/i.test(name)) out.push('silver tray');
    if (/touch lighting/i.test(name)) out.push('touch lighting');
    if (/soft close/i.test(name)) out.push('soft-close doors');
    return out;
  }
  const clean = (name) => name.replace(/\s*(w\/|with)\s.*$/i, '').replace(/,\s*Soft Close Doors/i, '').trim();

  async function renderGrid(bySku) {
    if (!grid) return;
    const pieces = (CONFIG.pieces || []).map((x) => ({ ...x, p: bySku.get(x.sku) })).filter((x) => x.p);
    const photos = await Promise.all(pieces.map(doorsHtml));
    grid.innerHTML = pieces.map((x, i) => {
      const { closed, open } = photos[i];
      const f = features(x.p.name);
      return `
        <article class="sto-card" style="--i:${i}">
          <a href="${escapeHtml(x.p.url)}" class="sto-doors" style="--ratio:${Math.max(closed.ratio, open.ratio).toFixed(3)}" aria-label="${escapeHtml(x.p.name)}">
            <img class="is-closed" src="${escapeHtml(closed.src)}" alt="" loading="lazy">
            <img class="is-open" src="${escapeHtml(open.src)}" alt="" loading="lazy">
            <span class="sto-doors-hint" aria-hidden="true">${touch ? 'Tap to open' : 'Look inside'}</span>
          </a>
          <div class="sto-card-body">
            <p class="sto-card-col">${escapeHtml(x.p.collection || '')}</p>
            <h3 class="sto-card-name"><a href="${escapeHtml(x.p.url)}">${escapeHtml(clean(x.p.name.replace(new RegExp(`^${x.p.collection}\\s*`, 'i'), '')))}</a></h3>
            ${f.length ? `<p class="sto-card-features">${f.map(escapeHtml).join(' &middot; ')}</p>` : ''}
            <p class="sto-card-price">${x.p.price == null ? 'Price on request' : money(x.p.price)}</p>
          </div>
        </article>`;
    }).join('');
    // Touch: the first tap opens the doors, a second tap follows the link
    if (touch) {
      grid.addEventListener('click', (e) => {
        const doors = e.target.closest('.sto-doors');
        if (!doors || doors.classList.contains('is-open')) return;
        e.preventDefault();
        grid.querySelectorAll('.sto-doors.is-open').forEach((d) => d.classList.remove('is-open'));
        doors.classList.add('is-open');
      });
    }
  }

  /* ---------- Where it lives ---------- */

  const rooms = document.querySelector('[data-rooms]');
  function renderRooms(bySku) {
    if (!rooms) return;
    rooms.innerHTML = (CONFIG.rooms || []).map((r, i) => {
      const p = bySku.get(r.sku);
      return `
        <article class="sto-room${i % 2 ? ' is-flip' : ''}">
          <div class="sto-room-media"><img src="${escapeHtml(r.image)}" alt="${escapeHtml(p ? `${p.name} ${r.title.toLowerCase()}` : r.title)}" loading="lazy"></div>
          <div class="sto-room-copy" data-reveal-stagger>
            <p class="sto-room-n">0${i + 1}</p>
            <h3 class="display">${escapeHtml(r.title)}</h3>
            <p>${escapeHtml(r.text)}</p>
            ${p ? `<a href="${escapeHtml(p.url)}" class="sto-room-link"><span>${escapeHtml(clean(p.name))}</span><span>${money(p.price)} &rarr;</span></a>` : ''}
          </div>
        </article>`;
    }).join('');
    // Let js/motion.js reveal the new copy
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      }), { rootMargin: '0px 0px -12% 0px' });
      rooms.querySelectorAll('[data-reveal-stagger]').forEach((el) => io.observe(el));
    }
  }
  function paintRooms() {
    if (!rooms || !motion) return;
    const vh = window.innerHeight;
    rooms.querySelectorAll('.sto-room-media').forEach((m) => {
      const r = m.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      m.style.setProperty('--drift', (((r.top + r.height / 2) - vh / 2) / vh).toFixed(3));
    });
  }

  /* ---------- Load ---------- */

  async function load() {
    const bc = window.LineageBC;
    renderHero((CONFIG.pieces || [])[0]);
    if (!Catalog || !bc || !bc.enabled) return;
    try {
      const raw = await bc.allProducts();
      const all = raw.map(Catalog.classify);
      const bySku = new Map(all.map((p) => [p.sku, p]));
      renderGrid(bySku);
      renderRooms(bySku);
      const count = all.filter((p) => p.room === 'storage' && !/display/i.test(p.name)).length;
      document.querySelectorAll('[data-count="pieces"]').forEach((el) => { el.textContent = count; });
    } catch (err) {
      console.warn('Storage page: could not load products.', err);
    }
  }
  load();

  (function frame() {
    paintHero();
    paintRooms();
    requestAnimationFrame(frame);
  })();
})();
