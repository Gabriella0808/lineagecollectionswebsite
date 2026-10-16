/*
 * Lineage Collections — Product page (product.html?sku=…)
 *
 * Loads one product live from BigCommerce. Sections whose data BigCommerce doesn't have yet
 * (description, dimensions, extra photos, specifications, warranty) stay hidden and appear
 * automatically once they're filled in there.
 */
(function () {
  'use strict';

  const root = document.getElementById('product');
  if (!root) return;

  const data = window.LINEAGE_DATA || {};
  const catalog = window.LineageCatalog;
  const sku = new URLSearchParams(location.search).get('sku') || '';
  const RECENT_KEY = 'lineage_recent_v1';

  const escapeHtml = (str) =>
    String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
  const shopLink = (params) => `shop.html?${new URLSearchParams(params)}`;

  const el = {
    crumb: document.getElementById('productCrumb'),
    layout: document.getElementById('productLayout'),
    collection: document.getElementById('productCollection'),
    related: document.getElementById('productRelated'),
    recent: document.getElementById('productRecent'),
    bar: document.getElementById('productBar')
  };

  let product = null;

  /* ---------- Helpers ---------- */

  // BigCommerce descriptions are written by staff, but strip anything that could run code.
  function safeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, iframe, object, embed, form').forEach((n) => n.remove());
    doc.querySelectorAll('*').forEach((n) => {
      Array.from(n.attributes).forEach((a) => {
        if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name);
      });
    });
    return doc.body.innerHTML;
  }

  function cardHtml(p) {
    const eyebrow = [p.brands ? p.brands[0] : p.brand, p.collection].filter(Boolean).join(' · ');
    return `
      <article class="shop-card">
        <div class="shop-card-media-wrap">
          <a href="${escapeHtml(p.url)}" class="shop-card-media" tabindex="-1" aria-hidden="true">
            ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy">` : '<span class="shop-card-placeholder">Image coming soon</span>'}
          </a>
          ${p.inStock === false ? '<span class="shop-badge">Out of stock</span>' : ''}
          <button type="button" class="shop-card-add" data-sku="${escapeHtml(p.sku)}">Add to cart</button>
          <button type="button" class="wish-toggle" data-wish="${escapeHtml(p.sku)}" aria-pressed="false" aria-label="Save to wishlist"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/></svg></button>
          </div>
        <div class="shop-card-body">
          ${eyebrow ? `<p class="shop-card-eyebrow">${escapeHtml(eyebrow)}</p>` : ''}
          <h3 class="shop-card-name"><a href="${escapeHtml(p.url)}">${escapeHtml(p.name)}</a></h3>
          <p class="shop-card-price">${p.price == null ? 'Price on request' : money(p.price, p.currency)}</p>
        </div>
      </article>`;
  }

  const rowProducts = new Map();
  function renderRow(section, title, list, link) {
    if (!list.length) { section.hidden = true; return; }
    list.forEach((p) => rowProducts.set(p.sku, p));
    section.innerHTML = `
      <div class="section-head">
        <h2 class="display">${escapeHtml(title)}</h2>
        ${link ? `<a href="${escapeHtml(link.href)}" class="link-underline">${escapeHtml(link.label)}</a>` : ''}
      </div>
      <div class="product-row">${list.map(cardHtml).join('')}</div>`;
    section.hidden = false;
  }

  /* ---------- Main product ---------- */

  function stockHtml(p) {
    return p.inStock
      ? '<p class="stock stock-in"><span aria-hidden="true"></span>In stock</p>'
      : '<p class="stock stock-out"><span aria-hidden="true"></span>Out of stock &middot; available to quote</p>';
  }

  function priceHtml(p) {
    if (p.price == null) return '<p class="product-detail-price">Price on request</p>';
    const was = p.retailPrice && p.retailPrice > p.price ? `<s>${money(p.retailPrice, p.currency)}</s>` : '';
    return `<p class="product-detail-price">${money(p.price, p.currency)} ${was}<span class="product-detail-price-note">MSRP</span></p>`;
  }

  function accordion(title, body, open) {
    return `<details class="product-acc" ${open ? 'open' : ''}><summary>${title}</summary><div class="product-acc-body">${body}</div></details>`;
  }

  function galleryHtml(p) {
  const images = p.images || (p.image ? [{ url: p.image, thumb: p.image, alt: '' }] : []);
  if (!images.length) {
    return `
      <div class="product-gallery">
        <div class="product-main product-main-empty"><span>Image coming soon</span></div>
      </div>`;
  }
  const n = images.length;
  const thumbs = n > 1 ? `
    <div class="product-thumbs" role="tablist" aria-label="Product photos">
      ${images.map((img, i) => `
        <button type="button" class="product-thumb" data-index="${i}" role="tab" aria-selected="${i === 0}" aria-label="Photo ${i + 1}">
          <img src="${escapeHtml(img.thumb || img.url)}" alt="">
        </button>`).join('')}
    </div>` : '';
  const arrow = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  // crossorigin lets the gallery check each photo's corners (cut-out on white vs room photo);
  // BigCommerce's image server allows it.
  return `
    <div class="product-gallery ${n > 1 ? 'has-thumbs' : ''}">
      ${thumbs}
      <div class="product-stage">
        <div class="product-track" id="productTrack" tabindex="0" aria-label="Product photos. Use the arrow keys to browse, Enter to enlarge.">
          ${images.map((img, i) => `
            <button type="button" class="product-main" data-zoom data-index="${i}" tabindex="-1" aria-label="View photo ${i + 1} of ${n} larger">
              <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt || p.name)}" crossorigin="anonymous" ${i ? 'loading="lazy"' : ''}>
              <span class="product-main-hint" aria-hidden="true">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/></svg>
              </span>
            </button>`).join('')}
        </div>
        ${n > 1 ? `
          <button type="button" class="product-nav prev" data-step="-1" aria-label="Previous photo">${arrow('m15 6-6 6 6 6')}</button>
          <button type="button" class="product-nav next" data-step="1" aria-label="Next photo">${arrow('m9 6 6 6-6 6')}</button>
          <p class="product-count" id="productCount" aria-live="polite">1 / ${n}</p>` : ''}
      </div>
    </div>`;
  }


  function renderProduct(p) {
    const roomLabel = p.room ? catalog.roomLabel(p.room) : null;
    el.crumb.innerHTML = [
      '<a href="index.html">Home</a>',
      '<a href="shop.html">Shop</a>',
      roomLabel ? `<a href="${shopLink({ room: p.room })}">${escapeHtml(roomLabel)}</a>` : '',
      p.collection ? `<a href="${shopLink({ collection: p.collection })}">${escapeHtml(p.collection)}</a>` : ''
    ].filter(Boolean).join('<span aria-hidden="true">/</span>');

    const eyebrow = [
      p.brands.length ? `<a href="${shopLink({ brand: p.brands[0] })}">${escapeHtml(p.brands.join(' & '))}</a>` : '',
      p.collection ? `<a href="${shopLink({ collection: p.collection })}">${escapeHtml(p.collection)} Collection</a>` : ''
    ].filter(Boolean).join('<span aria-hidden="true">&middot;</span>');

    const details = [
      ['SKU', p.sku],
      ['Brand', p.brands.join(', ')],
      ['Collection', p.collection],
      ['Type', p.type !== 'Other' ? p.type : null],
      ['Room', roomLabel],
      ...(p.specs || [])
    ].filter(([, v]) => v);

    const sections = [];
    if (p.description || p.summary) sections.push(accordion('Description', p.description ? safeHtml(p.description) : `<p>${escapeHtml(p.summary)}</p>`, true));
    if (p.dimensions && p.dimensions.length) {
      sections.push(accordion('Dimensions', `<dl class="spec-list">${p.dimensions.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}</dl>`, !sections.length));
    }
    sections.push(accordion('Details', `<dl class="spec-list">${details.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join('')}</dl>`, !sections.length));
    if (p.warranty) sections.push(accordion('Warranty', safeHtml(p.warranty)));
    sections.push(accordion('Ordering & Delivery', `
      <p>Lineage Collections is sold through authorized dealers. Add this piece to your cart and request a quote; our team confirms dealer pricing and availability before anything is ordered.</p>
      <p><a href="/delivery-returns">Delivery &amp; returns</a> &middot; <a href="contact.html?topic=Product%20question">Ask a question about this piece</a></p>`));

    el.layout.innerHTML = `
      ${galleryHtml(p)}
      <div class="product-info">
        ${eyebrow ? `<p class="product-eyebrow">${eyebrow}</p>` : ''}
        <h1 class="display product-title">${escapeHtml(p.name)}</h1>
        <p class="product-sku">SKU ${escapeHtml(p.sku)}</p>
        ${priceHtml(p)}
        ${stockHtml(p)}

        <div class="product-buy" id="productBuy">
          <div class="qty qty-lg" role="group" aria-label="Quantity">
            <button type="button" data-qty="-1" aria-label="Decrease quantity">&minus;</button>
            <input type="number" id="productQty" min="1" max="999" value="1" inputmode="numeric" aria-label="Quantity">
            <button type="button" data-qty="1" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="btn btn-dark product-add" data-add>Add to cart</button>
          <button type="button" class="wish-toggle wish-toggle-lg" data-wish="${escapeHtml(p.sku)}" aria-pressed="false" aria-label="Save to wishlist"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/></svg></button>
        </div>
        <button type="button" class="product-quote" data-quote>Request a quote for this piece <span aria-hidden="true">&rarr;</span></button>

        <ul class="product-assurances">
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg>Sold through authorized dealers</li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12V7l-8-4-8 4v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9z"/><path d="m9 12 2 2 4-4"/></svg>Dealer pricing confirmed on your quote</li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/></svg><span>Questions? <a href="contact.html?topic=Product%20question">Contact our team</a></span></li>
        </ul>

        <div class="product-accs">${sections.join('')}</div>

        <button type="button" class="product-share" data-share>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>
          <span>Share this piece</span>
        </button>
      </div>`;

    // Sticky bar for when the main Add button scrolls out of view.
    el.bar.innerHTML = `
      <div class="container product-bar-inner">
        ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" class="product-bar-img">` : ''}
        <div class="product-bar-text">
          <p class="product-bar-name">${escapeHtml(p.name)}</p>
          <p class="product-bar-price">${p.price == null ? 'Price on request' : money(p.price, p.currency)}</p>
        </div>
        <button type="button" class="btn btn-dark" data-add>Add to cart</button>
      </div>`;
    const buy = document.getElementById('productBuy');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        el.bar.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
      }).observe(buy);
    }

    document.title = `${p.name} | Lineage Collections`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', p.summary || `${p.name} from the ${p.collection || 'Lineage'} collection by ${p.brands.join(' & ') || 'Lineage Collections'}.`);
    addStructuredData(p);
  }

  // Product details for search engines (schema.org)
  function addStructuredData(p) {
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      sku: p.sku,
      image: (p.images || []).map((i) => i.url),
      brand: p.brands.length ? { '@type': 'Brand', name: p.brands[0] } : undefined,
      description: p.summary || undefined,
      offers: p.price == null ? undefined : {
        '@type': 'Offer',
        priceCurrency: p.currency,
        price: p.price,
        availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: location.href
      }
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  }

  /* ---------- Gallery: thumbnails, hover zoom, full-screen view ---------- */

    let activeImage = 0;
  const track = () => document.getElementById('productTrack');

  // Go to photo i (wrapping round at either end); the scroll listener keeps thumbs + counter in step.
  function showImage(i) {
    const t = track();
    const n = (product.images || []).length;
    if (!t || !n) return;
    i = (i + n) % n;
    t.scrollTo({ left: t.clientWidth * i, behavior: 'smooth' });
    setActive(i);
  }

  function setActive(i) {
    activeImage = i;
    const n = (product.images || []).length;
    root.querySelectorAll('.product-thumb').forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
    const count = document.getElementById('productCount');
    if (count) count.textContent = `${i + 1} / ${n}`;
    // Keep the current thumbnail in view inside its own scrolling column (never scrolls the page).
    const thumb = root.querySelector(`.product-thumb[data-index="${i}"]`);
    if (thumb) {
      const box = thumb.parentElement;
      box.scrollTo({
        top: thumb.offsetTop - (box.clientHeight - thumb.offsetHeight) / 2,
        left: thumb.offsetLeft - (box.clientWidth - thumb.offsetWidth) / 2,
        behavior: 'smooth'
      });
    }
  }

  // Cut-outs (product on white) keep the padded, blended look; room photos fill the frame.
  // Tell them apart by checking whether all four corners of the photo are near-white.
  function isCutout(img) {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 10;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 10, 10);
      return [[0, 0], [9, 0], [0, 9], [9, 9]].every(([x, y]) => {
        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
        return r > 232 && g > 232 && b > 232;
      });
    } catch (e) {
      return true; // can't read the pixels: keep the cut-out look
    }
  }

  function markPhoto(img) {
    const slide = img.closest('.product-main');
    const photo = !isCutout(img);
    slide.classList.toggle('is-photo', photo);
    const thumb = root.querySelector(`.product-thumb[data-index="${slide.dataset.index}"]`);
    if (thumb) thumb.classList.toggle('is-photo', photo);
  }

  // Called once the product has been drawn.
  function initGallery() {
    const t = track();
    if (!t) return;
    activeImage = 0;

    // Swiping / trackpad scrolling: work out which photo is showing.
    let frame = 0;
    t.addEventListener('scroll', () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const i = Math.round(t.scrollLeft / t.clientWidth);
        if (i !== activeImage) setActive(i);
      });
    }, { passive: true });

    // Keyboard: arrows browse, Enter opens the full-screen view.
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); showImage(activeImage + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); showImage(activeImage - 1); }
      if (e.key === 'Enter') { e.preventDefault(); openLightbox(); }
    });

    // Keep the same photo in view if the window is resized.
    window.addEventListener('resize', () => { t.scrollLeft = t.clientWidth * activeImage; });

    t.querySelectorAll('img').forEach((img) => {
      if (img.complete && img.naturalWidth) markPhoto(img);
      else img.addEventListener('load', () => markPhoto(img), { once: true });
    });
  }


  root.addEventListener('mousemove', (e) => {
    const main = e.target.closest('.product-main[data-zoom]');
    if (!main || window.matchMedia('(hover: none)').matches) return;
    const r = main.getBoundingClientRect();
    main.style.setProperty('--zx', `${((e.clientX - r.left) / r.width) * 100}%`);
    main.style.setProperty('--zy', `${((e.clientY - r.top) / r.height) * 100}%`);
    main.classList.add('is-zoomed');
  });
  root.addEventListener('mouseout', (e) => {
    const main = e.target.closest('.product-main');
    if (main && !main.contains(e.relatedTarget)) main.classList.remove('is-zoomed');
  });

  let lightbox = null;
  function openLightbox() {
    const images = product.images || [];
    if (!images.length) return;
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.className = 'lightbox';
      lightbox.innerHTML = `
        <button type="button" class="lightbox-close" aria-label="Close">&times;</button>
        <button type="button" class="lightbox-nav prev" aria-label="Previous photo">&lsaquo;</button>
        <img alt="">
        <button type="button" class="lightbox-nav next" aria-label="Next photo">&rsaquo;</button>
        <p class="lightbox-count"></p>`;
      document.body.appendChild(lightbox);
      lightbox.addEventListener('click', (e) => {
        if (e.target.closest('.prev')) step(-1);
        else if (e.target.closest('.next')) step(1);
        else if (e.target === lightbox || e.target.closest('.lightbox-close')) closeLightbox();
      });
      document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('is-open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') step(-1);
        if (e.key === 'ArrowRight') step(1);
      });
    }
    const multi = images.length > 1;
    lightbox.querySelectorAll('.lightbox-nav').forEach((b) => { b.hidden = !multi; });
    lightbox.classList.add('is-open');
    document.body.classList.add('no-scroll');
    paintLightbox();
    lightbox.querySelector('.lightbox-close').focus();
  }
  function step(d) {
    const n = (product.images || []).length;
    showImage((activeImage + d + n) % n);
    paintLightbox();
  }
  function paintLightbox() {
    const images = product.images || [];
    const img = lightbox.querySelector('img');
    img.src = images[activeImage].url;
    img.alt = images[activeImage].alt || product.name;
    lightbox.querySelector('.lightbox-count').textContent = images.length > 1 ? `${activeImage + 1} / ${images.length}` : '';
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    const main = root.querySelector('.product-main');
    if (main) main.focus();
  }

  /* ---------- Buying ---------- */

  function qty() {
    const input = document.getElementById('productQty');
    const n = Math.min(999, Math.max(1, Math.floor(Number(input.value) || 1)));
    input.value = n;
    return n;
  }

  function addToCart(button) {
    if (!window.LineageCart) return;
    window.LineageCart.add(product, qty());
    window.LineageCart.open();
    document.querySelectorAll('[data-add]').forEach((b) => {
      b.textContent = 'Added to cart';
      b.classList.add('is-added');
    });
    setTimeout(() => document.querySelectorAll('[data-add]').forEach((b) => {
      b.textContent = 'Add to cart';
      b.classList.remove('is-added');
    }), 1800);
    if (button) button.blur();
  }

  async function share(button) {
    const label = button.querySelector('span');
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url: location.href });
        return;
      }
      await navigator.clipboard.writeText(location.href);
      label.textContent = 'Link copied';
    } catch (e) {
      label.textContent = 'Copy the address bar to share';
    }
    setTimeout(() => { label.textContent = 'Share this piece'; }, 2200);
  }

  document.addEventListener('click', (e) => {
    if (!product) return;
    const t = e.target;
    if (t.closest('[data-add]')) { addToCart(t.closest('[data-add]')); return; }
    if (t.closest('[data-qty]')) {
      const input = document.getElementById('productQty');
      input.value = Math.min(999, Math.max(1, qty() + Number(t.closest('[data-qty]').dataset.qty)));
      return;
    }
    if (t.closest('[data-quote]')) {
      window.LineageCart.add(product, qty());
      location.href = 'dealer-portal.html?handoff=cart';
      return;
    }
    if (t.closest('[data-share]')) { share(t.closest('[data-share]')); return; }
    if (t.closest('.product-thumb')) { showImage(Number(t.closest('.product-thumb').dataset.index)); return; }
    if (t.closest('.product-thumb')) { showImage(Number(t.closest('.product-thumb').dataset.index)); return; }
    if (t.closest('[data-step]')) { showImage(activeImage + Number(t.closest('[data-step]').dataset.step)); return; }
    if (t.closest('[data-zoom]')) { openLightbox(); return; }
    if (t.closest('[data-zoom]')) { openLightbox(); return; }

    const add = t.closest('.shop-card-add');
    if (add && window.LineageCart) {
      const p = rowProducts.get(add.dataset.sku);
      if (!p) return;
      window.LineageCart.add(p);
      window.LineageCart.open();
      add.textContent = 'Added';
      add.classList.add('is-added');
      setTimeout(() => { add.textContent = 'Add to cart'; add.classList.remove('is-added'); }, 1600);
    }
  });
  root.addEventListener('change', (e) => { if (e.target.id === 'productQty') qty(); });

  /* ---------- Recently viewed ---------- */

  function readRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (e) { return []; }
  }
  function remember(p) {
    const keep = { sku: p.sku, name: p.name, brand: p.brand, image: p.image, price: p.price, currency: p.currency, url: p.url, inStock: p.inStock };
    const list = [keep, ...readRecent().filter((r) => r.sku !== p.sku)].slice(0, 12);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
  }

  /* ---------- Load ---------- */

  function notFound() {
    el.crumb.innerHTML = '<a href="index.html">Home</a><span aria-hidden="true">/</span><a href="shop.html">Shop</a>';
    el.layout.innerHTML = `
      <div class="product-missing">
        <h1 class="display">We couldn&rsquo;t find that piece.</h1>
        <p>It may have been renamed or discontinued. Browse the shop, or <a href="contact.html?topic=Product%20question">ask our team</a> and we&rsquo;ll help you find it.</p>
        <a href="shop.html" class="btn btn-dark">Browse the shop</a>
      </div>`;
    document.title = 'Product not found | Lineage Collections';
  }

  async function load() {
    if (!sku) { notFound(); return; }
    let raw = null;
    try {
      if (!window.LineageBC || !window.LineageBC.enabled) throw new Error('BigCommerce not configured');
      raw = await window.LineageBC.productDetail(sku);
    } catch (err) {
      console.warn('Product: BigCommerce unavailable, trying saved products.', err);
      const saved = (data.newIntros || []).find((p) => p.sku === sku);
      if (saved) raw = { ...saved, inStock: true, images: saved.image ? [{ url: saved.image, thumb: saved.image, alt: '' }] : [] };
    }
    if (!raw) { notFound(); return; }

    product = { ...raw, ...catalog.classify(raw) };
    renderProduct(product);
    initGallery();

    const recent = readRecent().filter((r) => r.sku !== product.sku);

    remember(product);

    // Related products from BigCommerce, then more from the same collection (from the cached catalog).
    renderRow(el.related, 'You may also like', (product.related || []).map(catalog.classify).slice(0, 4));
    if (product.collection && window.LineageBC && window.LineageBC.enabled) {
      try {
        const all = (await window.LineageBC.allProducts()).map(catalog.classify);
        const relatedSkus = new Set((product.related || []).map((r) => r.sku));
        const same = all
          .filter((p) => p.collection === product.collection && p.sku !== product.sku && !relatedSkus.has(p.sku))
          .sort((a, b) => (b.hasImage - a.hasImage) || ((b.room === product.room) - (a.room === product.room)) || a.name.localeCompare(b.name));
        renderRow(el.collection, `More from ${product.collection}`, same.slice(0, 4),
          { href: shopLink({ collection: product.collection }), label: `Shop the collection (${all.filter((p) => p.collection === product.collection).length})` });
      } catch (e) { el.collection.hidden = true; }
    }
    renderRow(el.recent, 'Recently viewed', recent.map(catalog.classify).slice(0, 4));
  }

  load();
})();
