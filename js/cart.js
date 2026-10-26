/*
 * Lineage Collections — cart
 *
 * Shared by every page. Stores the cart in the browser (localStorage) and renders:
 *   - the count badge on the bag icon
 *   - a slide-out drawer (opened by the bag icon or after adding an item)
 *   - the full cart page, when the page has <div id="cartPage">
 *
 * Checkout hands the cart to the dealer portal as a quote request:
 *   cart -> dealer-portal.html?handoff=cart -> postMessage into the embedded portal.
 * The portal answers "lineage:portal-ready" once a dealer is signed in, receives
 * "lineage:cart-handoff", and confirms with "lineage:cart-received" (then the
 * website cart is cleared). Item fields match the portal's CartItem type.
 */
window.LineageCart = (function () {
  'use strict';

  const STORAGE_KEY = 'lineage_cart_v2';
  const config = (window.LINEAGE_DATA && window.LINEAGE_DATA.portal) || {};
  const PORTAL_ORIGIN = config.origin || 'https://lineage-collections-portal.com';
  const CHECKOUT_URL = 'dealer-portal.html?handoff=cart';

  const listeners = [];

  const escapeHtml = (str) =>
    String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const formatPrice = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount) || 0);

  /* ---------- Store ---------- */

  function read() {
    try {
      const items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      return Array.isArray(items) ? items.filter((i) => i && i.sku && i.qty > 0) : [];
    } catch (e) {
      return [];
    }
  }

  function write(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) { /* storage unavailable */ }
    listeners.forEach((fn) => fn(items));
  }

  function getItems() { return read(); }
  function count(items = read()) { return items.reduce((n, i) => n + i.qty, 0); }
  function subtotal(items = read()) { return items.reduce((n, i) => n + (Number(i.price) || 0) * i.qty, 0); }

  function add(product, qty = 1) {
    if (!product || !product.sku) return;
    const items = read();
    const existing = items.find((i) => i.sku === product.sku);
    if (existing) existing.qty += qty;
    else {
      items.push({
        sku: product.sku,
        name: product.name,
        brand: product.brand || null,
        image: product.image || null,
        price: product.price == null ? null : Number(product.price),
        currency: product.currency || 'USD',
        url: product.url || null,
        qty
      });
    }
    write(items);
  }

  function setQty(sku, qty) {
    const items = read();
    const item = items.find((i) => i.sku === sku);
    if (!item) return;
    const n = Math.floor(Number(qty));
    if (!Number.isFinite(n)) return;
    if (n < 1) return remove(sku);
    item.qty = Math.min(n, 999);
    write(items);
  }

  function remove(sku) { write(read().filter((i) => i.sku !== sku)); }
  function clear() { write([]); }
  function onChange(fn) { listeners.push(fn); }

  // Keep tabs in sync: adding in one tab updates the badge in another.
  window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY) listeners.forEach((fn) => fn(read())); });

  /* ---------- Shared rendering ---------- */

  function lineHtml(item) {
    const name = item.url
      ? `<a href="${escapeHtml(item.url)}">${escapeHtml(item.name)}</a>`
      : escapeHtml(item.name);
    return `
      <li class="cart-line" data-sku="${escapeHtml(item.sku)}">
        <div class="cart-line-media">
          ${item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy">` : ''}
        </div>
        <div class="cart-line-info">
          <p class="cart-line-name">${name}</p>
          <p class="cart-line-sku">SKU ${escapeHtml(item.sku)}</p>
          <div class="cart-line-controls">
            <div class="qty" role="group" aria-label="Quantity for ${escapeHtml(item.name)}">
              <button type="button" data-action="dec" aria-label="Decrease quantity">&minus;</button>
              <input type="number" min="1" max="999" inputmode="numeric" value="${item.qty}" data-action="qty" aria-label="Quantity">
              <button type="button" data-action="inc" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" class="cart-line-remove" data-action="remove">Remove</button>
          </div>
        </div>
        <p class="cart-line-price">${item.price == null ? '&mdash;' : formatPrice(item.price * item.qty, item.currency)}</p>
      </li>`;
  }

  // Quantity buttons, typed quantities and Remove, for any container of cart lines.
  function bindLineActions(container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || btn.tagName === 'INPUT') return;
      const sku = btn.closest('.cart-line').dataset.sku;
      const item = read().find((i) => i.sku === sku);
      if (!item) return;
      if (btn.dataset.action === 'inc') setQty(sku, item.qty + 1);
      if (btn.dataset.action === 'dec') setQty(sku, item.qty - 1);
      if (btn.dataset.action === 'remove') remove(sku);
    });
    container.addEventListener('change', (e) => {
      if (e.target.dataset.action !== 'qty') return;
      setQty(e.target.closest('.cart-line').dataset.sku, e.target.value);
    });
  }

  /* ---------- Badge ---------- */

  function renderBadges(items) {
    const n = count(items);
    document.querySelectorAll('.cart-count').forEach((el) => {
      el.textContent = n;
      el.hidden = n === 0;
    });
    document.querySelectorAll('.cart-btn').forEach((el) => {
      el.setAttribute('aria-label', n ? `Cart, ${n} item${n === 1 ? '' : 's'}` : 'Cart');
    });
  }

  /* ---------- Drawer ---------- */

  let drawer = null;
  let lastFocus = null;

  function buildDrawer() {
    drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    drawer.hidden = true;
    drawer.innerHTML = `
      <div class="cart-drawer-backdrop" data-cart-close></div>
      <aside class="cart-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="cartDrawerTitle">
        <div class="cart-drawer-head">
          <h2 class="display" id="cartDrawerTitle">Your Cart</h2>
          <button type="button" class="icon-btn" data-cart-close aria-label="Close cart">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <div class="cart-drawer-body"><ul class="cart-lines" data-cart-lines></ul></div>
        <div class="cart-drawer-foot" data-cart-foot></div>
      </aside>`;
    document.body.appendChild(drawer);

    drawer.addEventListener('click', (e) => { if (e.target.closest('[data-cart-close]')) closeDrawer(); });
    drawer.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
      if (e.key === 'Tab') trapFocus(e);
    });
    bindLineActions(drawer.querySelector('[data-cart-lines]'));
    renderDrawer(read());
  }

  function renderDrawer(items) {
    if (!drawer) return;
    const lines = drawer.querySelector('[data-cart-lines]');
    const foot = drawer.querySelector('[data-cart-foot]');
    if (!items.length) {
      lines.innerHTML = '<li class="cart-empty"><p>Your cart is empty.</p></li>';
      foot.innerHTML = '<a href="shop.html" class="btn btn-dark btn-block" data-cart-close>Continue shopping</a>';
      return;
    }
    lines.innerHTML = items.map(lineHtml).join('');
    foot.innerHTML = `
      <div class="cart-subtotal"><span>Subtotal</span><span>${formatPrice(subtotal(items))}</span></div>
      <p class="cart-note">Prices shown are MSRP. Dealer pricing is confirmed on your quote.</p>
      <a href="${CHECKOUT_URL}" class="btn btn-dark btn-block">Request a Quote</a>
      <a href="cart.html" class="cart-view-link">View cart</a>`;
  }

  function openDrawer() {
    if (!drawer) buildDrawer();
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => {
      drawer.classList.add('is-open');
      drawer.querySelector('.cart-drawer-head [data-cart-close]').focus();
    });
  }

  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { drawer.hidden = true; }, 350);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function trapFocus(e) {
    const focusable = drawer.querySelectorAll('.cart-drawer-panel a[href], .cart-drawer-panel button, .cart-drawer-panel input');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Cart page ---------- */

  function renderPage(items) {
    const page = document.getElementById('cartPage');
    if (!page) return;
    if (!items.length) {
      page.innerHTML = `
        <div class="cart-page-empty">
          <p>Your cart is empty.</p>
          <a href="index.html" class="btn btn-dark">Continue shopping</a>
        </div>`;
      return;
    }
    page.innerHTML = `
      <div class="cart-page-grid">
        <ul class="cart-lines cart-lines-lg" data-cart-lines>${items.map(lineHtml).join('')}</ul>
        <aside class="cart-summary">
          <h2 class="display">Summary</h2>
          <div class="cart-subtotal"><span>Subtotal (${count(items)} item${count(items) === 1 ? '' : 's'})</span><span>${formatPrice(subtotal(items))}</span></div>
          <p class="cart-note">Prices shown are MSRP. Your quote is reviewed by our team and dealer pricing is confirmed before anything is ordered.</p>
          <a href="${CHECKOUT_URL}" class="btn btn-dark btn-block">Request a Quote</a>
          <p class="cart-note">You'll sign in to the dealer portal to send your request.</p>
          <a href="index.html" class="cart-view-link">Continue shopping</a>
        </aside>
      </div>`;
  }

  /* ---------- Hand-off to the dealer portal ---------- */

  function portalHandoff() {
    const params = new URLSearchParams(location.search);
    const frame = document.querySelector('.portal-frame');
    if (params.get('handoff') !== 'cart' || !frame) return;
    frame.src = PORTAL_ORIGIN + '/cart';

    const items = read();
    if (!items.length) return;

    // One id per hand-off so the portal can ignore repeats (it may announce "ready" more than once).
    const handoffId = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
    const payload = {
      type: 'lineage:cart-handoff',
      handoffId,
      items: items.map((i) => ({
        sku: i.sku,
        name: i.name,
        brand: i.brand,
        image_url: i.image ? new URL(i.image, location.href).href : null,
        base_price: i.price,
        quantity: i.qty
      }))
    };

    const send = () => {
      try { frame.contentWindow.postMessage(payload, PORTAL_ORIGIN); } catch (e) { /* frame not ready */ }
    };

    // The portal may load before or after this script, and the dealer may need to sign in first,
    // so: send now, on frame load, whenever the portal says it's ready, and every 1.5s for two
    // minutes until it confirms. The portal ignores repeats of the same handoffId.
    let tries = 0;
    const retry = setInterval(() => { if (++tries > 80) clearInterval(retry); else send(); }, 1500);

    window.addEventListener('message', (e) => {
      if (e.origin !== PORTAL_ORIGIN || e.source !== frame.contentWindow || !e.data) return;
      if (e.data.type === 'lineage:portal-ready') send();
      if (e.data.type === 'lineage:cart-received' && e.data.handoffId === handoffId) {
        clearInterval(retry);
        clear();
        history.replaceState(null, '', location.pathname);
      }
    });
    frame.addEventListener('load', send);
    send();
  }

  /* ---------- Init ---------- */

  function init() {
    renderBadges(read());
    renderPage(read());
    onChange((items) => { renderBadges(items); renderDrawer(items); renderPage(items); });

    // The cart page has its own cart, so the bag icon only opens the drawer elsewhere.
    if (!document.getElementById('cartPage')) {
      document.querySelectorAll('.cart-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); });
      });
    }

    const page = document.getElementById('cartPage');
    if (page) bindLineActions(page);
  }

  // Start listening for the portal right away (this script loads at the end of <body>, so the
  // portal frame already exists); waiting for DOMContentLoaded could miss its "ready" message.
  portalHandoff();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { getItems, add, setQty, remove, clear, count, subtotal, onChange, open: openDrawer, close: closeDrawer, formatPrice };
})();
