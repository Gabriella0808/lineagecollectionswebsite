/*
 * Lineage Collections — brand pages (brand-sea-winds.html, brand-finn-louise.html,
 * brand-lux-lighting.html) and the brands overview (brands.html). Styles: "Brand pages" in
 * css/styles.css.
 *
 * The story (hero, manifesto, quotes, photos) is written in each page's HTML. Everything that
 * depends on the catalog comes live from BigCommerce, so it stays right as products change:
 *
 *   <main data-brand="Sea Winds">   the brand's name exactly as it is in BigCommerce
 *   data-room="lighting"             (optional) only that room's products
 *   [data-stat="pieces|collections|types|rooms|pairs|type:Table Lamps"]   numbers that count up
 *   [data-rail="collections|products"]             the sideways-scrolling rail
 *   [data-types]                                   "Shop by piece" list
 *   [data-signature]                               a grid of eight pieces
 *
 * Motion-only extras: hero letters, manifesto words that fill in as you scroll, the pinned
 * rail, and the Lux Lighting spotlight.
 */
(function () {
  'use strict';

  const page = document.querySelector('.brand-page');
  if (!page) return;

  const data = window.LINEAGE_DATA || {};
  const Catalog = window.LineageCatalog;
  const brand = page.dataset.brand || '';
  const motion = document.documentElement.classList.contains('motion');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wide = window.matchMedia('(min-width: 900px)');
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount) || 0);
  const shopUrl = (params) => `shop.html?${new URLSearchParams({ brand, ...params }).toString().replace(/\+/g, '%20')}`;
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/></svg>';

  /* ---------- Hero title: letters rise one by one ---------- */

  document.querySelectorAll('[data-letters]').forEach((el) => {
    el.setAttribute('aria-label', el.textContent.trim());
    let i = 0;
    el.innerHTML = el.textContent.trim().split(/\s+/).map((word) =>
      `<span class="bw" aria-hidden="true">${Array.from(word).map((ch) =>
        `<span class="l"><span style="--li:${i++}">${escapeHtml(ch)}</span></span>`).join('')}</span>`).join(' ');
  });

  /* ---------- Manifesto: words fill in as the paragraph scrolls past ---------- */

  const manifesto = document.querySelector('[data-fill]');
  let fillWords = [];
  if (manifesto && motion) {
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 1) { walk(child); return; }
        if (child.nodeType !== 3 || !child.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'fw';
          w.textContent = part;
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      });
    };
    walk(manifesto);
    fillWords = Array.from(manifesto.querySelectorAll('.fw'));
  }

  /* ---------- Live catalog ---------- */

  let products = [];

  const byCount = (map) => Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  function groupBy(list, key) {
    const map = new Map();
    list.forEach((p) => {
      const k = key(p);
      if (!k) return;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    });
    return map;
  }
  // The photo that best stands for a group: a bed or table if there is one, else the first photo.
  const HERO_TYPES = ['Beds', 'Dining Tables', 'Credenzas & Sideboards', 'Coffee Tables', 'Floor Lamps', 'Table Lamps'];
  function bestImage(list) {
    const withImg = list.filter((p) => p.image);
    for (const t of HERO_TYPES) {
      const hit = withImg.find((p) => p.type === t);
      if (hit) return hit.image;
    }
    return withImg[0] ? withImg[0].image : null;
  }

  /* Stats */
  const stats = {};
  function renderStats() {
    stats.pieces = products.length;
    stats.collections = groupBy(products, (p) => p.collection).size;
    stats.types = groupBy(products, (p) => (p.type === 'Other' ? null : p.type)).size;
    stats.rooms = groupBy(products, (p) => p.room).size;
    stats.pairs = products.filter((p) => /set of 2|pack of 2|\b2\s*pk|2 pack/i.test(p.name)).length;
    document.querySelectorAll('[data-stat]').forEach((el) => {
      const key = el.dataset.stat;
      // "type:Table Lamps" counts the pieces of one type
      // data-value="13" fixes a number by hand where the catalog can't work it out
      const value = el.dataset.value ? Number(el.dataset.value)
        : key.startsWith('type:') ? products.filter((p) => p.type === key.slice(5)).length : stats[key] || 0;
      el.dataset.target = value;
      if (!motion || statsCounted) el.textContent = value;
    });
    countUp();
  }
  // Count up once the stats are in view and the numbers have arrived (whichever comes last).
  const statsBox = document.querySelector('.brand-stats');
  let statsSeen = !('IntersectionObserver' in window);
  let statsCounted = false;
  function countUp() {
    if (!statsBox || !statsSeen || statsCounted || !motion || !products.length) return;
    statsCounted = true;
    statsBox.querySelectorAll('[data-stat]').forEach((el) => {
      const start = performance.now();
      const tick = (now) => {
        const t = clamp((now - start) / 1800, 0, 1);
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        el.textContent = Math.round((Number(el.dataset.target) || 0) * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  if (statsBox && !statsSeen) {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      statsSeen = true;
      countUp();
    }, { threshold: 0.4 });
    io.observe(statsBox);
  }

  /* Rail: the brand's collections (or, for a brand without collections, its pieces) */
  const rail = document.querySelector('[data-rail]');
  const railTrack = rail && rail.querySelector('.brand-rail-track');
  const railIntro = railTrack && railTrack.querySelector('.brand-rail-intro');
  const photos = { ...Object.fromEntries(Object.entries(data.collectionBanners || {}).map(([k, v]) => [k, v.image])), ...(data.collectionPhotos || {}) };

  function railCard(i, total, href, name, meta, image, cutout) {
    const num = `${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    return `
      <article class="rail-card">
        <a href="${escapeHtml(href)}" class="rail-card-media${cutout ? ' is-cutout' : ''}" tabindex="-1" aria-hidden="true">
          <span class="rail-card-num">${num}</span>
          ${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" draggable="false">` : ''}
        </a>
        <h3 class="rail-card-name"><a href="${escapeHtml(href)}">${escapeHtml(name)}</a></h3>
        <p class="rail-card-meta">${escapeHtml(meta)}</p>
      </article>`;
  }

  function renderRail() {
    if (!railTrack) return;
    let cards = '';
    if (rail.dataset.rail === 'products') {
      const picks = products.filter((p) => p.image).sort((a, b) => (b.type === 'Floor Lamps') - (a.type === 'Floor Lamps')).slice(0, 10);
      cards = picks.map((p, i) => railCard(i, picks.length, p.url, p.name.replace(/\s*\((set|pack|\d+\s*p).*$/i, ''),
        [p.type, p.price == null ? '' : money(p.price, p.currency)].filter(Boolean).join(' · '), p.image, true)).join('');
    } else {
      const groups = byCount(groupBy(products, (p) => p.collection)).slice(0, 8);
      cards = groups.map(([name, list], i) => {
        const rooms = Array.from(new Set(list.map((p) => Catalog.roomLabel(p.room)).filter(Boolean))).slice(0, 3);
        const photo = photos[name];
        return railCard(i, groups.length, shopUrl({ collection: name }), name,
          [`${list.length} ${list.length === 1 ? 'piece' : 'pieces'}`, ...rooms].join(' · '), photo || bestImage(list), !photo);
      }).join('');
    }
    railTrack.querySelectorAll('.rail-card').forEach((c) => c.remove());
    railIntro.insertAdjacentHTML('afterend', cards + `
      <article class="rail-card is-end">
        <a href="${escapeHtml(shopUrl({}))}" class="rail-card-media"><span>See all ${products.length}<br>${escapeHtml(brand)} pieces &rarr;</span></a>
      </article>`);
    measureRail();
  }

  /* Shop by piece */
  const typesList = document.querySelector('[data-types]');
  function renderTypes() {
    if (!typesList) return;
    const groups = byCount(groupBy(products, (p) => (['Other', 'Accessories'].includes(p.type) ? null : p.type))).slice(0, 7);
    typesList.innerHTML = groups.map(([type, list], i) => `
      <a href="${escapeHtml(shopUrl({ type }))}" class="brand-type">
        <span class="brand-type-i">${String(i + 1).padStart(2, '0')}</span>
        <span class="brand-type-name">${escapeHtml(type)}</span>
        <span class="brand-type-count">${list.length} ${list.length === 1 ? 'piece' : 'pieces'}</span>
        <span class="brand-type-arrow">${ARROW}</span>
      </a>`).join('');
  }

  /* Signature pieces: one from each of the biggest types, then the rest */
  const signature = document.querySelector('[data-signature]');
  function renderSignature() {
    if (!signature) return;
    const pool = byCount(groupBy(products.filter((p) => p.image && p.type !== 'Accessories'), (p) => p.type)).map(([, list]) => list.slice());
    const picks = [];
    const seen = new Set();
    const usedCollections = new Set();
    while (picks.length < 8 && pool.some((l) => l.length)) {
      pool.forEach((list) => {
        while (list.length && picks.length < 8) {
          // Prefer a collection that isn't in the grid yet, so it shows the brand's range
          let i = list.findIndex((p) => !usedCollections.has(p.collection));
          if (i < 0) i = 0;
          const p = list.splice(i, 1)[0];
          const key = p.name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          usedCollections.add(p.collection);
          picks.push(p);
          break;
        }
      });
    }
    signature.innerHTML = picks.map((p) => `
      <article class="shop-card">
        <div class="shop-card-media-wrap">
          <a href="${escapeHtml(p.url)}" class="shop-card-media" tabindex="-1" aria-hidden="true"><img src="${escapeHtml(p.image)}" alt="" loading="lazy"></a>
          <button type="button" class="shop-card-add" data-sku="${escapeHtml(p.sku)}">Add to cart</button>
          <button type="button" class="wish-toggle" data-wish="${escapeHtml(p.sku)}" aria-pressed="false" aria-label="Save to wishlist">${HEART}</button>
        </div>
        <div class="shop-card-body">
          <p class="shop-card-eyebrow">${escapeHtml([brand, p.collection].filter(Boolean).join(' · '))}</p>
          <h3 class="shop-card-name"><a href="${escapeHtml(p.url)}">${escapeHtml(p.name)}</a></h3>
          <p class="shop-card-price">${p.price == null ? 'Price on request' : money(p.price, p.currency)}</p>
        </div>
      </article>`).join('');
    document.querySelectorAll('[data-brand-count]').forEach((el) => { el.textContent = products.length; });
  }
  if (signature) {
    signature.addEventListener('click', (e) => {
      const add = e.target.closest('.shop-card-add');
      if (!add || !window.LineageCart) return;
      const product = products.find((p) => p.sku === add.dataset.sku);
      if (!product) return;
      window.LineageCart.add(product);
      window.LineageCart.open();
      add.textContent = 'Added';
      add.classList.add('is-added');
      setTimeout(() => { add.textContent = 'Add to cart'; add.classList.remove('is-added'); }, 1600);
    });
  }

  function render(raw) {
    const all = raw.map(Catalog.classify);
    // data-room="lighting" keeps a page to one room (some non-lamps are tagged Lux Lighting in BigCommerce)
    const room = page.dataset.room;
    products = all.filter((p) => p.brands.includes(brand) && !/display/i.test(p.name) && (!room || p.room === room));
    if (!products.length) return;
    renderStats();
    renderRail();
    renderTypes();
    renderSignature();
  }

  async function load() {
    const bc = window.LineageBC;
    if (!brand || !Catalog || !bc || !bc.enabled) { page.classList.add('is-offline'); return; }
    let timer = null;
    const soon = (list) => { clearTimeout(timer); timer = setTimeout(() => render(list), 250); };
    try {
      const list = await bc.allProducts({ onProgress: soon, onUpdate: render });
      clearTimeout(timer);
      render(list);
    } catch (err) {
      console.warn(`Brand page: could not load ${brand} products.`, err);
      page.classList.add('is-offline');
    }
  }
  load();

  /* ---------- Rail: pinned and scrolled sideways on wide screens ---------- */

  // The track sticks below the header, then moves sideways by railTravel px while the page
  // scrolls the same distance, then the page carries on.
  const siteHeader = document.getElementById('siteHeader');
  let railTravel = 0;
  let railPad = 0;
  function measureRail() {
    if (!rail || !railTrack) return;
    const pin = motion && wide.matches;
    rail.classList.toggle('is-pinned', pin);
    if (!pin) { rail.style.height = ''; railTrack.style.transform = ''; return; }
    railTravel = Math.max(railTrack.scrollWidth - window.innerWidth, 0);
    railPad = parseFloat(getComputedStyle(rail).paddingTop) || 0;
    const sticky = rail.querySelector('.brand-rail-sticky');
    rail.style.height = `${railPad + sticky.offsetHeight + railTravel}px`;
  }
  if (rail) {
    measureRail();
    window.addEventListener('resize', measureRail);
    window.addEventListener('load', measureRail);
    wide.addEventListener('change', measureRail);
  }

  /* ---------- Spotlight (Lux Lighting): the cursor is the lamp ---------- */

  const spot = document.querySelector('.brand-spotlight');
  if (spot && finePointer) {
    const text = spot.querySelector('.spot-text');
    spot.addEventListener('pointermove', (e) => {
      const r = spot.getBoundingClientRect();
      spot.classList.add('is-pointer');
      spot.style.setProperty('--sx', `${((e.clientX - r.left) / r.width) * 100}%`);
      spot.style.setProperty('--sy', `${((e.clientY - r.top) / r.height) * 100}%`);
      if (text) {
        const t = text.getBoundingClientRect();
        text.style.setProperty('--tx', `${((e.clientX - t.left) / t.width) * 100}%`);
        text.style.setProperty('--ty', `${((e.clientY - t.top) / t.height) * 100}%`);
      }
    });
    spot.addEventListener('pointerleave', () => {
      spot.classList.remove('is-pointer');
      spot.style.removeProperty('--sx');
      spot.style.removeProperty('--sy');
    });
  }
  // Without a mouse the light drifts on its own (CSS); keep the text's glow following it.
  if (spot && motion) {
    const text = spot.querySelector('.spot-text');
    (function follow() {
      const r = spot.getBoundingClientRect();
      if (text && !spot.classList.contains('is-pointer') && r.bottom > 0 && r.top < window.innerHeight) {
        const cs = getComputedStyle(spot);
        const t = text.getBoundingClientRect();
        const sx = r.left + (parseFloat(cs.getPropertyValue('--sx')) / 100) * r.width;
        const sy = r.top + (parseFloat(cs.getPropertyValue('--sy')) / 100) * r.height;
        text.style.setProperty('--tx', `${((sx - t.left) / t.width) * 100}%`);
        text.style.setProperty('--ty', `${((sy - t.top) / t.height) * 100}%`);
      }
      requestAnimationFrame(follow);
    })();
  }

  /* ---------- Scroll-driven frame ---------- */

  if (!motion) return;
  let lastFill = -1;
  function frame() {
    const vh = window.innerHeight;

    // Manifesto fill
    if (manifesto && fillWords.length) {
      const r = manifesto.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.3), 0, 1);
        const lit = p * fillWords.length;
        if (Math.abs(lit - lastFill) > 0.05) {
          lastFill = lit;
          fillWords.forEach((w, i) => w.style.setProperty('--f', clamp(lit - i, 0, 1).toFixed(2)));
        }
      }
    }

    // Rail: vertical scroll moves the track sideways; photos drift inside their frames
    if (rail && rail.classList.contains('is-pinned')) {
      const r = rail.getBoundingClientRect();
      const headerH = siteHeader ? siteHeader.offsetHeight : 0;
      const p = railTravel ? clamp((headerH - railPad - r.top) / railTravel, 0, 1) : 0;
      if (r.bottom > 0 && r.top < vh) {
        railTrack.style.transform = `translate3d(${(-p * railTravel).toFixed(1)}px, 0, 0)`;
        rail.style.setProperty('--rp', p.toFixed(4));
        const vw = window.innerWidth;
        railTrack.querySelectorAll('.rail-card-media:not(.is-cutout)').forEach((m) => {
          const b = m.getBoundingClientRect();
          if (b.right < 0 || b.left > vw) return;
          const off = ((b.left + b.width / 2) / vw - 0.5) * -12;
          m.style.setProperty('--px', `${off.toFixed(2)}%`);
        });
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
