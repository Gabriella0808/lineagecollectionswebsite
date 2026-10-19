(function () {
  'use strict';

  const data = window.LINEAGE_DATA || { collections: [], newIntros: [], social: [] };

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const formatPrice = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount) || 0);

  /* ---------- Header: clear at the top of the page (white on hover), solid once scrolled ---------- */
  const header = document.getElementById('siteHeader');
  const hero = document.querySelector('.hero, .page-banner');

  function updateHeader() {
    if (!header) return;
    // Pages with a hero / banner stay clear until it scrolls away; plain pages until the first scroll.
    const threshold = hero ? hero.offsetHeight - header.offsetHeight : 0;
    header.classList.toggle('is-transparent', window.scrollY < Math.max(threshold, 1));
  }
  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('resize', updateHeader);
  updateHeader();

  /* ---------- Mobile navigation ---------- */
  const menuToggle = document.getElementById('menuToggle');
  const menuClose = document.getElementById('menuClose');
  const mobileNav = document.getElementById('mobileNav');

  function setMenu(open) {
    mobileNav.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('no-scroll', open);
    if (open) menuClose.focus();
    else menuToggle.focus();
  }
  menuToggle.addEventListener('click', () => setMenu(true));
  menuClose.addEventListener('click', () => setMenu(false));
  mobileNav.addEventListener('click', (e) => { if (e.target === mobileNav) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !mobileNav.hidden) setMenu(false); });

  /* ---------- Mega menus: Escape closes the open one (they open on hover / keyboard focus in CSS) ---------- */
  document.querySelectorAll('.has-mega').forEach((item) => {
    const reopen = () => item.classList.remove('is-closed');
    item.addEventListener('mouseleave', reopen);
    item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) reopen(); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const item = document.activeElement && document.activeElement.closest('.has-mega');
    if (!item) return;
    item.classList.add('is-closed');
    item.querySelector(':scope > a').focus();
  });

  /* ---------- Coming Soon / Closeouts menus: a few live products from their BigCommerce category ---------- */
  // Loaded the first time the visitor opens the menu, so other pages don't pay for it.
  document.querySelectorAll('[data-product-list]').forEach((menu) => {
    const list = (data.productLists || {})[menu.dataset.productList];
    const box = menu.querySelector('[data-list-products]');
    const item = menu.closest('.has-mega');
    if (!list || !box || !item) return;

    let started = false;
    async function fill() {
      if (started) return;
      started = true;
      let items = [];
      try {
        if (window.LineageBC && window.LineageBC.enabled) items = await window.LineageBC.categoryProducts(list.category, 4);
      } catch (err) {
        console.warn(`Menu: could not load ${list.title}.`, err);
      }
      box.innerHTML = items.length
        ? items.map((p) => `
          <a href="${escapeHtml(p.url)}" class="mega-product">
            <span class="mega-product-media">${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy">` : ''}</span>
            <span class="mega-product-name">${escapeHtml(p.name)}</span>
            ${p.price == null ? '' : `<span class="mega-product-price">${formatPrice(p.price, p.currency)}</span>`}
          </a>`).join('')
        : `<p class="mega-products-empty">${escapeHtml(list.empty)}</p>`;
    }
    item.addEventListener('mouseenter', fill);
    item.addEventListener('focusin', fill);
  });

  /* ---------- Dealer portal: show / hide the site header ---------- */
  const portalToggle = document.getElementById('portalHeaderToggle');
  if (portalToggle) {
    const toggleLabel = portalToggle.querySelector('span');
    portalToggle.addEventListener('click', () => {
      const open = document.body.classList.toggle('header-open');
      portalToggle.setAttribute('aria-expanded', String(open));
      toggleLabel.textContent = open ? 'Hide menu' : 'Show menu';
    });
  }

  /* ---------- Warm the shop catalog in the background ---------- */
  // Once the page is idle, fetch the BigCommerce catalog so the shop opens instantly.
  if (window.LineageBC && window.LineageBC.enabled && !document.getElementById('shop')) {
    const warm = () => window.LineageBC.prefetchCatalog();
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 4000 });
    else setTimeout(warm, 2000);
  }

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Everything below only runs on the homepage
  if (!document.getElementById('carouselTrack')) return;

  /* ---------- Collections carousel ---------- */
  const track = document.getElementById('carouselTrack');
  const dotsEl = document.getElementById('carouselDots');
  let current = 0;

  track.innerHTML = data.collections.map((c, i) => `
    <article class="slide" aria-roledescription="slide" aria-label="${i + 1} of ${data.collections.length}">
      <img src="${c.image}" alt="${escapeHtml(c.alt)}" ${i > 1 ? 'loading="lazy"' : ''}>
      <a href="${c.url}" class="slide-caption">
        <h2 class="display">${escapeHtml(c.name)}</h2>
        <p>/ By ${escapeHtml(c.brand)}</p>
      </a>
      ${c.hotspots.map((h) => `
        <div class="hotspot" style="left:${h.x}%;top:${h.y}%">
          <button class="hotspot-btn" aria-label="Show ${escapeHtml(h.label)}"></button>
          <a href="${h.url}" class="hotspot-card">${escapeHtml(h.label)} <span aria-hidden="true">&rarr;</span></a>
        </div>`).join('')}
    </article>`).join('');

  dotsEl.innerHTML = data.collections.map((c, i) =>
    `<button role="tab" aria-label="${escapeHtml(c.name)}" data-index="${i}"></button>`).join('');

  const slides = Array.from(track.children);
  const dots = Array.from(dotsEl.children);

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    const offset = slides[current].offsetLeft - slides[0].offsetLeft;
    track.style.transform = `translateX(${-offset}px)`;
    slides.forEach((s, i) => {
      s.classList.toggle('is-active', i === current);
      s.setAttribute('aria-hidden', String(i !== current));
      s.querySelectorAll('a, button').forEach((el) => { el.tabIndex = i === current ? 0 : -1; });
    });
    dots.forEach((d, i) => d.setAttribute('aria-selected', String(i === current)));
  }

  document.getElementById('carouselPrev').addEventListener('click', () => goTo(current - 1));
  document.getElementById('carouselNext').addEventListener('click', () => goTo(current + 1));
  dots.forEach((d) => d.addEventListener('click', () => goTo(Number(d.dataset.index))));
  window.addEventListener('resize', () => goTo(current));

  // Clicking a peeking (inactive) slide brings it into view instead of following its link.
  slides.forEach((s, i) => s.addEventListener('click', (e) => {
    if (i !== current) { e.preventDefault(); goTo(i); }
  }));

  // Touch swipe
  let touchStartX = null;
  track.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
    touchStartX = null;
  });

  // Hotspots: tap toggles the card on touch devices; hover/focus handles desktop via CSS.
  track.addEventListener('click', (e) => {
    const btn = e.target.closest('.hotspot-btn');
    if (!btn) return;
    const spot = btn.parentElement;
    const wasOpen = spot.classList.contains('is-open');
    track.querySelectorAll('.hotspot.is-open').forEach((h) => h.classList.remove('is-open'));
    if (!wasOpen) spot.classList.add('is-open');
  });

  goTo(0);

  /* ---------- New Intros (live from BigCommerce, saved list as fallback) ---------- */
  const grid = document.getElementById('newIntros');
  let introProducts = [];

  function renderIntros(products) {
    introProducts = products;
    grid.innerHTML = products.map((p) => `
    <article class="product-card">
      <button type="button" class="wish-toggle" data-wish="${escapeHtml(p.sku)}" aria-pressed="false" aria-label="Save to wishlist"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/></svg></button>
      <a href="${escapeHtml(p.url)}" class="product-media">
        ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">` : ''}
      </a>
      <h3 class="product-name"><a href="${escapeHtml(p.url)}">${escapeHtml(p.name)}</a></h3>
      <div class="product-meta">
        <span class="product-price">${p.price == null ? '' : formatPrice(p.price, p.currency)}</span>
        <button class="btn-add" data-sku="${escapeHtml(p.sku)}">Add</button>
      </div>
    </article>`).join('');
  }

  async function loadIntros() {
    const bc = window.LineageBC;
    if (!bc || !bc.enabled) { renderIntros(data.newIntros); return; }

    // Placeholder cards while BigCommerce responds, so the saved list doesn't flash first.
    grid.innerHTML = '<article class="product-card is-loading"><div class="product-media"></div></article>'.repeat(4);
    try {
      let skus = data.newIntroSkus || [];
      if (data.newIntrosUrl) {
        const res = await fetch(data.newIntrosUrl);
        if (!res.ok) throw new Error(`New intros ${res.status}`);
        const json = await res.json();
        skus = Array.isArray(json) ? json : json.skus || [];
      }
      const products = await bc.productsBySku(skus);
      renderIntros(products.length ? products : data.newIntros);
    } catch (err) {
      console.warn('New Intros: using saved products.', err);
      renderIntros(data.newIntros);
    }
  }
  loadIntros();

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-add');
    if (!btn) return;
    const product = introProducts.find((p) => p.sku === btn.dataset.sku);
    if (!product || !window.LineageCart) return;
    window.LineageCart.add(product);
    window.LineageCart.open();
    btn.textContent = 'Added';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = 'Add'; btn.disabled = false; }, 1400);
  });

  /* ---------- Social grid ---------- */
  const INSTAGRAM_PROFILE = 'https://www.instagram.com/lineage_collections';
  const socialGrid = document.getElementById('socialGrid');
  const postCount = data.instagramPostCount || 6;

  function renderSocial(posts) {
    socialGrid.innerHTML = posts.slice(0, postCount).map((p) => `
      <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener" class="social-tile">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.alt)}" loading="lazy">
      </a>`).join('');
  }

  // Accepts our Worker's { posts: [{ image, url, caption }] }, Behold's { posts: [{ mediaUrl, sizes, permalink }] },
  // or the raw Instagram API { data: [{ media_url, permalink }] }.
  function normalizeFeed(json) {
    const items = Array.isArray(json) ? json : json.posts || json.data || [];
    return items.map((p) => {
      const isVideo = (p.media_type || p.mediaType) === 'VIDEO';
      const image = p.image
        || (p.sizes && p.sizes.medium && p.sizes.medium.mediaUrl)
        || (isVideo ? p.thumbnail_url || p.thumbnailUrl : p.media_url || p.mediaUrl);
      const caption = (p.caption || '').trim();
      return {
        image,
        url: p.url || p.permalink || INSTAGRAM_PROFILE,
        alt: caption ? caption.slice(0, 120) : 'Instagram post from @lineage_collections'
      };
    }).filter((p) => p.image);
  }

  // Saved photos render immediately; live posts replace them once the feed responds.
  renderSocial(data.social.map((s) => ({ ...s, url: INSTAGRAM_PROFILE })));

  if (data.instagramFeedUrl) {
    fetch(data.instagramFeedUrl)
      .then((res) => { if (!res.ok) throw new Error(`Feed ${res.status}`); return res.json(); })
      .then((json) => {
        const posts = normalizeFeed(json);
        if (posts.length) renderSocial(posts);
      })
      .catch(() => { /* feed unavailable: keep the saved photos */ });
  }

  /* ---------- Newsletter ---------- */
  const form = document.getElementById('newsletterForm');
  const status = document.getElementById('newsletterStatus');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = 'Please enter a valid email address.';
      return;
    }
    // TODO: post to the email platform (Klaviyo / Shopify customer / BigCommerce subscriber API).
    status.textContent = 'Thank you. You’re on the list.';
    form.reset();
  });
})();
