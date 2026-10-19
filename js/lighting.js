/*
 * Lineage Collections — lighting page (lighting.html). Styles: "Lighting page" in css/styles.css.
 * Photos and lamps are chosen in js/data.js (lightingPage); everything else is live from BigCommerce.
 *
 *   [data-lit-row]       hero: lamps photographed lit on black switch on one by one, then drift
 *                        apart as you scroll
 *   [data-lamps]         "Find your lamp": one card per design with its finishes as swatches;
 *                        filters glide the cards to their new places
 *   [data-after-dark]    evening room photos that brighten as they reach the middle of the screen
 *   [data-lights-out]    the closing lamp and its switch
 */
(function () {
  'use strict';

  const page = document.querySelector('.lit-page');
  if (!page) return;

  const Catalog = window.LineageCatalog;
  const CONFIG = (window.LINEAGE_DATA || {}).lightingPage || {};
  const motion = document.documentElement.classList.contains('motion');
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);
  const shortName = (name) => name.replace(/\s*\((set|pack|\d+\s*p).*$/i, '').replace(/,\s*\d+"\s*/, ' ').trim();

  /* ---------- Hero: the row of lamps ---------- */

  const row = document.querySelector('[data-lit-row]');
  const heroLamps = CONFIG.heroLamps || [];

  function renderRow(bySku) {
    if (!row) return;
    const mid = (heroLamps.length - 1) / 2;
    row.innerHTML = heroLamps.map((l, i) => {
      const p = bySku.get(l.sku);
      const floor = /floor/i.test(p ? p.name : '') || /FL-/.test(l.sku);
      return `
        <a ${p ? `href="${escapeHtml(p.url)}"` : ''} class="lit-lamp${floor ? ' is-floor' : ''}" style="--i:${i};--k:${(i - mid).toFixed(1)}">
          <span class="lit-glow" aria-hidden="true"></span>
          <img src="${escapeHtml(l.image)}" alt="${escapeHtml(p ? p.name : '')}" draggable="false">
          ${p ? `<span class="lit-lamp-tag"><b>${escapeHtml(shortName(p.name))}</b>${p.price == null ? '' : money(p.price)}</span>` : ''}
        </a>`;
    }).join('');
    // One by one, left to right, each with a small flicker
    const lamps = Array.from(row.querySelectorAll('.lit-lamp'));
    lamps.forEach((lamp, i) => setTimeout(() => lamp.classList.add('is-on'), motion ? 700 + i * 260 : 0));
  }

  const hero = document.querySelector('.lit-hero');
  function paintHero() {
    if (!hero || !motion) return;
    const p = clamp(-hero.getBoundingClientRect().top / hero.offsetHeight, 0, 1);
    hero.style.setProperty('--hp', p.toFixed(4));
  }

  /* ---------- Find your lamp ---------- */

  const grid = document.querySelector('[data-lamps]');
  const filters = document.querySelector('[data-filters]');
  const COASTAL = /shell|conch|coral|sand dollar|sea horse|turtle|marlin|buoy|pompano|patrick|harbor|coast|fish|anchor|lighthouse|shutter|piper/i;
  const TESTS = {
    all: () => true,
    table: (p) => p.type === 'Table Lamps',
    floor: (p) => p.type === 'Floor Lamps',
    pair: (p) => /set of 2|pack of 2|2\s*pk/i.test(p.name),
    coastal: (p) => COASTAL.test(p.name),
    under: (p) => p.price != null && p.price < 450
  };
  let designs = []; // one per lamp design, each with its finishes
  let filterKey = 'all';
  let expanded = false;
  const FIRST = 12; // designs shown before "Show all"

  // The finish from the SKU: LUX-3925-BLUE-USB -> Blue, LUX-106-BLUE/WHITE -> Blue / White
  const SKIP = /^(USB|NLITE|2|SET)$/i;
  function finishOf(p) {
    const parts = p.sku.replace(/^LUX-(FL-)?[A-Z]?\d+-?/i, '').split('-').filter((w) => w && !SKIP.test(w));
    return parts.join(' ').split('/').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' / ') || 'Standard';
  }
  const SWATCH = {
    white: '#f4f1ea', blanc: '#f4f1ea', pearl: '#ece4d6', shell: '#eadfcd', beige: '#dccbaa', nat: '#c6a57a',
    natural: '#c6a57a', rattan: '#b88b55', driftwood: '#9c8a75', sandstone: '#cdb796', limestone: '#d7cfbf',
    stone: '#b8afa0', marble: '#ddd6cb', carmel: '#b07a45', brown: '#7a5638', orange: '#d4823b', gold: '#c9a24b',
    blue: '#3f6d93', navy: '#22395c', aqua: '#7cc6c6', teal: '#2f7f80', green: '#5d8a5a', grey: '#8b9095',
    gray: '#8b9095', slate: '#6f767c', silver: '#b9b9b9', black: '#26231f', tri: '#9b8b6f', bling: '#d9d6d0'
  };
  const swatchOf = (finish) => {
    const cols = finish.toLowerCase().split(' / ').map((w) => SWATCH[w.trim()] || '#cfc8bd');
    return cols.length > 1 ? `linear-gradient(135deg, ${cols[0]} 50%, ${cols[1]} 50%)` : cols[0];
  };
  const isPair = (p) => /set of 2|pack of 2|2\s*pk|2 pack/i.test(p.name);

  // Group the SKUs into designs: same name and type, different finish
  function groupDesigns(list) {
    const map = new Map();
    list.forEach((p) => {
      const key = `${p.type}|${shortName(p.name).toLowerCase().replace(/[^a-z]/g, '')}`;
      if (!map.has(key)) map.set(key, { name: shortName(p.name), type: p.type, variants: [] });
      map.get(key).variants.push({ p, finish: finishOf(p) });
    });
    return Array.from(map.values())
      // Most finishes first, then the ones with the fullest galleries, so the opening grid is the strongest
      .sort((a, b) => b.variants.length - a.variants.length || (a.type === 'Floor Lamps') - (b.type === 'Floor Lamps') || a.name.localeCompare(b.name));
  }

  const matchesDesign = (d) => d.variants.some((v) => TESTS[filterKey](v.p));

  function cardHtml(d, i) {
    const v = d.variants.find((x) => TESTS[filterKey](x.p)) || d.variants[0];
    const p = v.p;
    return `
      <article class="lit-card" data-design="${i}">
        <a href="${escapeHtml(p.url)}" class="lit-card-media" data-card-link>
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" data-card-img>
        </a>
        <div class="lit-card-body">
          <h3 class="lit-card-name"><a href="${escapeHtml(p.url)}" data-card-link>${escapeHtml(d.name)}</a></h3>
          <p class="lit-card-meta">${d.type === 'Floor Lamps' ? 'Floor lamp' : 'Table lamp'}${isPair(p) ? ' &middot; sold as a pair' : ''}</p>
          <p class="lit-card-price" data-card-price>${p.price == null ? 'Price on request' : money(p.price)}</p>
          ${d.variants.length > 1 ? `
            <div class="lit-swatches" role="radiogroup" aria-label="Finish">
              ${d.variants.map((x, k) => `<button type="button" role="radio" class="lit-swatch" data-variant="${k}" aria-checked="${x === v}" title="${escapeHtml(x.finish)}" aria-label="${escapeHtml(x.finish)}" style="--sw:${swatchOf(x.finish)}"></button>`).join('')}
              <span class="lit-finish" data-card-finish>${escapeHtml(v.finish)}</span>
            </div>` : `<p class="lit-finish is-single">${escapeHtml(v.finish)}</p>`}
        </div>
      </article>`;
  }

  function renderGrid(animate) {
    const shown = designs.filter(matchesDesign);
    const visible = expanded ? shown : shown.slice(0, FIRST);
    const before = new Map(Array.from(grid.children).map((c) => [c.dataset.key, c.getBoundingClientRect()]));
    grid.innerHTML = visible.map((d) => cardHtml(d, designs.indexOf(d))).join('');
    Array.from(grid.children).forEach((c) => { c.dataset.key = c.dataset.design; });
    filters.querySelectorAll('[data-filter]').forEach((b) => {
      b.querySelector('span').textContent = designs.filter((d) => d.variants.some((v) => TESTS[b.dataset.filter](v.p))).length;
      b.setAttribute('aria-pressed', String(b.dataset.filter === filterKey));
    });
    more.hidden = shown.length <= FIRST;
    more.querySelector('[data-more-label]').textContent = expanded ? 'Show fewer' : `Show all ${shown.length} designs`;
    if (!animate || !motion) return;
    // Cards glide from where they were; new ones rise in, one after another
    Array.from(grid.children).forEach((c, k) => {
      const a = before.get(c.dataset.key);
      const b = c.getBoundingClientRect();
      c.animate(a
        ? [{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: 'none' }]
        : [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }],
      { duration: 700, delay: a ? 0 : Math.min(k, 14) * 40, easing: 'cubic-bezier(.22, .61, .36, 1)', fill: 'backwards' });
    });
  }

  // Picking a finish swaps the photo, price and link in place
  function pickVariant(card, k) {
    const d = designs[Number(card.dataset.design)];
    const v = d.variants[k];
    const img = card.querySelector('[data-card-img]');
    img.classList.add('is-swapping');
    const next = new Image();
    next.onload = () => {
      img.src = v.p.image;
      img.alt = v.p.name;
      img.classList.remove('is-swapping');
    };
    next.src = v.p.image;
    card.querySelectorAll('[data-card-link]').forEach((a) => { a.href = v.p.url; });
    card.querySelector('[data-card-price]').textContent = v.p.price == null ? 'Price on request' : money(v.p.price);
    card.querySelector('[data-card-finish]').textContent = v.finish;
    card.querySelectorAll('[data-variant]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.variant) === k)));
  }

  const more = document.querySelector('[data-more-lamps]');

  if (filters) {
    filters.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b || b.dataset.filter === filterKey) return;
      filterKey = b.dataset.filter;
      renderGrid(true);
    });
    grid.addEventListener('click', (e) => {
      const sw = e.target.closest('[data-variant]');
      if (sw) pickVariant(sw.closest('.lit-card'), Number(sw.dataset.variant));
    });
    more.addEventListener('click', () => {
      expanded = !expanded;
      renderGrid(true);
      if (!expanded) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---------- After dark ---------- */

  const dark = document.querySelector('[data-after-dark]');
  function renderDark(bySku) {
    if (!dark) return;
    dark.innerHTML = (CONFIG.afterDark || []).map((r, i) => {
      const p = bySku.get(r.sku);
      return `
        <a ${p ? `href="${escapeHtml(p.url)}"` : ''} class="lit-night" style="--i:${i}">
          <span class="lit-night-media"><img src="${escapeHtml(r.image)}" alt="${escapeHtml(p ? `${p.name} in an evening room` : '')}" loading="lazy"></span>
          ${p ? `<span class="lit-night-cap"><b>${escapeHtml(shortName(p.name))}</b><span>${money(p.price)} &rarr;</span></span>` : ''}
        </a>`;
    }).join('');
  }
  // Each photo brightens as it reaches the middle of the screen, as if the lamp were switched on
  function paintDark() {
    if (!dark || !motion) return;
    const vh = window.innerHeight;
    dark.querySelectorAll('.lit-night').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const d = Math.abs(r.top + r.height / 2 - vh / 2) / (vh / 2);
      el.style.setProperty('--on', clamp(1.25 - d, 0, 1).toFixed(3));
    });
  }

  /* ---------- Lights out ---------- */

  const out = document.querySelector('[data-lights-out]');
  if (out) {
    const lamp = out.querySelector('[data-closing-lamp]');
    if (CONFIG.closingLamp) lamp.innerHTML = `<span class="lit-glow" aria-hidden="true"></span><img src="${escapeHtml(CONFIG.closingLamp.image)}" alt="">`;
    const sw = out.querySelector('[data-switch]');
    if (sw) sw.addEventListener('click', () => {
      const off = !out.classList.contains('is-off');
      out.classList.toggle('is-off', off);
      sw.setAttribute('aria-pressed', String(!off));
      sw.querySelector('b').textContent = off ? 'Lights on' : 'Lights out';
    });
  }

  /* ---------- Load ---------- */

  async function load() {
    const bc = window.LineageBC;
    if (!Catalog || !bc || !bc.enabled) { renderRow(new Map()); return; }
    try {
      const raw = await bc.allProducts();
      const all = raw.map(Catalog.classify).filter((p) => p.room === 'lighting');
      const bySku = new Map(all.map((p) => [p.sku, p]));
      renderRow(bySku);
      renderDark(bySku);
      const seen = new Set();
      const lamps = all.filter((p) => p.image && !/display/i.test(p.name) && !seen.has(p.sku) && seen.add(p.sku));
      designs = groupDesigns(lamps);
      document.querySelectorAll('[data-count="pieces"]').forEach((el) => { el.textContent = designs.length; });
      if (grid) renderGrid(false);
    } catch (err) {
      console.warn('Lighting page: could not load products.', err);
      renderRow(new Map());
    }
  }
  load();

  (function frame() {
    paintHero();
    paintDark();
    requestAnimationFrame(frame);
  })();
})();
