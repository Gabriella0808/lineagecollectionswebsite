/*
 * Lineage Collections — living room page (living-room.html). Styles: "Living room page" in
 * css/styles.css. "Shop by piece", the live counts and the photo helpers (window.LineageRoom:
 * background removal, front-view photos) come from js/room.js, loaded first.
 *
 *   [data-zoom]       hero: the word LIVING is cut out of a dark screen, the room showing through
 *                     its letters; scrolling flies you through the word into the room
 *   [data-rooms]      "Shop the room": real room photos (livingRooms in js/data.js) with a hotspot
 *                     on each piece; a dot opens a panel with the piece, its price and Add to cart
 *   [data-talent-count]  "Hidden talents": live counts of pieces with drawers, casters, power, stools
 *   [data-strip]      the collections as a strip of room photos you can drag and throw
 */
(function () {
  'use strict';

  const page = document.querySelector('.liv-page');
  if (!page) return;

  const Catalog = window.LineageCatalog;
  const room = page.dataset.room;
  const motion = document.documentElement.classList.contains('motion');
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);
  const shopUrl = (params) => `shop.html?${new URLSearchParams({ room, ...params }).toString().replace(/\+/g, '%20')}`;

  /* ---------- Hero: fly through the word ---------- */

  const zoom = document.querySelector('[data-zoom]');
  const zoomGroup = zoom && zoom.querySelector('[data-zoom-word]');
  const zoomText = zoom && zoom.querySelector('text');
  let origin = null;

  // Zoom into the middle of the second "I", so the screen fills with the room, not the dark
  function findOrigin() {
    if (!zoomText) return;
    try {
      const box = zoomText.getExtentOfChar(3);
      origin = { x: box.x + box.width / 2, y: box.y + box.height * 0.55 };
    } catch (e) {
      origin = { x: 800, y: 450 };
    }
  }
  if (document.fonts) document.fonts.ready.then(findOrigin); else findOrigin();
  window.addEventListener('load', findOrigin);

  function paintZoom() {
    if (!zoom || !origin) return;
    const r = zoom.getBoundingClientRect();
    const travel = zoom.offsetHeight - window.innerHeight;
    const p = motion ? clamp(-r.top / (travel || 1), 0, 1) : 1;
    // Ease in: slow at first, then rushing through the letters
    const s = 1 + Math.pow(clamp(p / 0.7, 0, 1), 3) * 60;
    zoomGroup.setAttribute('transform', `translate(${origin.x} ${origin.y}) scale(${s.toFixed(3)}) translate(${-origin.x} ${-origin.y})`);
    zoom.style.setProperty('--zp', p.toFixed(4));
  }

  /* ---------- Shop the room: real room photos with a hotspot on each piece ---------- */

  const roomsBox = document.querySelector('[data-rooms]');
  const ROOMS = ((window.LINEAGE_DATA || {}).livingRooms || []);
  let rooms = []; // ROOMS with each spot's product found
  let current = 0;
  let openSpot = null;

  const el = roomsBox && {
    stage: roomsBox.querySelector('[data-room-stage]'),
    photos: roomsBox.querySelector('[data-room-photos]'),
    spots: roomsBox.querySelector('[data-room-spots]'),
    tabs: roomsBox.querySelector('[data-room-tabs]'),
    pieces: roomsBox.querySelector('[data-room-pieces]'),
    panel: roomsBox.querySelector('[data-panel]')
  };

  // The photos fill the stage (object-fit: cover), so work out where a point of the photo lands
  function place(roomIndex) {
    const img = el.photos.querySelector(`img[data-k="${roomIndex}"]`);
    if (!img || !img.naturalWidth) return;
    const W = el.stage.clientWidth;
    const H = el.stage.clientHeight;
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const ox = (W - dw) / 2;
    const oy = (H - dh) / 2;
    el.spots.querySelectorAll('.liv-spot').forEach((dot) => {
      const s = rooms[roomIndex].spots[Number(dot.dataset.spot)];
      const x = ox + (s.x / 100) * dw;
      const y = oy + (s.y / 100) * dh;
      dot.style.left = `${(x / W) * 100}%`;
      dot.style.top = `${(y / H) * 100}%`;
      dot.hidden = x < 0 || x > W || y < 0 || y > H;
    });
  }

  function showRoom(k) {
    current = (k + rooms.length) % rooms.length;
    closePanel();
    const room = rooms[current];
    el.photos.querySelectorAll('img').forEach((img) => img.classList.toggle('is-on', Number(img.dataset.k) === current));
    el.spots.innerHTML = room.spots.map((s, i) => `
      <button type="button" class="liv-spot" data-spot="${i}" style="--i:${i}" aria-label="${escapeHtml(s.p.name)}">
        <span class="liv-spot-dot"></span>
        <span class="liv-spot-label">${escapeHtml(s.p.name.replace(new RegExp(`^${room.collection}\\s*`, 'i'), ''))}</span>
      </button>`).join('');
    el.tabs.querySelectorAll('[data-room-tab]').forEach((t) => t.setAttribute('aria-selected', String(Number(t.dataset.roomTab) === current)));
    const total = room.spots.reduce((sum, s) => sum + (s.p.price || 0), 0);
    el.pieces.innerHTML = `<span class="liv-room-count">${room.spots.length} ${room.spots.length === 1 ? 'piece' : 'pieces'} in this room${total ? ` &middot; ${money(total)}` : ''}</span>
      <a href="${escapeHtml(shopUrl({ collection: room.collection }))}" class="liv-room-all">Shop ${escapeHtml(room.collection)} <span aria-hidden="true">&rarr;</span></a>`;
    const img = el.photos.querySelector(`img[data-k="${current}"]`);
    if (img.complete) place(current); else img.addEventListener('load', () => place(current), { once: true });
  }

  function openPanel(i) {
    const s = rooms[current].spots[i];
    const p = s.p;
    openSpot = i;
    el.spots.querySelectorAll('.liv-spot').forEach((d) => d.classList.toggle('is-open', Number(d.dataset.spot) === i));
    el.panel.querySelector('[data-panel-img]').src = p.image;
    el.panel.querySelector('[data-panel-img]').alt = p.name;
    el.panel.querySelector('[data-panel-eyebrow]').textContent = `${p.collection} · ${p.type}`;
    const link = el.panel.querySelector('[data-panel-link]');
    link.href = p.url;
    link.textContent = p.name;
    el.panel.querySelector('[data-panel-price]').textContent = p.price == null ? 'Price on request' : money(p.price);
    el.panel.querySelector('[data-panel-view]').href = p.url;
    // Open on the side away from the piece, so the piece stays in view
    el.panel.classList.toggle('is-left', s.x > 50);
    el.panel.hidden = false;
    requestAnimationFrame(() => el.panel.classList.add('is-open'));
  }

  function closePanel() {
    if (!el || openSpot === null) return;
    openSpot = null;
    el.panel.classList.remove('is-open');
    el.spots.querySelectorAll('.liv-spot').forEach((d) => d.classList.remove('is-open'));
    setTimeout(() => { if (openSpot === null) el.panel.hidden = true; }, 450);
  }

  if (roomsBox) {
    roomsBox.addEventListener('click', (e) => {
      const spot = e.target.closest('.liv-spot');
      if (spot) { const i = Number(spot.dataset.spot); if (openSpot === i) closePanel(); else openPanel(i); return; }
      if (e.target.closest('[data-panel-close]')) { closePanel(); return; }
      const step = e.target.closest('[data-room-step]');
      if (step) { showRoom(current + Number(step.dataset.roomStep)); return; }
      const tab = e.target.closest('[data-room-tab]');
      if (tab) { showRoom(Number(tab.dataset.roomTab)); return; }
      const add = e.target.closest('[data-panel-add]');
      if (add && openSpot !== null && window.LineageCart) {
        window.LineageCart.add(rooms[current].spots[openSpot].p, 1);
        add.classList.add('is-added');
        setTimeout(() => add.classList.remove('is-added'), 1800);
        return;
      }
      // A click on the photo itself closes the panel
      if (e.target.closest('[data-room-photos]')) closePanel();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePanel();
    });
    window.addEventListener('resize', () => place(current));
  }

  function setupRooms(products) {
    if (!roomsBox) return;
    rooms = ROOMS.map((r) => ({
      ...r,
      spots: r.spots.map((s) => ({
        ...s,
        p: products.find((p) => p.collection === r.collection && p.name.toLowerCase().includes(s.match.toLowerCase()) && (!s.sku || p.sku.includes(s.sku)))
      })).filter((s) => s.p)
    })).filter((r) => r.spots.length);
    if (!rooms.length) { roomsBox.hidden = true; return; }
    el.photos.innerHTML = rooms.map((r, k) => `<img src="${escapeHtml(r.image)}" alt="A ${escapeHtml(r.collection)} living room" data-k="${k}"${k ? ' loading="lazy"' : ''}>`).join('');
    el.tabs.innerHTML = rooms.map((r, k) => `<button type="button" role="tab" data-room-tab="${k}" aria-selected="false">${escapeHtml(r.collection)}</button>`).join('');
    showRoom(0);
  }

  /* ---------- Hidden talents ---------- */

  const TALENTS = { drawers: /drawer/i, casters: /caster|castor/i, power: /power|usb/i, stools: /stool/i };
  function renderTalents(products) {
    document.querySelectorAll('[data-talent-count]').forEach((el) => {
      const re = TALENTS[el.dataset.talentCount];
      if (re) el.textContent = products.filter((p) => re.test(p.name)).length;
    });
  }

  // Touch screens can't hover: there the photos swap between the piece and its feature on their own
  if (!window.matchMedia('(hover: hover)').matches) {
    const cards = document.querySelectorAll('.liv-talent');
    let on = false;
    setInterval(() => { on = !on; cards.forEach((c, i) => setTimeout(() => c.classList.toggle('is-showing', on), i * 250)); }, 2800);
  }

  /* ---------- The collections: a strip of room photos to drag and throw ---------- */

  const strip = document.querySelector('[data-strip]');

  // How much a photo looks like a room: a cut-out on white scores 0; a close-up of one surface is
  // smooth and scores low; a furnished room has light, shade and colour everywhere and scores high.
  function roomScore(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const n = 24;
          const c = document.createElement('canvas');
          c.width = c.height = n;
          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, n, n);
          const px = ctx.getImageData(0, 0, n, n).data;
          const white = (k) => px[k * 4] > 225 && px[k * 4 + 1] > 225 && px[k * 4 + 2] > 225;
          if ([0, n - 1, n * (n - 1), n * n - 1].every(white)) { resolve(0); return; }
          let sum = 0, sq = 0, edges = 0, sat = 0;
          const lum = (k) => px[k * 4] * 0.3 + px[k * 4 + 1] * 0.59 + px[k * 4 + 2] * 0.11;
          for (let k = 0; k < n * n; k++) {
            const l = lum(k);
            sum += l; sq += l * l;
            sat += Math.max(px[k * 4], px[k * 4 + 1], px[k * 4 + 2]) - Math.min(px[k * 4], px[k * 4 + 1], px[k * 4 + 2]);
            if (k % n < n - 1) edges += Math.abs(l - lum(k + 1));
            if (k < n * (n - 1)) edges += Math.abs(l - lum(k + n));
          }
          const mean = sum / (n * n);
          const spread = Math.sqrt(Math.max(0, sq / (n * n) - mean * mean));
          // Wide photos are more often whole rooms than details
          const wide = img.naturalWidth >= img.naturalHeight ? 1.15 : 1;
          resolve((spread + edges / (n * n) * 1.5 + sat / (n * n) * 0.3) * wide);
        } catch (e) { resolve(0); }
      };
      img.onerror = () => resolve(0);
      img.src = url;
    });
  }
  function gallery(p) {
    return window.LineageBC.query(
      'query Gallery($id: Int!) { site { product(entityId: $id) { images(first: 15) { edges { node { url(width: 900) } } } } } }',
      { id: p.entityId }
    ).then((d) => (d.site.product ? d.site.product.images.edges.map((e) => e.node.url) : [])).catch(() => []);
  }

  async function renderStrip(products) {
    if (!strip) return;
    const groups = new Map();
    products.forEach((p) => {
      if (!p.collection || p.type === 'Bundles & Sets') return;
      if (!groups.has(p.collection)) groups.set(p.collection, []);
      groups.get(p.collection).push(p);
    });
    const rows = await Promise.all(Array.from(groups.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(async ([name, list]) => {
        // A photo chosen in js/data.js (livingPhotos), else the most room-like one across the
        // galleries of the collection's main pieces
        const chosenPhoto = ((window.LINEAGE_DATA || {}).livingPhotos || {})[name];
        if (chosenPhoto) return { name, count: list.length, photo: chosenPhoto };
        const order = list.slice().sort((x, y) => (y.type === 'Coffee Tables') - (x.type === 'Coffee Tables')).slice(0, 3);
        const urls = (await Promise.all(order.map(gallery))).flat();
        const scores = await Promise.all(urls.map(roomScore));
        const best = scores.indexOf(Math.max(...scores, 0));
        const photo = best >= 0 && scores[best] > 0 ? urls[best] : null;
        return { name, count: list.length, photo };
      }));
    strip.innerHTML = rows.filter((r) => r.photo).map((r, i) => `
      <a href="${escapeHtml(shopUrl({ collection: r.name }))}" class="liv-card" style="--i:${i}" draggable="false">
        <span class="liv-card-media"><img src="${escapeHtml(r.photo)}" alt="" loading="lazy" draggable="false"></span>
        <span class="liv-card-name">${escapeHtml(r.name)}</span>
        <span class="liv-card-meta">${r.count} living room ${r.count === 1 ? 'piece' : 'pieces'} <span aria-hidden="true">&rarr;</span></span>
      </a>`).join('');
  }

  // Drag with the mouse (touch scrolls natively); let go and it keeps gliding, cards lean with speed
  if (strip) {
    let down = null;
    let velocity = 0;
    let dragged = false;
    let lastX = 0;
    strip.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = { x: e.clientX, scroll: strip.scrollLeft };
      lastX = e.clientX;
      velocity = 0;
      dragged = false;
      strip.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (Math.abs(dx) > 5) dragged = true;
      strip.scrollLeft = down.scroll - dx;
      velocity = e.clientX - lastX;
      lastX = e.clientX;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = null;
      strip.classList.remove('is-dragging');
    });
    strip.addEventListener('click', (e) => { if (dragged) { e.preventDefault(); dragged = false; } }, true);
    let last = strip.scrollLeft;
    let lean = 0;
    (function glide() {
      if (!down && Math.abs(velocity) > 0.2) {
        strip.scrollLeft -= velocity;
        velocity *= 0.94;
      }
      const speed = strip.scrollLeft - last;
      last = strip.scrollLeft;
      lean += (clamp(speed * -0.25, -8, 8) - lean) * 0.12;
      strip.style.setProperty('--lean', `${lean.toFixed(2)}deg`);
      requestAnimationFrame(glide);
    })();
  }

  /* ---------- Load ---------- */

  async function load() {
    const bc = window.LineageBC;
    if (!Catalog || !bc || !bc.enabled) return;
    try {
      const raw = await bc.allProducts();
      const products = raw.map(Catalog.classify).filter((p) => p.room === room && !/display/i.test(p.name));
      renderTalents(products);
      setupRooms(products);
      renderStrip(products);
    } catch (err) {
      console.warn('Living room page: could not load products.', err);
    }
  }
  load();

  (function frame() {
    paintZoom();
    requestAnimationFrame(frame);
  })();
})();
