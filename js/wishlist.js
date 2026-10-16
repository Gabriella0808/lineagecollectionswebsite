/*
 * Lineage Collections — wishlist
 *
 * Saved in the visitor's browser (localStorage) as a list of SKUs. The wishlist page
 * (wishlist.html) loads each piece's current name, photo and price from BigCommerce.
 * Any button with data-wish="SKU" saves/removes that product, on any page.
 */
window.LineageWishlist = (function () {
  'use strict';

  const KEY = 'lineage_wishlist_v1';
  const data = window.LINEAGE_DATA || {};
  const listeners = [];
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/></svg>';

  const escapeHtml = (str) =>
    String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);

  /* ---------- Store ---------- */

  function read() {
    try {
      const items = JSON.parse(localStorage.getItem(KEY)) || [];
      return Array.isArray(items) ? items.filter((i) => i && i.sku) : [];
    } catch (e) {
      return [];
    }
  }

  function write(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* storage unavailable */ }
    listeners.forEach((fn) => fn(items));
  }

  const has = (sku) => read().some((i) => i.sku === sku);
  function add(sku) { if (sku && !has(sku)) write([{ sku, addedAt: Date.now() }, ...read()]); }
  function remove(sku) { write(read().filter((i) => i.sku !== sku)); }
  function toggle(sku) { if (has(sku)) remove(sku); else add(sku); }
  function clear() { write([]); }
  function onChange(fn) { listeners.push(fn); }

  // Keep tabs in sync: saving in one tab updates hearts in another.
  window.addEventListener('storage', (e) => { if (e.key === KEY) listeners.forEach((fn) => fn(read())); });

  /* ---------- Hearts + header badge ---------- */

  function syncHearts(items = read()) {
    const saved = new Set(items.map((i) => i.sku));
    document.querySelectorAll('[data-wish]').forEach((btn) => {
      const on = saved.has(btn.dataset.wish);
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Save to wishlist');
    });
    document.querySelectorAll('.wish-count').forEach((el) => {
      el.textContent = items.length;
      el.hidden = items.length === 0;
    });
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-wish]');
    if (!btn) return;
    e.preventDefault();
    toggle(btn.dataset.wish);
  });

  // Product cards are drawn by script, so set heart states whenever new ones appear.
  new MutationObserver((mutations) => {
    const added = mutations.some((m) => Array.from(m.addedNodes).some((n) =>
      n.nodeType === 1 && (n.matches('[data-wish]') || n.querySelector('[data-wish]'))));
    if (added) syncHearts();
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* ---------- Wishlist page ---------- */

  const details = new Map(); // sku -> product details already loaded
  let renderId = 0;

  async function loadDetails(skus) {
    const missing = skus.filter((sku) => !details.has(sku));
    if (!missing.length) return;
    try {
      if (!window.LineageBC || !window.LineageBC.enabled) throw new Error('BigCommerce not configured');
      (await window.LineageBC.productsBySku(missing)).forEach((p) => details.set(p.sku, p));
    } catch (err) {
      console.warn('Wishlist: BigCommerce unavailable, using saved products.', err);
    }
    missing.forEach((sku) => {
      if (details.has(sku)) return;
      const saved = (data.newIntros || []).find((p) => p.sku === sku);
      if (saved) details.set(sku, { ...saved, inStock: true });
    });
  }

  function cardHtml(p) {
    return `
      <article class="shop-card">
        <div class="shop-card-media-wrap">
          <a href="${escapeHtml(p.url)}" class="shop-card-media" tabindex="-1" aria-hidden="true">
            ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy">` : '<span class="shop-card-placeholder">Image coming soon</span>'}
          </a>
          ${p.inStock === false ? '<span class="shop-badge">Out of stock</span>' : ''}
          <button type="button" class="wish-toggle" data-wish="${escapeHtml(p.sku)}" aria-pressed="true" aria-label="Remove from wishlist">${HEART}</button>
        </div>
        <div class="shop-card-body">
          ${p.brand ? `<p class="shop-card-eyebrow">${escapeHtml(p.brand)}</p>` : ''}
          <h3 class="shop-card-name"><a href="${escapeHtml(p.url)}">${escapeHtml(p.name)}</a></h3>
          <p class="shop-card-price">${p.price == null ? 'Price on request' : money(p.price, p.currency)}</p>
          <button type="button" class="btn btn-dark btn-block wishlist-add" data-wish-add="${escapeHtml(p.sku)}">Add to cart</button>
        </div>
      </article>`;
  }

  async function renderPage(items = read()) {
    const page = document.getElementById('wishlistPage');
    if (!page) return;
    const id = ++renderId;

    if (!items.length) {
      page.innerHTML = `
        <div class="wishlist-empty">
          <p>Your wishlist is empty. Tap the heart on any piece to save it here.</p>
          <a href="shop.html" class="btn btn-dark">Browse the shop</a>
        </div>`;
      return;
    }

    if (!items.every((i) => details.has(i.sku))) {
      page.innerHTML = `<div class="shop-grid wishlist-grid">${'<article class="shop-card is-loading"><div class="shop-card-media-wrap"><div class="shop-card-media"></div></div></article>'.repeat(Math.min(items.length, 4))}</div>`;
    }
    await loadDetails(items.map((i) => i.sku));
    if (id !== renderId) return; // a newer change has already re-rendered

    const products = items.map((i) => details.get(i.sku)).filter(Boolean);
    const total = products.reduce((sum, p) => sum + (p.price || 0), 0);
    page.innerHTML = `
      <div class="wishlist-bar">
        <p class="wishlist-count"><strong>${items.length}</strong> saved ${items.length === 1 ? 'piece' : 'pieces'}${total ? ` &middot; ${money(total)} MSRP` : ''}</p>
        <div class="wishlist-actions">
          <button type="button" class="chip-clear" data-wish-clear>Clear wishlist</button>
          <button type="button" class="btn btn-light btn-outline" data-wish-all>Add all to cart</button>
          <button type="button" class="btn btn-dark" data-wish-quote>Request a quote for all</button>
        </div>
      </div>
      <div class="shop-grid wishlist-grid">${products.map(cardHtml).join('')}</div>`;
  }

  // Buttons on the wishlist page
  document.addEventListener('click', (e) => {
    const cart = window.LineageCart;
    const one = e.target.closest('[data-wish-add]');
    if (one && cart) {
      const p = details.get(one.dataset.wishAdd);
      if (p) { cart.add(p); cart.open(); }
      return;
    }
    if (e.target.closest('[data-wish-all]') && cart) {
      read().forEach((i) => { const p = details.get(i.sku); if (p) cart.add(p); });
      cart.open();
      return;
    }
    if (e.target.closest('[data-wish-quote]') && cart) {
      read().forEach((i) => { const p = details.get(i.sku); if (p) cart.add(p); });
      location.href = 'dealer-portal.html?handoff=cart';
      return;
    }
    if (e.target.closest('[data-wish-clear]') && confirm('Remove every piece from your wishlist?')) clear();
  });

  /* ---------- Init ---------- */

  onChange((items) => { syncHearts(items); renderPage(items); });

  function init() {
    syncHearts();
    renderPage();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { has, add, remove, toggle, clear, onChange, items: read };
})();
