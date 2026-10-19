/*
 * Lineage Collections — Shop page (shop.html)
 *
 * Loads the whole BigCommerce catalog once, then filters and sorts in the browser, so every
 * click is instant. Each product's room, type and collection come from js/catalog.js.
 *
 * All filter state lives in the URL (shop.html?room=bedroom&type=Beds&brand=Sea+Winds...),
 * so filtered views can be shared and the back button works.
 */
(function () {
  'use strict';

  const root = document.getElementById('shop');
  if (!root) return;

  const data = window.LINEAGE_DATA || {};
  const PAGE_SIZE = 24;

  const { ROOMS, classify, roomLabel } = window.LineageCatalog;
  // Coming Soon / Closeouts: shop.html?list=coming-soon shows only the products in that
  // BigCommerce category (see productLists in js/data.js).
  const LISTS = data.productLists || {};
  // Rooms with their own landing page (roomPages in js/data.js) get that room's look here too:
  // their banner, and titles and cards that animate in.
  const ROOM_PAGES = data.roomPages || {};
  const roomPage = () => (!state.list && state.room && ROOM_PAGES[state.room]) || null;

  const SORTS = {
    featured: 'Featured',
    newest: 'Newest',
    'name-asc': 'Name: A to Z',
    'price-asc': 'Price: Low to High',
    'price-desc': 'Price: High to Low'
  };

  const escapeHtml = (str) =>
    String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const moneyExact = (n, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);

  /* ---------- State <-> URL ---------- */

  let products = [];
  let bounds = { min: 0, max: 5000 };
  let shown = PAGE_SIZE;
  let listSkus = null; // SKUs in the current Coming Soon / Closeouts category (null while loading)

  const state = {
    list: '', room: '', types: [], collections: [], brands: [],
    min: null, max: null, stock: false, photos: false,
    q: '', sort: 'featured', view: '3'
  };

  function readUrl() {
    const p = new URLSearchParams(location.search);
    const list = (k) => (p.get(k) ? p.get(k).split(',').filter(Boolean) : []);
    state.list = LISTS[p.get('list')] ? p.get('list') : '';
    state.room = ROOMS.some((r) => r.slug === p.get('room')) ? p.get('room') : '';
    state.types = list('type');
    state.collections = list('collection');
    state.brands = list('brand');
    state.min = p.has('min') ? Number(p.get('min')) : null;
    state.max = p.has('max') ? Number(p.get('max')) : null;
    state.stock = p.get('stock') === '1';
    state.photos = p.get('photos') === '1';
    state.q = p.get('q') || '';
    state.sort = SORTS[p.get('sort')] ? p.get('sort') : 'featured';
    state.view = ['2', '3', '4'].includes(p.get('view')) ? p.get('view') : state.view;
  }

  function writeUrl(push) {
    const p = new URLSearchParams();
    if (state.list) p.set('list', state.list);
    if (state.room) p.set('room', state.room);
    if (state.types.length) p.set('type', state.types.join(','));
    if (state.collections.length) p.set('collection', state.collections.join(','));
    if (state.brands.length) p.set('brand', state.brands.join(','));
    if (state.min != null) p.set('min', state.min);
    if (state.max != null) p.set('max', state.max);
    if (state.stock) p.set('stock', '1');
    if (state.photos) p.set('photos', '1');
    if (state.q) p.set('q', state.q);
    if (state.sort !== 'featured') p.set('sort', state.sort);
    if (state.view !== '3') p.set('view', state.view);
    const url = `${location.pathname}${p.toString() ? `?${p}` : ''}`;
    if (push) history.pushState(null, '', url);
    else history.replaceState(null, '', url);
  }

  /* ---------- Filtering & facets ---------- */

  // Each check can be skipped, so a filter group's counts reflect every *other* active filter.
  function matches(p, skip) {
    if (state.list && !(listSkus && listSkus.has(p.sku))) return false;
    if (skip !== 'room' && state.room && p.room !== state.room) return false;
    if (skip !== 'types' && state.types.length && !state.types.includes(p.type)) return false;
    if (skip !== 'collections' && state.collections.length && !state.collections.includes(p.collection)) return false;
    if (skip !== 'brands' && state.brands.length && !p.brands.some((b) => state.brands.includes(b))) return false;
    if (skip !== 'price') {
      if (state.min != null && (p.price == null || p.price < state.min)) return false;
      if (state.max != null && (p.price == null || p.price > state.max)) return false;
    }
    if (skip !== 'stock' && state.stock && !p.inStock) return false;
    if (skip !== 'photos' && state.photos && !p.hasImage) return false;
    if (state.q && !state.q.toLowerCase().split(/\s+/).every((t) => p.search.includes(t))) return false;
    return true;
  }

  function facet(key, valuesOf) {
    const counts = new Map();
    products.forEach((p) => {
      if (!matches(p, key)) return;
      valuesOf(p).forEach((v) => { if (v) counts.set(v, (counts.get(v) || 0) + 1); });
    });
    return counts;
  }

  function sorted(list) {
    const byName = (a, b) => a.name.localeCompare(b.name);
    const copy = list.slice();
    switch (state.sort) {
      case 'name-asc': return copy.sort(byName);
      case 'price-asc': return copy.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || byName(a, b));
      case 'price-desc': return copy.sort((a, b) => (b.price ?? -1) - (a.price ?? -1) || byName(a, b));
      case 'newest': return copy.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || byName(a, b));
      default:
        // Featured: pieces with photos first, then in stock, then by collection and name.
        return copy.sort((a, b) =>
          (b.hasImage - a.hasImage) || (b.inStock - a.inStock) ||
          String(a.collection || '~').localeCompare(String(b.collection || '~')) || byName(a, b));
    }
  }

  /* ---------- Elements ---------- */

  const el = {
    bannerImg: document.getElementById('shopBannerImg'),
    title: document.getElementById('shopTitle'),
    subtitle: document.getElementById('shopSubtitle'),
    crumb: document.getElementById('shopCrumb'),
    rooms: document.getElementById('shopRooms'),
    filters: document.getElementById('shopFilters'),
    filterBody: document.getElementById('shopFilterBody'),
    filterToggle: document.getElementById('shopFilterToggle'),
    filterClose: document.getElementById('shopFilterClose'),
    filterApply: document.getElementById('shopFilterApply'),
    count: document.getElementById('shopCount'),
    chips: document.getElementById('shopChips'),
    sort: document.getElementById('shopSort'),
    views: document.getElementById('shopViews'),
    q: document.getElementById('shopQuery'),
    grid: document.getElementById('shopGrid'),
    more: document.getElementById('shopMore'),
    layout: document.getElementById('shopLayout')
  };

  /* ---------- Rendering ---------- */

  function cardHtml(p, i = 0) {
    const eyebrow = [p.brands[0], p.collection].filter(Boolean).join(' · ');
    return `
      <article class="shop-card" style="--ci:${i % PAGE_SIZE}">
        <div class="shop-card-media-wrap">
          <a href="${escapeHtml(p.url)}" class="shop-card-media" tabindex="-1" aria-hidden="true">
            ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy">` : '<span class="shop-card-placeholder">Image coming soon</span>'}
          </a>
          ${state.list ? `<span class="shop-badge shop-badge-${state.list}">${escapeHtml(LISTS[state.list].badge)}</span>`
            : p.inStock ? '' : '<span class="shop-badge">Out of stock</span>'}
          <button type="button" class="shop-card-add" data-sku="${escapeHtml(p.sku)}">Add to cart</button>
          <button type="button" class="wish-toggle" data-wish="${escapeHtml(p.sku)}" aria-pressed="false" aria-label="Save to wishlist"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/></svg></button>
          </div>
        <div class="shop-card-body">
          ${eyebrow ? `<p class="shop-card-eyebrow">${escapeHtml(eyebrow)}</p>` : ''}
          <h3 class="shop-card-name"><a href="${escapeHtml(p.url)}">${escapeHtml(p.name)}</a></h3>
          <p class="shop-card-price">${p.price == null ? 'Price on request' : moneyExact(p.price, p.currency)}</p>
        </div>
      </article>`;
  }

  function checkboxGroup(key, title, counts, selected, opts = {}) {
    let entries = Array.from(counts.entries());
    selected.forEach((v) => { if (!counts.has(v)) entries.push([v, 0]); });
    entries.sort(opts.alpha ? (a, b) => a[0].localeCompare(b[0]) : (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (!entries.length) return '';
    const limit = opts.limit || Infinity;
    const expanded = root.dataset[`expand${key}`] === '1';
    const items = entries.map(([value, n], i) => `
      <li ${i >= limit && !expanded ? 'hidden' : ''}>
        <label class="check">
          <input type="checkbox" data-filter="${key}" value="${escapeHtml(value)}" ${selected.includes(value) ? 'checked' : ''} ${n === 0 && !selected.includes(value) ? 'disabled' : ''}>
          <span class="check-box" aria-hidden="true"></span>
          <span class="check-label">${escapeHtml(value)}</span>
          <span class="check-count">${n}</span>
        </label>
      </li>`).join('');
    const more = entries.length > limit
      ? `<button type="button" class="filter-more" data-expand="${key}">${expanded ? 'Show fewer' : `Show all ${entries.length}`}</button>` : '';
    const finder = opts.finder
      ? `<input type="search" class="filter-find" data-find="${key}" placeholder="Find a ${opts.finder}" aria-label="Find a ${opts.finder}">` : '';
    const open = root.dataset[`closed${key}`] !== '1';
    return `
      <details class="filter-group" data-group="${key}" ${open ? 'open' : ''}>
        <summary>${title}${selected.length ? ` <span class="filter-group-count">${selected.length}</span>` : ''}</summary>
        ${finder}
        <ul class="filter-options">${items}</ul>
        ${more}
      </details>`;
  }

  function priceGroup() {
    const lo = state.min ?? bounds.min;
    const hi = state.max ?? bounds.max;
    const pct = (v) => ((v - bounds.min) / (bounds.max - bounds.min || 1)) * 100;
    const open = root.dataset.closedprice !== '1';
    return `
      <details class="filter-group" data-group="price" ${open ? 'open' : ''}>
        <summary>Price${state.min != null || state.max != null ? ' <span class="filter-group-count">1</span>' : ''}</summary>
        <div class="price-range" style="--lo:${pct(lo)}%;--hi:${pct(hi)}%">
          <div class="price-track"><span class="price-fill"></span></div>
          <input type="range" data-price="min" min="${bounds.min}" max="${bounds.max}" step="10" value="${lo}" aria-label="Minimum price">
          <input type="range" data-price="max" min="${bounds.min}" max="${bounds.max}" step="10" value="${hi}" aria-label="Maximum price">
        </div>
        <div class="price-inputs">
          <label><span>Min</span><input type="number" data-price-input="min" min="${bounds.min}" max="${bounds.max}" step="10" value="${lo}"></label>
          <span class="price-dash" aria-hidden="true">&ndash;</span>
          <label><span>Max</span><input type="number" data-price-input="max" min="${bounds.min}" max="${bounds.max}" step="10" value="${hi}"></label>
        </div>
      </details>`;
  }

  function toggleRow(key, label, checked, count) {
    return `
      <label class="toggle">
        <span>${label} <span class="check-count">${count}</span></span>
        <input type="checkbox" data-toggle="${key}" ${checked ? 'checked' : ''}>
        <span class="toggle-track" aria-hidden="true"></span>
      </label>`;
  }

  function renderFilters() {
    const types = facet('types', (p) => [p.type]);
    const collections = facet('collections', (p) => [p.collection]);
    const brands = facet('brands', (p) => p.brands);
    const stockCount = products.filter((p) => matches(p, 'stock') && p.inStock).length;

    // Keep focus on the control being used while the panel re-renders.
    const active = document.activeElement;
    const focusKey = active && root.contains(active) && active.dataset
      ? JSON.stringify({ f: active.dataset.filter, v: active.value, p: active.dataset.price, pi: active.dataset.priceInput, t: active.dataset.toggle, fd: active.dataset.find })
      : null;
    const findValues = {};
    el.filterBody.querySelectorAll('[data-find]').forEach((i) => { findValues[i.dataset.find] = i.value; });

    el.filterBody.innerHTML = `
      <div class="filter-toggles">
        ${toggleRow('stock', 'In stock only', state.stock, stockCount)}
      </div>
      ${checkboxGroup('types', 'Product type', types, state.types, { limit: 8 })}
      ${checkboxGroup('collections', 'Collection', collections, state.collections, { alpha: true, limit: 8, finder: 'collection' })}
      ${checkboxGroup('brands', 'Brand', brands, state.brands)}
      ${priceGroup()}`;

    Object.entries(findValues).forEach(([key, value]) => {
      const input = el.filterBody.querySelector(`[data-find="${key}"]`);
      if (input && value) { input.value = value; filterFinder(input); }
    });
    if (focusKey) {
      const f = JSON.parse(focusKey);
      const sel = f.f ? `[data-filter="${f.f}"][value="${CSS.escape(f.v)}"]`
        : f.p ? `[data-price="${f.p}"]` : f.pi ? `[data-price-input="${f.pi}"]` : f.t ? `[data-toggle="${f.t}"]` : f.fd ? `[data-find="${f.fd}"]` : null;
      const next = sel && el.filterBody.querySelector(sel);
      if (next) next.focus({ preventScroll: true });
    }
  }

  function renderRooms() {
    const counts = facet('room', (p) => [p.room]);
    const total = products.filter((p) => matches(p, 'room')).length;
    el.rooms.innerHTML = [{ slug: '', label: 'All' }, ...ROOMS].map((r) => {
      const n = r.slug ? counts.get(r.slug) || 0 : total;
      const current = state.room === r.slug;
      return `<button type="button" class="room-tab" data-room="${r.slug}" ${current ? 'aria-current="true"' : ''}>${r.label} <span>${n}</span></button>`;
    }).join('');
  }

  function renderChips() {
    const chips = [];
    if (state.room) chips.push(['room', '', roomLabel(state.room)]);
    state.types.forEach((v) => chips.push(['types', v, v]));
    state.collections.forEach((v) => chips.push(['collections', v, v]));
    state.brands.forEach((v) => chips.push(['brands', v, v]));
    if (state.min != null || state.max != null) chips.push(['price', '', `${money(state.min ?? bounds.min)} – ${money(state.max ?? bounds.max)}`]);
    if (state.stock) chips.push(['stock', '', 'In stock']);
    if (state.photos) chips.push(['photos', '', 'With photos']);
    if (state.q) chips.push(['q', '', `“${state.q}”`]);
    el.chips.innerHTML = chips.map(([key, value, label]) => `
      <button type="button" class="chip" data-chip="${key}" data-value="${escapeHtml(value)}" aria-label="Remove filter ${escapeHtml(label)}">
        ${escapeHtml(label)} <span aria-hidden="true">&times;</span>
      </button>`).join('') + (chips.length > 1 ? '<button type="button" class="chip-clear" data-chip="all">Clear all</button>' : '');
  }

  // A single collection (shop.html?collection=Islamorada) gets its own banner: photo and brand from
  // LINEAGE_DATA.collectionBanners. Collections not listed there keep the main shop photo.
  const DEFAULT_BANNER = el.bannerImg.getAttribute('src');
  const currentCollection = () => (state.collections.length === 1 ? state.collections[0] : '');
  function bannerFor(name) {
    const banners = data.collectionBanners || {};
    const key = Object.keys(banners).find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? banners[key] : {};
  }

  function renderBanner() {
    const collection = currentCollection();
    const pageList = LISTS[state.list];
    const rp = roomPage();
    const src = (pageList && pageList.image) || (collection && bannerFor(collection).image) || (rp && rp.banner) || DEFAULT_BANNER;
    if (el.bannerImg.getAttribute('src') !== src) el.bannerImg.src = src;
    root.classList.toggle('is-room-mode', Boolean(rp));
  }

  // In a room's look the title rises letter by letter whenever it changes.
  function setTitle(text) {
    const animate = Boolean(roomPage());
    if (el.title.dataset.text === text && el.title.dataset.animated === String(animate)) return;
    el.title.dataset.text = text;
    el.title.dataset.animated = String(animate);
    if (!animate) { el.title.removeAttribute('aria-label'); el.title.textContent = text; return; }
    el.title.setAttribute('aria-label', text);
    let i = 0;
    el.title.innerHTML = text.split(' ').map((word) => `<span class="tw" aria-hidden="true">${
      Array.from(word).map((ch) => `<span class="tl" style="--li:${i++}">${escapeHtml(ch)}</span>`).join('')}</span>`).join(' ');
  }

  function renderHeading(count) {
    renderBanner();
    const collection = currentCollection();
    const pageList = LISTS[state.list];
    const rp = roomPage();
    // In a room's look, one piece type becomes the title: Home / Shop / Bedroom / Beds
    const piece = rp && !collection && state.types.length === 1 ? state.types[0] : '';
    const label = pageList ? pageList.title : collection ? `${collection} Collection` : piece || (state.room ? roomLabel(state.room) : 'Shop All');
    setTitle(label);
    el.crumb.innerHTML = pageList || collection || state.room
      ? `<a href="index.html">Home</a><span>/</span><a href="shop.html" data-room-link="">Shop</a><span>/</span>${
        piece ? `<a href="${escapeHtml(rp.page)}">${escapeHtml(roomLabel(state.room))}</a><span>/</span>` : ''}${escapeHtml(label)}`
      : '<a href="index.html">Home</a><span>/</span>Shop';
    if (pageList) {
      el.subtitle.textContent = pageList.intro || '\u00a0';
    } else if (collection) {
      const banner = bannerFor(collection);
      const pieces = products.filter((p) => (p.collection || '').toLowerCase() === collection.toLowerCase()).length;
      el.subtitle.textContent = banner.text || [banner.brand && `By ${banner.brand}`, `${pieces} pieces`].filter(Boolean).join(' · ');
    } else {
      const collections = new Set(products.filter((p) => !state.room || p.room === state.room).map((p) => p.collection).filter(Boolean)).size;
      const roomTotal = products.filter((p) => !state.room || p.room === state.room).length;
      const text = `${roomTotal} pieces${collections ? ` across ${collections} collections` : ''}`;
      if (rp) el.subtitle.innerHTML = `${escapeHtml(text)} <a href="${escapeHtml(rp.page)}" class="banner-link">Explore the ${escapeHtml(roomLabel(state.room).toLowerCase())} &rarr;</a>`;
      else el.subtitle.textContent = text;
    }
    document.title = `${label} | Lineage Collections`;
    el.count.innerHTML = count == null ? '' : `<strong>${count}</strong> ${count === 1 ? 'product' : 'products'}`;

    document.querySelectorAll('.main-nav > ul > li > a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const isCurrent = state.list ? href.endsWith(`list=${state.list}`) : state.room ? href.endsWith(`room=${state.room}`) : href === 'shop.html';
      if (isCurrent) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function renderGrid(list) {
    // Coming Soon / Closeouts with nothing in the category yet: a friendly note, not "no matches".
    const pageList = LISTS[state.list];
    if (!list.length && pageList && listSkus && !listSkus.size) {
      el.grid.innerHTML = `
        <div class="shop-empty">
          <p class="display">${escapeHtml(pageList.title)}</p>
          <p>${escapeHtml(pageList.empty)}</p>
          <a href="shop.html" class="btn btn-dark">Shop all pieces</a>
        </div>`;
      el.more.innerHTML = '';
      return;
    }
    if (!list.length) {
      el.grid.innerHTML = `
        <div class="shop-empty">
          <p class="display">No pieces match those filters.</p>
          <p>Try removing a filter, or <a href="contact.html">contact us</a> and we'll help you find it.</p>
          <button type="button" class="btn btn-dark" data-chip="all">Clear all filters</button>
        </div>`;
      el.more.innerHTML = '';
      return;
    }
    const visible = list.slice(0, shown);
    el.grid.innerHTML = visible.map(cardHtml).join('');
    const pct = Math.round((visible.length / list.length) * 100);
    el.more.innerHTML = `
      <p class="shop-progress-text">Showing ${visible.length} of ${list.length}</p>
      <div class="shop-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
      ${visible.length < list.length ? `<button type="button" class="btn btn-light btn-outline" data-more>Load ${Math.min(PAGE_SIZE, list.length - visible.length)} more</button>` : ''}`;
  }

  let currentList = [];

  function render() {
    // Still finding out which products are in Coming Soon / Closeouts: keep the loading cards.
    if (state.list && !listSkus) { renderHeading(null); return; }
    currentList = sorted(products.filter((p) => matches(p)));
    renderHeading(currentList.length);
    renderRooms();
    renderFilters();
    renderChips();
    renderGrid(currentList);
    el.sort.value = state.sort;
    el.q.value = state.q;
    el.layout.dataset.view = state.view;
    el.views.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
    el.filterApply.textContent = `Show ${currentList.length} ${currentList.length === 1 ? 'product' : 'products'}`;
  }

  // Apply a change: reset paging, update the URL, re-render.
  function update(push = true) {
    shown = PAGE_SIZE;
    writeUrl(push);
    render();
  }

  /* ---------- Events ---------- */

  function toggleIn(list, value) {
    const i = list.indexOf(value);
    if (i === -1) list.push(value); else list.splice(i, 1);
  }

  function filterFinder(input) {
    const term = input.value.trim().toLowerCase();
    const group = input.closest('.filter-group');
    group.querySelectorAll('.filter-options li').forEach((li, i) => {
      const label = li.querySelector('.check-label').textContent.toLowerCase();
      li.hidden = term ? !label.includes(term) : i >= 8 && root.dataset[`expand${group.dataset.group}`] !== '1';
    });
    const more = group.querySelector('.filter-more');
    if (more) more.hidden = Boolean(term);
  }

  el.filterBody.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.filter) { toggleIn(state[t.dataset.filter], t.value); update(); }
    if (t.dataset.toggle) { state[t.dataset.toggle] = t.checked; update(); }
    if (t.dataset.priceInput) {
      const v = Math.max(bounds.min, Math.min(bounds.max, Number(t.value) || 0));
      setPrice(t.dataset.priceInput, v);
      update();
    }
  });

  function setPrice(which, v) {
    if (which === 'min') state.min = Math.min(v, state.max ?? bounds.max);
    else state.max = Math.max(v, state.min ?? bounds.min);
    if (state.min === bounds.min) state.min = null;
    if (state.max === bounds.max) state.max = null;
  }

  // Dragging the slider updates the track live; results apply when the handle is released.
  el.filterBody.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.find) { filterFinder(t); return; }
    if (!t.dataset.price) return;
    const wrap = t.closest('.price-range');
    const minInput = wrap.querySelector('[data-price="min"]');
    const maxInput = wrap.querySelector('[data-price="max"]');
    let lo = Number(minInput.value);
    let hi = Number(maxInput.value);
    if (lo > hi) { if (t === minInput) lo = hi; else hi = lo; minInput.value = lo; maxInput.value = hi; }
    const pct = (v) => ((v - bounds.min) / (bounds.max - bounds.min || 1)) * 100;
    wrap.style.setProperty('--lo', `${pct(lo)}%`);
    wrap.style.setProperty('--hi', `${pct(hi)}%`);
    el.filterBody.querySelector('[data-price-input="min"]').value = lo;
    el.filterBody.querySelector('[data-price-input="max"]').value = hi;
  });
  el.filterBody.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.dataset.price) return;
    setPrice(t.dataset.price, Number(t.value));
    update();
  });

  el.filterBody.addEventListener('click', (e) => {
    const more = e.target.closest('[data-expand]');
    if (more) {
      const key = `expand${more.dataset.expand}`;
      root.dataset[key] = root.dataset[key] === '1' ? '0' : '1';
      renderFilters();
    }
  });

  // Remember which filter groups are collapsed across re-renders.
  el.filterBody.addEventListener('toggle', (e) => {
    const g = e.target.closest('.filter-group');
    if (g) root.dataset[`closed${g.dataset.group}`] = g.open ? '0' : '1';
  }, true);

  el.rooms.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-room]');
    if (!tab) return;
    state.room = tab.dataset.room;
    // Types belong to rooms, so clear type picks that don't exist in the new room.
    state.types = state.types.filter((t) => products.some((p) => p.type === t && (!state.room || p.room === state.room)));
    update();
  });

  function clearChip(key, value) {
    if (key === 'all') {
      Object.assign(state, { room: '', types: [], collections: [], brands: [], min: null, max: null, stock: false, photos: false, q: '' });
    } else if (key === 'room') state.room = '';
    else if (key === 'price') { state.min = null; state.max = null; }
    else if (key === 'stock' || key === 'photos') state[key] = false;
    else if (key === 'q') state.q = '';
    else toggleIn(state[key], value);
    update();
  }

  root.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip]');
    if (chip) { clearChip(chip.dataset.chip, chip.dataset.value); return; }

    const crumbShop = e.target.closest('[data-room-link]');
    if (crumbShop) { e.preventDefault(); state.list = ''; state.room = ''; state.collections = []; update(); return; }

    if (e.target.closest('[data-more]')) {
      shown += PAGE_SIZE;
      renderGrid(currentList);
      return;
    }

    const add = e.target.closest('.shop-card-add');
    if (add && window.LineageCart) {
      const product = products.find((p) => p.sku === add.dataset.sku);
      if (!product) return;
      window.LineageCart.add(product);
      window.LineageCart.open();
      add.textContent = 'Added';
      add.classList.add('is-added');
      setTimeout(() => { add.textContent = 'Add to cart'; add.classList.remove('is-added'); }, 1600);
    }
  });

  el.sort.addEventListener('change', () => { state.sort = el.sort.value; update(); });

  el.views.addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    state.view = b.dataset.view;
    writeUrl(false);
    el.layout.dataset.view = state.view;
    el.views.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  });

  let qTimer = null;
  el.q.addEventListener('input', () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.q = el.q.value.trim(); update(false); }, 200);
  });

  // Filters: collapsible sidebar on desktop, slide-in drawer on smaller screens.
  const mobile = window.matchMedia('(max-width: 1100px)');
  function setFiltersOpen(open) {
    if (mobile.matches) {
      el.filters.classList.toggle('is-open', open);
      document.body.classList.toggle('no-scroll', open);
      if (open) el.filterClose.focus();
    } else {
      el.layout.classList.toggle('filters-hidden', !open);
    }
    el.filterToggle.setAttribute('aria-expanded', String(open));
  }
  el.filterToggle.addEventListener('click', () => {
    const open = mobile.matches ? !el.filters.classList.contains('is-open') : el.layout.classList.contains('filters-hidden');
    setFiltersOpen(open);
  });
  el.filterClose.addEventListener('click', () => setFiltersOpen(false));
  el.filterApply.addEventListener('click', () => {
    setFiltersOpen(false);
    el.layout.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  el.filters.addEventListener('click', (e) => { if (e.target === el.filters) setFiltersOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && el.filters.classList.contains('is-open')) setFiltersOpen(false); });
  mobile.addEventListener('change', () => {
    el.filters.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    el.filterToggle.setAttribute('aria-expanded', String(!mobile.matches && !el.layout.classList.contains('filters-hidden')));
  });

  window.addEventListener('popstate', () => { readUrl(); shown = PAGE_SIZE; loadList(); render(); });

  /* ---------- Load ---------- */

  el.grid.innerHTML = '<article class="shop-card is-loading"><div class="shop-card-media-wrap"><div class="shop-card-media"></div></div><div class="shop-card-body"><p class="shop-card-name">&nbsp;</p></div></article>'.repeat(9);

  // Coming Soon / Closeouts: fetch which products are in that BigCommerce category.
  let listFor = '';
  let listItems = [];
  async function loadList() {
    if (!state.list || listFor === state.list) return;
    listFor = state.list;
    listSkus = null;
    let items = [];
    try {
      if (window.LineageBC && window.LineageBC.enabled) items = await window.LineageBC.categoryProducts(LISTS[state.list].category);
    } catch (err) {
      console.warn('Shop: could not load the product list.', err);
    }
    if (listFor !== state.list) return; // the visitor moved on while it loaded
    listItems = items;
    listSkus = new Set(items.map((p) => p.sku));
    if (lastRaw) apply(lastRaw, false);
  }

  async function load() {
    readUrl();
    renderBanner(); // show the collection's photo straight away, not after the products load
    loadList();
    let raw;
    try {
      if (!window.LineageBC || !window.LineageBC.enabled) throw new Error('BigCommerce not configured');
      raw = await window.LineageBC.allProducts({
        // First visit: show the first batches while the rest of the catalog comes in.
        onProgress: (partial) => apply(partial, true),
        // Remembered catalog was shown; BigCommerce had changes, so refresh quietly.
        onUpdate: (fresh) => apply(fresh, false)
      });
    } catch (err) {
      console.warn('Shop: BigCommerce unavailable, showing saved products.', err);
      raw = (data.newIntros || []).map((p) => ({ ...p, brand: p.brand || null, inStock: true }));
      root.classList.add('is-offline');
    }
    apply(raw, false);
  }

  let lastRaw = null;
  function apply(raw, partial) {
    lastRaw = raw;
    // A product just added to a list may be newer than the remembered catalog: include it anyway.
    const extra = listItems.filter((item) => !raw.some((p) => p.sku === item.sku));
    products = raw.concat(extra).filter((p) => p && p.name).map(classify);
    const prices = products.map((p) => p.price).filter((n) => n != null);
    if (prices.length) {
      bounds = { min: Math.floor(Math.min(...prices) / 10) * 10, max: Math.ceil(Math.max(...prices) / 100) * 100 };
    }
    root.classList.toggle('is-partial', partial);
    render();
  }

  load();
})();
