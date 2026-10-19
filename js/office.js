/*
 * Lineage Collections — office page (office.html). Styles: "Office page" in css/styles.css.
 * Photos and products are chosen in js/data.js (officePage); names and prices are live.
 *
 *   [data-workhome]  hero: the same console as a desk (work) and in the living room (home); the
 *                    divider sweeps across as you scroll, or drag it yourself
 *   [data-desk]      the desk: the photo stays pinned and changes as each step scrolls past
 *   [data-consoles]  consoles with built-in power; hover swaps desk and living room photos
 *   [data-lamps]     lamps with a USB port
 */
(function () {
  'use strict';

  const page = document.querySelector('.off-page');
  if (!page) return;

  const Catalog = window.LineageCatalog;
  const CONFIG = (window.LINEAGE_DATA || {}).officePage || {};
  const motion = document.documentElement.classList.contains('motion');
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);
  const shortName = (name) => name.replace(/\s*\((set|pack|\d+\s*p).*$/i, '').trim();

  /* ---------- Hero: work / home ---------- */

  const hero = document.querySelector('.off-hero');
  const split = document.querySelector('[data-workhome]');
  let dragged = null; // where the divider was dragged to (0-1), overrides the scroll
  if (split && CONFIG.hero) {
    split.querySelector('[data-work]').src = CONFIG.hero.work;
    split.querySelector('[data-home]').src = CONFIG.hero.home;
    const handle = split.querySelector('[data-handle]');
    const setFromPointer = (x) => {
      const r = split.getBoundingClientRect();
      dragged = clamp((x - r.left) / r.width, 0, 1);
    };
    let dragging = false;
    handle.addEventListener('pointerdown', (e) => { dragging = true; handle.setPointerCapture(e.pointerId); setFromPointer(e.clientX); });
    handle.addEventListener('pointermove', (e) => { if (dragging) setFromPointer(e.clientX); });
    handle.addEventListener('pointerup', () => { dragging = false; });
    handle.addEventListener('keydown', (e) => {
      const now = dragged ?? 0.5;
      if (e.key === 'ArrowLeft') { dragged = clamp(now - 0.05, 0, 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { dragged = clamp(now + 0.05, 0, 1); e.preventDefault(); }
    });
  }
  function paintHero() {
    if (!hero || !split) return;
    const travel = hero.offsetHeight - window.innerHeight;
    const p = motion ? clamp(-hero.getBoundingClientRect().top / (travel || 1), 0, 1) : 0.5;
    // Scrolling sweeps from work (divider right) to home (divider left); a drag takes over
    const x = dragged ?? clamp(0.88 - p * 0.76, 0.12, 0.88);
    split.style.setProperty('--x', `${(x * 100).toFixed(2)}%`);
    hero.classList.toggle('is-home', x < 0.5);
  }

  /* ---------- The desk: pinned photo, scrolling steps ---------- */

  const desk = document.querySelector('[data-desk]');
  function renderDesk(bySku) {
    if (!desk || !CONFIG.desk) return;
    const p = bySku.get(CONFIG.desk.sku);
    const steps = CONFIG.desk.steps || [];
    desk.querySelector('[data-desk-photos]').innerHTML = steps.map((s, i) =>
      `<img src="${escapeHtml(s.image)}" alt="" data-k="${i}"${i ? ' loading="lazy"' : ' class="is-on"'}>`).join('');
    desk.querySelector('[data-desk-steps]').innerHTML = steps.map((s, i) => `
      <div class="off-step" data-step="${i}">
        <p class="off-step-n">0${i + 1}</p>
        <h3 class="display">${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(s.text)}</p>
      </div>`).join('');
    if (p) {
      desk.querySelector('[data-desk-name]').textContent = p.name;
      desk.querySelector('[data-desk-price]').textContent = p.price == null ? 'Price on request' : money(p.price);
      desk.querySelector('[data-desk-link]').href = p.url;
      const add = desk.querySelector('[data-desk-add]');
      add.addEventListener('click', () => {
        if (!window.LineageCart) return;
        window.LineageCart.add(p, 1);
        add.classList.add('is-added');
        setTimeout(() => add.classList.remove('is-added'), 1800);
      });
    }
  }
  function paintDesk() {
    if (!desk) return;
    const vh = window.innerHeight;
    const steps = desk.querySelectorAll('.off-step');
    let active = 0;
    steps.forEach((s, i) => { if (s.getBoundingClientRect().top < vh * 0.55) active = i; });
    steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
    desk.querySelectorAll('[data-desk-photos] img').forEach((img) => img.classList.toggle('is-on', Number(img.dataset.k) === active));
    const bar = desk.querySelector('[data-desk-progress]');
    if (bar) bar.style.setProperty('--p', `${((active + 1) / (steps.length || 1)) * 100}%`);
  }

  /* ---------- Consoles with built-in power ---------- */

  const consoles = document.querySelector('[data-consoles]');
  function renderConsoles(bySku) {
    if (!consoles) return;
    consoles.innerHTML = (CONFIG.consoles || []).map((c, i) => {
      const p = bySku.get(c.sku);
      if (!p) return '';
      return `
        <a href="${escapeHtml(p.url)}" class="off-console${c.home ? ' has-home' : ''}" style="--i:${i}">
          <span class="off-console-media">
            <img src="${escapeHtml(c.work)}" alt="${escapeHtml(p.name)} used as a desk" loading="lazy">
            ${c.home ? `<img src="${escapeHtml(c.home)}" alt="" loading="lazy" class="is-home">` : ''}
            ${c.home ? '<span class="off-console-tag"><b>Desk</b><b>Console</b></span>' : ''}
          </span>
          <span class="off-console-col">${escapeHtml(p.collection || '')}</span>
          <span class="off-console-name">${escapeHtml(p.name.replace(/\s*(w\/|with)\s.*$/i, '').replace(new RegExp(`^${p.collection}\\s*`, 'i'), ''))}</span>
          <span class="off-console-meta">Outlets and USB built in &middot; three drawers</span>
          <span class="off-console-price">${p.price == null ? 'Price on request' : money(p.price)}</span>
        </a>`;
    }).join('');
  }

  /* ---------- Lamps with USB ---------- */

  const lampsBox = document.querySelector('[data-lamps]');
  function renderLamps(bySku) {
    if (!lampsBox) return;
    lampsBox.innerHTML = (CONFIG.lamps || []).map((sku, i) => {
      const p = bySku.get(sku);
      if (!p) return '';
      return `
        <a href="${escapeHtml(p.url)}" class="off-lamp" style="--i:${i}">
          <span class="off-lamp-media"><img src="${escapeHtml(p.image)}" alt="" loading="lazy"><span class="off-usb" aria-hidden="true">USB</span></span>
          <span class="off-lamp-name">${escapeHtml(shortName(p.name))}</span>
          <span class="off-lamp-price">${p.price == null ? '' : `${money(p.price)} &middot; pair`}</span>
        </a>`;
    }).join('');
  }

  /* ---------- Load ---------- */

  async function load() {
    const bc = window.LineageBC;
    if (!Catalog || !bc || !bc.enabled) return;
    try {
      const raw = await bc.allProducts();
      const bySku = new Map(raw.map(Catalog.classify).map((p) => [p.sku, p]));
      renderDesk(bySku);
      renderConsoles(bySku);
      renderLamps(bySku);
    } catch (err) {
      console.warn('Office page: could not load products.', err);
    }
  }
  load();

  (function frame() {
    paintHero();
    paintDesk();
    requestAnimationFrame(frame);
  })();
})();
