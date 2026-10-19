/*
 * Lineage Collections — dining room page (dining-room.html). Styles: "Dining room page" in
 * css/styles.css. "Shop by piece" and the live counts come from js/room.js.
 *
 *   [data-doors]        the hero's French doors: ajar on arrival, they swing open as you scroll
 *                       (--hero-p from js/motion.js) or when "Come in" is clicked
 *   [data-plan]         "Set the table": pick how many guests and the table changes shape, chairs
 *                       glide in and places are set; [data-options] lists the live tables that
 *                       seat that many, with matching chairs and the total for the whole dinner
 *   [data-menu]         the collections as a dinner menu; pointing at one shows its room photo
 */
(function () {
  'use strict';

  const page = document.querySelector('.dine-page');
  if (!page) return;

  const Catalog = window.LineageCatalog;
  const room = page.dataset.room;
  const motion = document.documentElement.classList.contains('motion');
  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);
  const shopUrl = (params) => `shop.html?${new URLSearchParams({ room, ...params }).toString().replace(/\+/g, '%20')}`;

  /* ---------- Hero: the French doors ---------- */

  const hero = document.querySelector('.dine-hero');
  const enter = document.querySelector('[data-doors-open]');
  if (hero) {
    // Ajar a moment after arriving, inviting you in
    setTimeout(() => hero.classList.add('is-ajar'), motion ? 900 : 0);
    if (enter) {
      enter.addEventListener('click', () => {
        hero.classList.add('is-open');
        enter.setAttribute('aria-expanded', 'true');
      });
    }
  }

  /* ---------- Set the table ---------- */

  const WORDS = { 2: 'two', 4: 'four', 6: 'six', 8: 'eight', 10: 'ten' };

  // How many a table seats, from its name: [fewest, most] (leaves extend the most)
  function seats(name) {
    const n = name.toLowerCase();
    if (/96/.test(n)) return [8, 10];
    if (/double ped/.test(n)) return [6, 8];
    if (/78|self storing leaf|trestle|butterfly|rectangular|leg dining/.test(n)) return [6, 8];
    if (/base/.test(n)) return [4, 6];
    if (/round/.test(n) && /leaf/.test(n) && !/drop leaf/.test(n)) return [4, 6];
    if (/drop leaf|round/.test(n)) return [2, 4];
    return [4, 6];
  }
  // Chairs per box: "(2pk)", "Set of 2", "2 Pack"
  const perBox = (name) => (/2\s*pk|2\s*pack|set of 2|pack of 2/i.test(name) ? 2 : 1);

  const plan = document.querySelector('[data-plan]');
  const table = plan && plan.querySelector('[data-table]');
  const seatsBox = plan && plan.querySelector('[data-seats]');
  const guestButtons = plan ? Array.from(plan.querySelectorAll('[data-guests]')) : [];
  const guestWord = document.querySelector('[data-guests-word]');
  const options = document.querySelector('[data-options]');
  let guests = 6;
  let tables = [];

  // The stage is 16:10, measured in units 100 wide and 62.5 tall
  const H = 62.5;
  const pct = (x, y) => ({ left: `${x}%`, top: `${(y / H) * 100}%` });

  // Ten seats are drawn once; each change moves them to their new places
  if (seatsBox) {
    seatsBox.innerHTML = Array.from({ length: 10 }, (_, i) => `
      <span class="dine-seat" style="--i:${i}">
        <span class="dine-chair"></span>
        <span class="dine-setting"><i class="plate"></i><i class="glass"></i><i class="fork"></i><i class="knife"></i></span>
      </span>`).join('');
  }

  // Where each guest sits around a table for n: { x, y, angle } (angle 0 = facing up the screen)
  function layoutFor(n) {
    const cx = 50, cy = H / 2;
    if (n <= 4) {
      const r = n <= 2 ? 11 : 13;
      const angles = n <= 2 ? [90, 270] : [0, 90, 180, 270];
      return { shape: 'round', w: r * 2, h: r * 2, seats: angles.map((a) => ({ a, x: cx + Math.sin((a * Math.PI) / 180) * (r + 5.5), y: cy - Math.cos((a * Math.PI) / 180) * (r + 5.5) })) };
    }
    const perSide = (n - 2) / 2;
    const L = 16 + perSide * 13;
    const W = 22;
    const list = [];
    for (let i = 0; i < perSide; i++) {
      const x = cx - L / 2 + (L * (i + 0.5)) / perSide;
      list.push({ a: 0, x, y: cy - W / 2 - 5.5 }, { a: 180, x, y: cy + W / 2 + 5.5 });
    }
    list.push({ a: 270, x: cx - L / 2 - 5.5, y: cy }, { a: 90, x: cx + L / 2 + 5.5, y: cy });
    return { shape: 'rect', w: L, h: W, seats: list };
  }

  function paintTable() {
    if (!table) return;
    const lay = layoutFor(guests);
    Object.assign(table.style, {
      left: `${50 - lay.w / 2}%`,
      top: `${((H / 2 - lay.h / 2) / H) * 100}%`,
      width: `${lay.w}%`,
      height: `${(lay.h / H) * 100}%`
    });
    table.classList.toggle('is-round', lay.shape === 'round');
    table.style.setProperty('--candles', guests <= 4 ? 1 : Math.min(5, guests / 2));
    seatsBox.querySelectorAll('.dine-seat').forEach((seat, i) => {
      const s = lay.seats[i];
      seat.classList.toggle('is-on', Boolean(s));
      if (!s) return;
      Object.assign(seat.style, pct(s.x, s.y));
      seat.style.setProperty('--a', `${s.a}deg`);
    });
    guestButtons.forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.guests) === guests)));
    if (guestWord) guestWord.textContent = WORDS[guests];
    renderOptions();
  }

  guestButtons.forEach((b) => b.addEventListener('click', () => {
    guests = Number(b.dataset.guests);
    paintTable();
  }));

  // The tables that seat that many guests, each with its collection's chairs and the dinner total
  function renderOptions() {
    if (!options || !tables.length) return;
    const fits = tables.filter((t) => t.seats[0] <= guests && guests <= t.seats[1]).slice(0, 4);
    if (!fits.length) {
      options.innerHTML = `<p class="dine-options-empty">For a dinner for ${WORDS[guests]}, <a href="contact.html">talk to us</a> about pairing two tables.</p>`;
      return;
    }
    options.innerHTML = fits.map((t, i) => {
      const chair = t.chair;
      const boxes = chair ? Math.ceil(guests / chair.per) : 0;
      const total = (t.p.price || 0) + (chair ? boxes * (chair.p.price || 0) : 0);
      return `
        <article class="dine-option" style="--i:${i}">
          <a href="${escapeHtml(t.p.url)}" class="dine-option-media"><img src="${escapeHtml(t.p.image)}" alt="" loading="lazy"></a>
          <p class="dine-option-eyebrow">${escapeHtml(t.p.collection || '')} &middot; seats ${t.seats[0]}&ndash;${t.seats[1]}</p>
          <h3 class="dine-option-name"><a href="${escapeHtml(t.p.url)}">${escapeHtml(t.p.name)}</a></h3>
          ${chair
            ? `<p class="dine-option-chairs">+ ${boxes} &times; <a href="${escapeHtml(chair.p.url)}">${escapeHtml(chair.p.name)}</a></p>`
            : '<p class="dine-option-chairs">Chairs sold separately</p>'}
          <p class="dine-option-total"><span>Dinner for ${WORDS[guests]}</span>${money(total)}</p>
          <a href="${escapeHtml(shopUrl({ collection: t.p.collection || '' }))}" class="dine-option-link">Shop the set <span aria-hidden="true">&rarr;</span></a>
        </article>`;
    }).join('');
  }

  /* ---------- The menu: collections, with a room photo of the one you point at ---------- */

  const menu = document.querySelector('[data-menu]');
  const preview = document.querySelector('[data-menu-preview]');

  function renderMenu(products) {
    if (!menu) return;
    const groups = new Map();
    products.forEach((p) => {
      if (!p.collection) return;
      if (!groups.has(p.collection)) groups.set(p.collection, []);
      groups.get(p.collection).push(p);
    });
    const rows = Array.from(groups.entries())
      .filter(([, list]) => list.some((p) => p.type === 'Dining Tables'))
      .sort((a, b) => b[1].length - a[1].length);
    menu.innerHTML = rows.map(([name, list], i) => {
      const kinds = ['Dining Tables', 'Dining Chairs', 'Credenzas & Sideboards', 'Cabinets', 'Stools']
        .filter((k) => list.some((p) => p.type === k))
        .map((k) => ({ 'Dining Tables': 'Tables', 'Dining Chairs': 'Chairs', 'Credenzas & Sideboards': 'Credenzas', Cabinets: 'Curios', Stools: 'Stools' }[k]));
      const from = Math.min(...list.map((p) => p.price).filter((n) => n != null));
      const tableP = list.find((p) => p.type === 'Dining Tables' && p.image) || list.find((p) => p.image) || {};
      return `
        <a href="${escapeHtml(shopUrl({ collection: name }))}" class="dine-course" data-entity="${tableP.entityId || ''}" data-name="${escapeHtml(name)}" style="--i:${i}">
          <span class="dine-course-n">${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][i] || i + 1}</span>
          <span class="dine-course-name">${escapeHtml(name)}</span>
          <span class="dine-course-dots" aria-hidden="true"></span>
          <span class="dine-course-meta">${escapeHtml(kinds.join(' · '))}${Number.isFinite(from) ? ` &middot; from ${money(from)}` : ''}</span>
        </a>`;
    }).join('');
  }

  // A room photo of each collection, from its dining table's gallery in BigCommerce: the first
  // image that isn't a cut-out on white
  function roomPhoto(entityId) {
    return window.LineageBC.query(
      'query Gallery($id: Int!) { site { product(entityId: $id) { images(first: 15) { edges { node { url(width: 900) } } } } } }',
      { id: Number(entityId) }
    ).then(async (d) => {
      const urls = d.site.product ? d.site.product.images.edges.map((e) => e.node.url) : [];
      for (const url of urls) if (!(await onWhite(url))) return url;
      return null;
    }).catch(() => null);
  }
  function onWhite(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = c.height = 12;
          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, 12, 12);
          const px = ctx.getImageData(0, 0, 12, 12).data;
          resolve([0, 11, 132, 143].every((k) => px[k * 4] > 225 && px[k * 4 + 1] > 225 && px[k * 4 + 2] > 225));
        } catch (e) { resolve(true); }
      };
      img.onerror = () => resolve(true);
      img.src = url;
    });
  }

  // The photo in the heading column crossfades to the room of the collection you point at
  async function setupPreview() {
    if (!menu || !preview) return;
    const rows = Array.from(menu.querySelectorAll('.dine-course'));
    const photos = await Promise.all(rows.map((r) => (r.dataset.entity ? roomPhoto(r.dataset.entity) : null)));
    preview.innerHTML = photos.map((url, k) => (url
      ? `<img src="${escapeHtml(url)}" alt="" data-k="${k}" loading="lazy"${k === 0 ? ' class="is-on"' : ''}>` : '')).join('')
      + '<span class="dine-menu-caption" data-caption></span>';
    const caption = preview.querySelector('[data-caption]');
    const show = (k) => {
      if (!photos[k]) return;
      preview.querySelectorAll('img').forEach((im) => im.classList.toggle('is-on', Number(im.dataset.k) === k));
      caption.textContent = rows[k].dataset.name;
    };
    show(photos.findIndex(Boolean));
    rows.forEach((row, k) => {
      row.addEventListener('pointerenter', () => show(k));
      row.addEventListener('focus', () => show(k));
    });
  }

  /* ---------- Load ---------- */

  async function load() {
    const bc = window.LineageBC;
    paintTable();
    if (!Catalog || !bc || !bc.enabled) return;
    try {
      const raw = await bc.allProducts();
      const all = raw.map(Catalog.classify);
      const products = all.filter((p) => p.room === room && !/display/i.test(p.name));
      // Credenzas live under Storage, but every dining collection has one: show them too
      const withCredenzas = products.concat(all.filter((p) => p.type === 'Credenzas & Sideboards' && products.some((d) => d.collection && d.collection === p.collection)));

      const seen = new Set();
      const chairs = products.filter((p) => p.type === 'Dining Chairs' && !/table/i.test(p.name));
      tables = products
        .filter((p) => p.type === 'Dining Tables' && p.image && !seen.has(p.name) && seen.add(p.name))
        .map((p) => {
          // The collection's chair: a side chair first
          const mine = chairs.filter((c) => c.collection === p.collection)
            .sort((a, b) => /side chair/i.test(b.name) - /side chair/i.test(a.name));
          return { p, seats: seats(p.name), chair: mine[0] ? { p: mine[0], per: perBox(mine[0].name) } : null };
        })
        // Tables with matching chairs first
        .sort((a, b) => Boolean(b.chair) - Boolean(a.chair));
      renderOptions();
      renderMenu(withCredenzas);
      setupPreview();
    } catch (err) {
      console.warn('Dining page: could not load products.', err);
    }
  }
  load();
})();
