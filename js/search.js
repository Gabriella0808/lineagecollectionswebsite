/*
 * Lineage Collections — site search
 *
 * The header's Search link opens a panel with results as you type. Enter goes to
 * search.html?q=…, which shows the full results (rendered into <div id="searchPage">).
 *
 * Searches the catalog in js/data.js (products, collections, pages). When the store is
 * on BigCommerce / Shopify, swap search() for a call to their search API and keep the
 * same result shape: { products, collections, pages }.
 */
window.LineageSearch = (function () {
  'use strict';

  const data = window.LINEAGE_DATA || {};
  const RESULTS_URL = 'search.html';
  const PANEL_LIMIT = 4;

  const escapeHtml = (str) =>
    String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const formatPrice = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount) || 0);

  const normalize = (str) => String(str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const tokenize = (str) => normalize(str).split(/[^a-z0-9]+/).filter(Boolean);

  /* ---------- Index ---------- */

  const index = {
    products: (data.newIntros || []).map((p) => ({
      item: p,
      title: normalize(p.name),
      text: normalize([p.name, p.sku, p.collection, p.category, p.brand].join(' '))
    })),
    collections: (data.collections || []).map((c) => ({
      item: c,
      title: normalize(c.name),
      text: normalize([c.name, c.brand, (c.hotspots || []).map((h) => h.label).join(' ')].join(' '))
    })),
    pages: (data.searchPages || []).map((pg) => ({
      item: pg,
      title: normalize(pg.title),
      text: normalize([pg.title, pg.keywords].join(' '))
    }))
  };

  // Every search word must appear somewhere; titles that start with / contain the query rank higher.
  function score(entry, query, tokens) {
    if (!tokens.every((t) => entry.text.includes(t))) return 0;
    let s = 1;
    if (entry.title.startsWith(query)) s += 3;
    else if (entry.title.includes(query)) s += 2;
    s += tokens.filter((t) => entry.title.split(/[^a-z0-9]+/).some((w) => w.startsWith(t))).length;
    return s;
  }

  function search(q) {
    const query = normalize(q).trim();
    const tokens = tokenize(q);
    const empty = { products: [], collections: [], pages: [], total: 0 };
    if (!tokens.length) return empty;

    const run = (list) => list
      .map((entry) => ({ entry, s: score(entry, query, tokens) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.entry.item);

    const results = { products: run(index.products), collections: run(index.collections), pages: run(index.pages) };
    results.total = results.products.length + results.collections.length + results.pages.length;
    return results;
  }

  // Products come from BigCommerce search when it's connected; collections and pages stay local.
  async function searchAll(q, productLimit) {
    const results = search(q);
    const bc = window.LineageBC;
    if (!bc || !bc.enabled || !tokenize(q).length) return results;
    try {
      const r = await bc.searchProducts(q.trim(), productLimit);
      results.products = r.products;
      results.productsTotal = r.total;
      results.total = r.total + results.collections.length + results.pages.length;
    } catch (err) {
      console.warn('Search: BigCommerce unavailable, using saved products.', err);
    }
    return results;
  }

  /* ---------- Rendering ---------- */

  function productHtml(p) {
    return `
      <a href="${escapeHtml(p.url)}" class="search-product">
        <span class="search-product-media">${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy">` : ''}</span>
        <span class="search-product-name">${escapeHtml(p.name)}</span>
        <span class="search-product-meta">${p.price == null ? '' : formatPrice(p.price, p.currency)}</span>
      </a>`;
  }

  function linkHtml(href, title, sub) {
    return `
      <li><a href="${escapeHtml(href)}" class="search-link">
        <span>${escapeHtml(title)}</span>${sub ? `<small>${escapeHtml(sub)}</small>` : ''}
      </a></li>`;
  }

  function resultsHtml(results, q, limit) {
    if (!results.total) {
      return `<p class="search-empty">No results for &ldquo;${escapeHtml(q)}&rdquo;. Try another word, or <a href="contact.html">contact us</a> and we'll help you find it.</p>`;
    }
    const cut = (list) => (limit ? list.slice(0, limit) : list);
    const products = results.products.length ? `
      <section class="search-group">
        <h3 class="search-group-title">Products <span>${results.productsTotal || results.products.length}</span></h3>
        <div class="search-products">${cut(results.products).map(productHtml).join('')}</div>
      </section>` : '';
    const collections = results.collections.length ? `
      <section class="search-group">
        <h3 class="search-group-title">Collections <span>${results.collections.length}</span></h3>
        <ul class="search-links">${cut(results.collections).map((c) => linkHtml(c.url, c.name, c.brand && `By ${c.brand}`)).join('')}</ul>
      </section>` : '';
    const pages = results.pages.length ? `
      <section class="search-group">
        <h3 class="search-group-title">Pages <span>${results.pages.length}</span></h3>
        <ul class="search-links">${cut(results.pages).map((pg) => linkHtml(pg.url, pg.title)).join('')}</ul>
      </section>` : '';
    return `<div class="search-results-grid">${products}<div class="search-side">${collections}${pages}</div></div>`;
  }

  /* ---------- Panel ---------- */

  let panel = null;
  let lastFocus = null;

  function buildPanel() {
    panel = document.createElement('div');
    panel.className = 'search-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="search-panel-backdrop" data-search-close></div>
      <div class="search-panel-sheet" role="dialog" aria-modal="true" aria-label="Search">
        <div class="container">
          <form class="search-form" action="${RESULTS_URL}" role="search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <label for="searchPanelInput" class="visually-hidden">Search</label>
            <input id="searchPanelInput" name="q" type="search" placeholder="Search products, collections and more" autocomplete="off">
            <button type="button" class="icon-btn" data-search-close aria-label="Close search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </form>
          <div class="search-panel-results" aria-live="polite"></div>
        </div>
      </div>`;
    document.body.appendChild(panel);

    const input = panel.querySelector('input');
    const results = panel.querySelector('.search-panel-results');

    let timer = null;
    let latest = 0;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (!q) { results.innerHTML = ''; return; }
      // Wait for a short pause in typing, and only show the answer to the latest query.
      timer = setTimeout(async () => {
        const id = ++latest;
        results.classList.add('is-loading');
        const r = await searchAll(q, PANEL_LIMIT);
        if (id !== latest) return;
        results.classList.remove('is-loading');
        const more = r.total > 0 ? `<a href="${RESULTS_URL}?q=${encodeURIComponent(q)}" class="link-underline search-all">See all ${r.total} result${r.total === 1 ? '' : 's'}</a>` : '';
        results.innerHTML = resultsHtml(r, q, PANEL_LIMIT) + more;
      }, 250);
    });

    panel.querySelector('form').addEventListener('submit', (e) => {
      if (!input.value.trim()) e.preventDefault();
    });

    panel.addEventListener('click', (e) => { if (e.target.closest('[data-search-close]')) closePanel(); });
    panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });
  }

  function openPanel() {
    if (!panel) buildPanel();
    lastFocus = document.activeElement;
    panel.hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => {
      panel.classList.add('is-open');
      panel.querySelector('input').focus();
    });
  }

  function closePanel() {
    if (!panel || panel.hidden) return;
    panel.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => { panel.hidden = true; }, 300);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- Results page ---------- */

  function renderPage() {
    const page = document.getElementById('searchPage');
    if (!page) return;
    const form = document.getElementById('searchPageForm');
    const input = form.querySelector('input');
    const heading = document.getElementById('searchPageHeading');

    const run = async () => {
      const q = input.value.trim();
      if (!q) {
        heading.textContent = 'Search';
        page.innerHTML = '<p class="search-empty">Type a product name, collection or SKU to get started.</p>';
        return;
      }
      heading.textContent = `Searching for \u201c${q}\u201d\u2026`;
      const r = await searchAll(q, 48);
      if (input.value.trim() !== q) return;
      heading.textContent = `${r.total} result${r.total === 1 ? '' : 's'} for “${q}”`;
      page.innerHTML = resultsHtml(r, q, 0);
      document.title = `Search: ${q} | Lineage Collections`;
    };

    input.value = new URLSearchParams(location.search).get('q') || '';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      history.replaceState(null, '', `${RESULTS_URL}?q=${encodeURIComponent(input.value.trim())}`);
      run();
    });
    run();
  }

  /* ---------- Init ---------- */

  function init() {
    // On the results page the header link just focuses the page's own search box.
    document.querySelectorAll('.action-search').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageInput = document.querySelector('#searchPageForm input');
        if (pageInput) pageInput.focus();
        else openPanel();
      });
    });
    renderPage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { search, searchAll, open: openPanel, close: closePanel };
})();
