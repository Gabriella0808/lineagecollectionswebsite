/*
 * Lineage Collections — room pages (bedroom.html, bedroom-collection.html). Styles: "Room pages"
 * in css/styles.css.
 *
 * The bedroom page tells the story of a night, from switching the lamps on to getting ready in
 * the morning. Everything product-related comes live from BigCommerce:
 *
 *   [data-light-switch]   the hero's light switch (scrolling also turns the lamps on)
 *   [data-fan]            "Pick your mood": collections fanned out like a hand of cards; each
 *                         opens bedroom-collection.html?set=…
 *   [data-build-stage]    (bedroom-collection.html) "Build your bedroom": the collection
 *                         photographed in a studio; the pieces arrive and move in depth with the
 *                         mouse; [data-build-sets] switches collection
 *   [data-skus]           (bedroom-collection.html) every piece in the collection, with Add to cart
 *   [data-story]          "A night in your bedroom": a clock runs from evening to morning and the
 *                         sky changes with each [data-chapter]; [data-chapter-products] fill in
 *   [data-pieces]         "Shop by piece" tiles
 *   [data-count]          live numbers (pieces, power)
 *
 * Only cut-out photos (product on white) are used in the studio and on the cards, so a room
 * photo never ends up standing next to the bed.
 */
(function () {
  'use strict';

  const page = document.querySelector('.room-page');
  if (!page) return;

  const Catalog = window.LineageCatalog;
  const room = page.dataset.room;
  const motion = document.documentElement.classList.contains('motion');
  const wide = window.matchMedia('(min-width: 900px)');
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount) || 0);
  const shopUrl = (params) => `shop.html?${new URLSearchParams({ room, ...params }).toString().replace(/\+/g, '%20')}`;
  const POWER = /power|usb|electrified/i;
  const siteHeader = document.getElementById('siteHeader');

  /* ---------- Hero: the light switch ---------- */

  const hero = document.querySelector('.room-hero');
  const lightSwitch = document.querySelector('[data-light-switch]');
  if (hero && lightSwitch) {
    lightSwitch.addEventListener('click', () => {
      const on = !hero.classList.contains('is-lit');
      hero.classList.toggle('is-lit', on);
      lightSwitch.setAttribute('aria-pressed', String(on));
      lightSwitch.querySelector('[data-switch-label]').textContent = on ? 'Lights off' : 'Lights on';
    });
  }

  /* ---------- Which photos are cut-outs (product on white)? ---------- */

  // Shrink the photo to 12x12 pixels and check that all four corners are near-white.
  // BigCommerce's image server allows this (it sends access-control-allow-origin: *).
  const cutoutChecks = new Map();
  function isCutout(url) {
    if (!cutoutChecks.has(url)) {
      cutoutChecks.set(url, new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const c = document.createElement('canvas');
            c.width = c.height = 12;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, 12, 12);
            const px = ctx.getImageData(0, 0, 12, 12).data;
            resolve([0, 11, 132, 143].every((i) => px[i * 4] > 225 && px[i * 4 + 1] > 225 && px[i * 4 + 2] > 225));
          } catch (e) {
            resolve(false);
          }
        };
        img.onerror = () => resolve(false);
        img.src = url;
      }));
    }
    return cutoutChecks.get(url);
  }

  // The products in the list whose photos are cut-outs, in order (checks a few at a time).
  async function cutouts(list, count) {
    const found = [];
    const candidates = list.filter((p) => p.image);
    for (let i = 0; i < candidates.length && found.length < count; i += 6) {
      const batch = candidates.slice(i, i + 6);
      const ok = await Promise.all(batch.map((p) => isCutout(p.image)));
      batch.forEach((p, k) => { if (ok[k] && found.length < count) found.push(p); });
    }
    return found;
  }
  const firstCutout = async (list) => (await cutouts(list, 1))[0] || null;

  /* ---------- Build your bedroom: the collection, photographed in the studio ---------- */

  // Where each piece stands in the studio, in % of the set: x = centre, b = bottom, w = width,
  // d = depth (0 = front, 1 = back; deeper pieces move less with the mouse). The main product
  // photos are all taken from the same angle, so the group reads like one catalogue shot:
  // the dresser and mirror at the back left, the bed in the middle, a nightstand by the
  // headboard and the chest at the back right. label: where the price tag sits.
  const SLOTS = [
    { type: 'Dressers', label: 'The dresser', x: 19, b: 33, w: 21, d: 0.75, z: 2, tag: 'below' },
    { type: 'Mirrors', label: 'The mirror', x: 19, b: 60, w: 10, d: 0.8, z: 1, tag: 'side' },
    { type: 'Beds', label: 'The bed', x: 49, b: 8, w: 44, d: 0.35, z: 5 },
    { type: 'Nightstands', label: 'The nightstand', x: 77, b: 30, w: 11, d: 0.6, z: 4 },
    { type: 'Chests', label: 'The chest', x: 91, b: 33, w: 10.5, d: 0.8, z: 3 }
  ];
  // The same set photographed straight on (front-view photos from each product's gallery): the bed
  // facing you with its headboard centred, a nightstand on each side of it, the dresser and mirror
  // on the left, the chest on the right. The nightstands' x is worked out from the headboard.
  const STRAIGHT = [
    { type: 'Dressers', label: 'The dresser', x: 9.5, b: 22, w: 18.5, d: 0.75, z: 2, tag: 'below' },
    { type: 'Mirrors', label: 'The mirror', x: 9.5, b: 50, w: 9.5, d: 0.8, z: 1, tag: 'side' },
    { type: 'Beds', label: 'The bed', x: 50, b: 2, w: 40, d: 0.35, z: 5 },
    { type: 'Nightstands', label: 'The nightstands', x: 30, b: 22, w: 10.5, d: 0.6, z: 4, pair: true },
    { type: 'Chests', label: 'The chest', x: 92, b: 22, w: 10, d: 0.75, z: 3 }
  ];
  // How wide a headboard is in the straight-on set (% of the set); the bed photo is scaled to it
  const HEADBOARD_W = 26;
  const SIZES = (window.LINEAGE_DATA && window.LINEAGE_DATA.pieceSizes) || {};
  const SIZE_DEFAULTS = (window.LINEAGE_DATA && window.LINEAGE_DATA.pieceSizeDefaults) || { Beds: 66, Nightstands: 24, Dressers: 62, Mirrors: 34, Chests: 36 };
  // The order the pieces arrive in as you scroll
  const ARRIVAL = ['Beds', 'Nightstands', 'Dressers', 'Mirrors', 'Chests'];

  /* Straight-on photos. The main product photo is usually taken at an angle, but most galleries
     also have a front view: a cut-out whose outline is symmetrical left to right (angled shots
     score at most about 0.93, front views 0.98+), shaped like the main photo (not a dresser shown
     with its mirror), without open doors or drawers, and with nearly as much detail as the main
     photo (drawers, knobs), which rules out a plain back panel. */
  const galleries = new Map();
  function gallery(p) {
    if (!galleries.has(p.entityId)) {
      galleries.set(p.entityId, window.LineageBC.query(
        'query Gallery($id: Int!) { site { product(entityId: $id) { images(first: 15) { edges { node { url(width: 320) } } } } } }',
        { id: p.entityId }
      ).then((d) => (d.site.product ? d.site.product.images.edges.map((e) => e.node.url) : [])).catch(() => []));
    }
    return galleries.get(p.entityId);
  }

  // { symmetry, fill, aspect, detail } of the furniture in a small cut-out photo, or null for a room photo
  function outline(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          const px = ctx.getImageData(0, 0, w, h).data;
          if (![0, w - 1, (h - 1) * w, h * w - 1].every((p) => px[p * 4] > 225 && px[p * 4 + 1] > 225 && px[p * 4 + 2] > 225)) {
            resolve(null);
            return;
          }
          clearBackground(px, w, h);
          let minX = w, minY = h, maxX = -1, maxY = -1;
          for (let p = 0; p < w * h; p++) {
            if (!px[p * 4 + 3]) continue;
            const x = p % w;
            const y = (p - x) / w;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
          if (maxX < 0) { resolve(null); return; }
          let both = 0, either = 0, filled = 0, edges = 0;
          const lum = (p) => px[p * 4] * 0.3 + px[p * 4 + 1] * 0.59 + px[p * 4 + 2] * 0.11;
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              const p = y * w + x;
              const a = px[p * 4 + 3] > 0;
              const b = px[(y * w + minX + maxX - x) * 4 + 3] > 0;
              if (a || b) either += 1;
              if (a && b) both += 1;
              if (!a) continue;
              filled += 1;
              if (x < maxX && y < maxY && px[(p + 1) * 4 + 3] && px[(p + w) * 4 + 3]) {
                edges += Math.abs(lum(p) - lum(p + 1)) + Math.abs(lum(p) - lum(p + w));
              }
            }
          }
          const bw = maxX - minX + 1;
          const bh = maxY - minY + 1;
          // (a close-up runs off the edge of the photo: it's never the whole piece)
          const cropped = minX < 3 || minY < 3 || maxX > w - 4 || maxY > h - 4;
          resolve({ symmetry: both / either, fill: filled / (bw * bh), aspect: bw / bh, detail: edges / (filled || 1), cropped });
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  const fronts = new Map();
  const FRONT_PHOTOS = (window.LINEAGE_DATA && window.LINEAGE_DATA.frontPhotos) || {};
  function frontPhoto(p) {
    // A front photo supplied in js/data.js (frontPhotos) wins over the gallery
    if (FRONT_PHOTOS[p.sku]) return Promise.resolve(FRONT_PHOTOS[p.sku]);
    if (!fronts.has(p.sku)) {
      fronts.set(p.sku, gallery(p).then(async (urls) => {
        const shapes = await Promise.all(urls.map(async (url) => ({ url, shape: await outline(url) })));
        const main = shapes[0] && shapes[0].shape;
        const front = shapes.slice(1)
          .filter(({ shape }) => shape && !shape.cropped && shape.symmetry >= 0.96 && shape.fill >= 0.62
            // (a mirror's front view may be turned landscape, as it hangs on the dresser)
            && (!main || ((p.type === 'Mirrors' || (shape.aspect >= main.aspect * 0.7 && shape.aspect <= main.aspect * 1.6)) && shape.detail >= main.detail * 0.7)))
          .sort((a, b) => b.shape.detail - a.shape.detail)[0];
        return front ? front.url.replace('/320w/', '/1000w/') : null;
      }));
    }
    return fronts.get(p.sku);
  }

  // The studio shows pieces large, so ask BigCommerce for a bigger photo than the catalog's 640px.
  const largeImage = (url) => url.replace('/640w/', '/1000w/');

  // Make a cut-out's white background transparent and crop to the furniture, so pieces can stand
  // in front of each other and cast reflections. Only white that touches the photo's edges is
  // removed (a flood fill), so white-painted furniture keeps its colour.
  // limit: how pale a colourless pixel must be to count as background. Lower also takes the
  // photo's soft grey floor shadow, which is right for wood but would eat into white furniture.
  function clearBackground(px, w, h, limit = 243) {
    const white = (p) => {
      const r = px[p * 4], g = px[p * 4 + 1], b = px[p * 4 + 2];
      return Math.min(r, g, b) > limit && Math.max(r, g, b) - Math.min(r, g, b) < 12;
    };
    const seen = new Uint8Array(w * h);
    const stack = [];
    for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
    while (stack.length) {
      const p = stack.pop();
      if (seen[p]) continue;
      seen[p] = 1;
      if (!white(p)) continue;
      px[p * 4 + 3] = 0;
      const x = p % w;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (p >= w) stack.push(p - w);
      if (p < w * (h - 1)) stack.push(p + w);
    }
  }

  const transparent = new Map();
  // The pale floor shadow under a piece's feet: grey, colourless pixels in the bottom tenth of the
  // piece that touch the cleared background
  function clearFloor(px, w, h) {
    let top = h, bottom = -1, sat = 0, n = 0;
    for (let p = 0; p < w * h; p++) {
      if (!px[p * 4 + 3]) continue;
      sat += Math.max(px[p * 4], px[p * 4 + 1], px[p * 4 + 2]) - Math.min(px[p * 4], px[p * 4 + 1], px[p * 4 + 2]);
      n += 1;
      const y = (p - (p % w)) / w;
      if (y < top) top = y;
      bottom = y;
    }
    if (bottom < 0) return;
    const from = Math.round(bottom - (bottom - top) * 0.1);
    // Coloured furniture is never grey, so its shadow can be cleared down to a darker grey
    const light = sat / (n || 1) > 22 ? 140 : 196;
    const pale = (p) => {
      const r = px[p * 4], g = px[p * 4 + 1], b = px[p * 4 + 2];
      return px[p * 4 + 3] && Math.max(r, g, b) - Math.min(r, g, b) < 10 && r * 0.3 + g * 0.59 + b * 0.11 > light;
    };
    const stack = [];
    for (let y = from; y <= bottom; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (!pale(p)) continue;
        const near = [p - 1, p + 1, p - w, p + w].some((q) => q >= 0 && q < w * h && !px[q * 4 + 3]);
        if (near) stack.push(p);
      }
    }
    while (stack.length) {
      const p = stack.pop();
      if (!pale(p)) continue;
      px[p * 4 + 3] = 0;
      const x = p % w;
      const y = (p - x) / w;
      if (y < from) continue;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (y > from) stack.push(p - w);
      if (y < bottom) stack.push(p + w);
    }
  }
  function withoutBackground(url) {
    if (!transparent.has(url)) {
      transparent.set(url, new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, w, h);
            const px = data.data;
            // Already cut out (a transparent image)? Then its own edges are the furniture's
            let cutOut = false;
            for (let p = 3; p < px.length; p += 4 * 97) if (px[p] < 250) { cutOut = true; break; }
            if (!cutOut) clearBackground(px, w, h);
            // Not white furniture? Then also clear the pale floor shadow around it
            let sum = 0, count = 0;
            for (let p = 0; p < w * h; p += 7) {
              if (!px[p * 4 + 3]) continue;
              sum += px[p * 4] * 0.3 + px[p * 4 + 1] * 0.59 + px[p * 4 + 2] * 0.11;
              count += 1;
            }
            if (!cutOut && count && sum / count < 196) clearBackground(px, w, h, 214);
            if (!cutOut) clearFloor(px, w, h);
            // Soften the outline: light pixels next to the removed background fade out
            for (let p = w; p < w * (h - 1); p++) {
              if (px[p * 4 + 3] === 0) continue;
              if (px[(p - 1) * 4 + 3] && px[(p + 1) * 4 + 3] && px[(p - w) * 4 + 3] && px[(p + w) * 4 + 3]) continue;
              const light = Math.min(px[p * 4], px[p * 4 + 1], px[p * 4 + 2]);
              if (light > 215) px[p * 4 + 3] = Math.max(0, Math.min(255, (255 - light) * 6));
            }
            // Crop to the furniture itself, so the layout numbers are where its edges and feet are
            let minX = w, minY = h, maxX = -1, maxY = -1;
            for (let p = 0; p < w * h; p++) {
              if (px[p * 4 + 3] < 24) continue;
              const x = p % w;
              const y = (p - x) / w;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
            if (maxX < 0) { resolve({ src: url, top: [0, 1] }); return; }
            const cw = maxX - minX + 1;
            const ch = maxY - minY + 1;
            // Where the top of the piece is across its width (for a bed seen from the front, the
            // headboard): the columns with something in the top 10% of the crop
            let topStart = cw, topEnd = -1;
            for (let y = minY; y < minY + ch * 0.1; y++) {
              for (let x = minX; x <= maxX; x++) {
                if (px[(y * w + x) * 4 + 3] < 24) continue;
                if (x - minX < topStart) topStart = x - minX;
                if (x - minX > topEnd) topEnd = x - minX;
              }
            }
            const out = document.createElement('canvas');
            out.width = cw;
            out.height = ch;
            out.getContext('2d').putImageData(data, -minX, -minY);
            resolve({ src: out.toDataURL('image/png'), top: topEnd < 0 ? [0, 1] : [topStart / cw, (topEnd + 1) / cw], aspect: cw / ch });
          } catch (e) {
            resolve({ src: url, top: [0, 1] });
          }
        };
        img.onerror = () => resolve({ src: url, top: [0, 1] });
        img.src = url;
      }));
    }
    return transparent.get(url);
  }

  const build = document.querySelector('.room-build');
  const studio = document.querySelector('[data-build-stage]');
  const studioSet = studio && studio.querySelector('[data-studio-set]');
  const studioName = studio && studio.querySelector('[data-set-title]');
  const setsBox = document.querySelector('[data-build-sets]');
  const cta = document.querySelector('[data-build-cta]');
  const totalBox = document.querySelector('[data-set-total]');
  let sets = [];
  let current = null;

  // Finish code from the SKU ending (…-BLEU, …-BLANC), so a collection sold in two finishes
  // never mixes them in one set.
  const finishOf = (p) => (p.sku.split('-').pop() || '').slice(0, 4).toUpperCase();
  const PIECE_WORDS = /^(\d|bed|beds|mirror|chest|dresser|nightstand|nighstand|headboard|storage|non|queen|king|cabinet|woven|electrified)/i;

  // The first of these products that has a straight-on photo (one supplied in js/data.js first)
  async function firstFront(list) {
    const supplied = list.find((p) => FRONT_PHOTOS[p.sku]);
    if (supplied) return supplied;
    for (const p of list) if (await frontPhoto(p)) return p;
    return null;
  }

  // The rest of a set's pieces, each the collection's own product with a straight-on photo. A
  // type with no straight-on photo is left out rather than shown at an angle.
  async function resolvePieces(set) {
    if (set.resolved) return;
    await Promise.all(SLOTS.filter((s) => s.type !== 'Beds').map(async (s) => {
      const piece = await firstFront(set.pool.filter((p) => p.type === s.type));
      if (piece) set.pieces[s.type] = piece;
    }));
    set.resolved = true;
  }

  async function findSets(products) {
    const groups = new Map();
    products.forEach((p) => {
      if (!p.collection || !p.image || !SLOTS.some((s) => s.type === p.type)) return;
      const key = `${p.collection}|${finishOf(p)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });

    // Pieces whose finish code has no bed of its own (Islamorada's mirror is "…-BLANC") belong
    // with every set of their collection
    const strays = new Map();
    groups.forEach((list, key) => {
      if (list.some((p) => p.type === 'Beds')) return;
      const collection = key.split('|')[0];
      strays.set(collection, (strays.get(collection) || []).concat(list));
    });

    const candidates = await Promise.all(Array.from(groups.entries()).map(async ([key, list]) => {
      const collection = key.split('|')[0];
      // Everything in the studio is photographed straight on, so the bed must have a front photo
      const bed = await firstFront(list.filter((p) => p.type === 'Beds'));
      if (!bed) return null;
      const pool = list.concat(strays.get(collection) || []);
      // The word after the collection name, if it is a finish ("Monaco Bleu 5 Drawer Chest" -> Bleu)
      const word = (list[0].name.slice(collection.length).trim().split(/\s+/)[0] || '');
      const finish = /^[A-Z][a-z]+$/.test(word) && !PIECE_WORDS.test(word) ? word : '';
      return {
        collection, code: key.split('|')[1], finish, pool, straight: true,
        pieces: { Beds: bed },
        filled: SLOTS.filter((s) => pool.some((p) => p.type === s.type)).length
      };
    }));

    // Every collection with a bed is a set (the studio shows whichever other pieces it has). When a
    // collection comes in two finishes that its product names can't tell apart, keep only its most
    // complete set.
    const usable = candidates
      .filter(Boolean)
      .sort((a, b) => b.filled - a.filled || a.collection.localeCompare(b.collection));
    const seen = new Map();
    const result = [];
    usable.forEach((c) => {
      const others = seen.get(c.collection) || [];
      if (others.length && (!c.finish || others.some((o) => !o.finish))) return;
      others.push(c);
      seen.set(c.collection, others);
      result.push(c);
    });
    result.forEach((c) => { c.name = c.finish && seen.get(c.collection).length > 1 ? `${c.collection} ${c.finish}` : c.collection; });
    return result;
  }

  async function showSet(set, animate) {
    current = set;
    await resolvePieces(set);
    if (current !== set) return;
    // Straight-on when the bed has a front view (set.straight), otherwise the angled catalogue shot
    const layout = set.straight ? STRAIGHT : SLOTS;
    const images = {};
    await Promise.all(layout.map(async (s) => {
      const p = set.pieces[s.type];
      if (!p) return;
      const front = set.straight ? await frontPhoto(p) : null;
      images[s.type] = await withoutBackground(front || largeImage(p.image));
    }));
    if (current !== set) return; // another collection was picked meanwhile

    // Straight on: every piece at its real size (js/data.js pieceSizes, in inches). The headboard
    // sits in the middle with a nightstand against each side, the dresser (mirror on top) to the
    // left and the chest to the right; then the whole row is scaled to fit the studio and centred.
    const xs = {};
    const widths = {};
    if (set.straight && images.Beds) {
      const inches = (type) => {
        const p = set.pieces[type];
        return p ? (SIZES[p.sku] || SIZE_DEFAULTS[type]) : 0;
      };
      const [hs, he] = images.Beds.top;
      const hw = inches('Beds');
      const bedW = hw / Math.max(he - hs, 0.3); // the whole photo, bedding and footboard included
      const bedX = (0.5 - (hs + he) / 2) * bedW; // its centre, from the headboard's centre
      const sw = inches('Nightstands');
      const dw = inches('Dressers');
      const cw = inches('Chests');
      const GAP = 10;
      // A nightstand each side of the bed, against the headboard but clear of the footboard and
      // bedding (the bed's widest point), so none of it is hidden
      const standL = Math.min(-hw / 2 - sw / 2 + 1, bedX - bedW / 2 - sw / 2 - 2);
      const standR = Math.max(hw / 2 + sw / 2 - 1, bedX + bedW / 2 + sw / 2 + 2);
      const dresserX = (sw ? standL - sw / 2 : bedX - bedW / 2) - GAP - dw / 2;
      const chestX = (sw ? standR + sw / 2 : bedX + bedW / 2) + GAP + cw / 2;
      const left = Math.min(bedX - bedW / 2, dw ? dresserX - dw / 2 : Infinity, sw ? standL - sw / 2 : Infinity);
      const right = Math.max(bedX + bedW / 2, cw ? chestX + cw / 2 : -Infinity, sw ? standR + sw / 2 : -Infinity);
      // % of the studio's width per inch: as large as fits, with the headboard no wider than before
      const k = Math.min(HEADBOARD_W / hw, 94 / (right - left));
      const at = (x) => 50 + (x - (left + right) / 2) * k;
      widths.Beds = bedW * k;
      xs.Beds = at(bedX);
      widths.Nightstands = sw * k;
      xs.standLeft = at(standL);
      xs.standRight = at(standR);
      widths.Dressers = dw * k;
      xs.Dressers = at(dresserX);
      widths.Mirrors = inches('Mirrors') * k;
      xs.Mirrors = dw ? at(dresserX) : at(standL);
      widths.Chests = cw * k;
      xs.Chests = at(chestX);
    }

    studioSet.innerHTML = layout.filter((s) => set.pieces[s.type]).map((s) => {
      const p = set.pieces[s.type];
      const o = ARRIVAL.indexOf(s.type);
      const piece = (x, withTag) => `
        <a href="${escapeHtml(p.url)}" class="room-piece" data-order="${o}" data-type="${s.type}"
           style="--x:${x}%;--b:${s.b}%;--w:${widths[s.type] || s.w}%;--d:${s.d};--o:${o};z-index:${s.z}" ${withTag ? '' : 'tabindex="-1" aria-hidden="true"'}>
          <img src="${escapeHtml(images[s.type].src)}" alt="${withTag ? escapeHtml(p.name) : ''}" draggable="false">
          ${withTag ? `<span class="room-tag${s.tag ? ` is-${s.tag}` : ''}">
            <span class="room-tag-type">${s.label}</span>
            <span class="room-tag-name">${escapeHtml(p.name.replace(new RegExp(`^${set.collection}\\s*`, 'i'), ''))}</span>
            ${p.price == null ? '' : `<span class="room-tag-price">${money(p.price, p.currency)}${s.pair ? ' <small>each</small>' : ''}</span>`}
          </span>` : ''}
        </a>`;
      return s.pair
        ? piece(xs.standLeft ?? s.x, false) + piece(xs.standRight ?? 100 - s.x, true)
        : piece(xs[s.type] ?? s.x, true);
    }).join('');

    // Stand the mirror on top of the dresser once the dresser photo has its height
    const dresser = studioSet.querySelector('.room-piece[data-type="Dressers"] img');
    const mirror = studioSet.querySelector('.room-piece[data-type="Mirrors"]');
    if (dresser && mirror) {
      const place = () => {
        const slot = layout.find((s) => s.type === 'Dressers');
        const top = slot.b + (dresser.offsetHeight / studioSet.offsetHeight) * 100 - 1.5;
        mirror.style.setProperty('--b', `${top.toFixed(1)}%`);
      };
      if (dresser.complete) place(); else dresser.addEventListener('load', place, { once: true });
    }

    // The collection's name, huge, behind the furniture: its letters sweep in on every change
    let i = 0;
    studioName.innerHTML = Array.from(set.name).map((ch) =>
      (ch === ' ' ? ' ' : `<span style="--li:${i++}">${escapeHtml(ch)}</span>`)).join('');
    studioName.classList.remove('is-in');
    void studioName.offsetWidth; // restart the animation
    studioName.classList.add('is-in');

    studio.classList.toggle('is-swapping', Boolean(animate));
    setsBox.querySelectorAll('[data-set]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.set === set.name)));
    // Count what's in the room: a pair of nightstands is two pieces
    const shown = layout.filter((s) => set.pieces[s.type]).flatMap((s) => (s.pair ? [set.pieces[s.type], set.pieces[s.type]] : [set.pieces[s.type]]));
    const total = shown.reduce((sum, p) => sum + (p.price || 0), 0);
    if (totalBox) totalBox.textContent = `${shown.length} pieces${total ? ` · ${money(total)} together` : ''}`;
    if (cta) {
      cta.href = shopUrl({ collection: set.collection });
      cta.querySelector('[data-set-name]').textContent = set.name;
    }
  }

  // Pinned (and assembled by scrolling) only on wide screens with motion; otherwise it's complete.
  let pinned = false;
  function measure() {
    pinned = Boolean(build) && motion && wide.matches;
    if (build) build.classList.toggle('is-pinned', pinned);
  }

  // 0 when the section reaches the top, 1 when it is about to scroll away.
  function buildProgress() {
    if (!pinned) return 1;
    const r = build.getBoundingClientRect();
    const headerH = siteHeader ? siteHeader.offsetHeight : 0;
    const sticky = build.querySelector('.room-build-sticky');
    const travel = build.offsetHeight - sticky.offsetHeight;
    return clamp((headerH - r.top) / (travel || 1), 0, 1);
  }

  function paintBuild() {
    if (!current || !studioSet) return;
    const pieces = studioSet.querySelectorAll('.room-piece');
    // Pieces arrive in ARRIVAL order (a pair of nightstands together); a missing type is skipped.
    // The first (the bed) is already standing when the page opens, so the studio is never empty.
    const orders = Array.from(new Set(Array.from(pieces).map((x) => Number(x.dataset.order)))).sort((a, b) => a - b);
    const n = orders.length;
    const at = 1 + buildProgress() * (n - 0.2); // how many have arrived (fractional while arriving)
    pieces.forEach((el) => {
      el.style.setProperty('--t', clamp(at - orders.indexOf(Number(el.dataset.order)), 0, 1).toFixed(3));
    });
    build.classList.toggle('is-complete', at >= n + 0.2);
  }

  // Depth: the mouse moves the pieces at the front more than those at the back, and the
  // spotlight follows it. Eased every frame so it glides.
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (studio && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    build.addEventListener('pointermove', (e) => {
      const r = studio.getBoundingClientRect();
      pointer.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      pointer.ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    });
    build.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });
  }
  function paintDepth() {
    if (!studio) return;
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    studio.style.setProperty('--mx', pointer.x.toFixed(3));
    studio.style.setProperty('--my', pointer.y.toFixed(3));
  }

  if (setsBox) {
    setsBox.addEventListener('click', (e) => {
      const b = e.target.closest('[data-set]');
      const set = b && sets.find((s) => s.name === b.dataset.set);
      if (set && set !== current) pickSet(set);
    });
  }

  /* ---------- A night in your bedroom: the clock and the sky ---------- */

  const story = document.querySelector('[data-story]');
  const chapters = story ? Array.from(story.querySelectorAll('[data-chapter]')) : [];
  const clockTime = story && story.querySelector('[data-clock]');
  const clockAmPm = story && story.querySelector('[data-ampm]');
  // Each chapter's data-time ("21:00"), in minutes, counting on past midnight so the night runs forward
  const times = [];
  chapters.forEach((c, i) => {
    const [h, m] = (c.dataset.time || '0:0').split(':').map(Number);
    let t = h * 60 + m;
    while (i && t < times[i - 1]) t += 24 * 60;
    times.push(t);
  });

  function paintStory() {
    if (!story) return;
    const vh = window.innerHeight;
    const r = story.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;

    // The clock reads each chapter's time as that chapter reaches the middle of the screen,
    // and runs on smoothly in between.
    const centres = chapters.map((c) => { const b = c.getBoundingClientRect(); return b.top + b.height / 2; });
    let t = times[0];
    for (let i = 0; i < chapters.length; i++) {
      if (centres[i] <= vh / 2) t = times[i];
      if (centres[i] <= vh / 2 && i + 1 < chapters.length && centres[i + 1] > vh / 2) {
        t = times[i] + (times[i + 1] - times[i]) * ((vh / 2 - centres[i]) / (centres[i + 1] - centres[i]));
      }
    }
    const minutes = Math.round(t / 5) * 5 % (24 * 60);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (clockTime) clockTime.textContent = `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
    if (clockAmPm) clockAmPm.textContent = h < 12 ? 'am' : 'pm';

    // The sky: the chapter in the middle of the screen sets it
    let active = chapters[0];
    chapters.forEach((c) => { if (c.getBoundingClientRect().top < vh * 0.55) active = c; });
    if (active && story.dataset.sky !== active.dataset.sky) story.dataset.sky = active.dataset.sky;
    chapters.forEach((c) => c.classList.toggle('is-active', c === active));
  }

  // Products for each chapter: data-chapter-products="Nightstands" (or several, comma-separated),
  // data-prefer="power" puts pieces with built-in power first.
  async function renderChapters(products) {
    await Promise.all(Array.from(document.querySelectorAll('[data-chapter-products]')).map(async (box) => {
      const typesWanted = box.dataset.chapterProducts.split(',').map((t) => t.trim());
      let list = products.filter((p) => typesWanted.includes(p.type));
      if (box.dataset.prefer === 'power') list = list.filter((p) => POWER.test(p.name)).concat(list.filter((p) => !POWER.test(p.name)));
      // Mix the types, and one piece per collection, so the row shows the range
      const byType = typesWanted.map((t) => list.filter((p) => p.type === t));
      const mixed = [];
      for (let i = 0; mixed.length < list.length; i++) {
        byType.forEach((l) => { if (l[i]) mixed.push(l[i]); });
        if (byType.every((l) => i >= l.length)) break;
      }
      const usedCollections = new Set();
      const varied = mixed.filter((p) => !usedCollections.has(p.collection) && usedCollections.add(p.collection)).concat(mixed);
      const picks = await cutouts(Array.from(new Set(varied)), 4);
      box.innerHTML = picks.map((p) => `
        <a href="${escapeHtml(p.url)}" class="room-card">
          <span class="room-card-plate"><img src="${escapeHtml(p.image)}" alt="" loading="lazy"></span>
          <span class="room-card-name">${escapeHtml(p.name)}</span>
          <span class="room-card-price">${p.price == null ? 'Price on request' : money(p.price, p.currency)}</span>
        </a>`).join('');
    }));
  }

  /* ---------- Shop by piece ---------- */

  const piecesBox = document.querySelector('[data-pieces]');
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  async function renderPieces(products) {
    if (!piecesBox) return;
    const groups = new Map();
    products.forEach((p) => {
      if (!p.type || ['Other', 'Accessories', 'Bundles & Sets'].includes(p.type)) return;
      if (!groups.has(p.type)) groups.set(p.type, []);
      groups.get(p.type).push(p);
    });
    const types = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
    const tiles = await Promise.all(types.map(async ([type, list]) => ({ type, count: list.length, pick: await firstCutout(list) })));
    piecesBox.innerHTML = tiles.map((t, i) => `
      <a href="${escapeHtml(shopUrl({ type: t.type }))}" class="room-tile" style="--i:${i}">
        <span class="room-tile-media">${t.pick ? `<img src="${escapeHtml(t.pick.image)}" alt="" loading="lazy">` : ''}</span>
        <span class="room-tile-name">${escapeHtml(t.type)}</span>
        <span class="room-tile-count">${t.count} ${t.count === 1 ? 'piece' : 'pieces'}</span>
        <span class="room-tile-arrow">${ARROW}</span>
      </a>`).join('');
  }

  /* ---------- Pick your mood: collections fanned out like a hand of cards ---------- */

  const fan = document.querySelector('[data-fan]');
  const FAN_COLORS = ['#e9e1d4', '#dde5e8', '#efe2d4', '#e3e0ea', '#e7e4d9', '#f1e6db', '#dde4dc'];
  let roomProducts = [];

  // The products in a set's collection (only its own finish when the collection comes in two)
  function setProducts(set) {
    const twoFinishes = sets.filter((x) => x.collection === set.collection).length > 1;
    return roomProducts.filter((p) => p.collection === set.collection && (!twoFinishes || finishOf(p) === set.code));
  }

  // The bed on a collection's card: its made-up, straight-on photo (js/data.js frontPhotos)
  const bedCard = (p) => FRONT_PHOTOS[p.sku] || p.image;

  // Spread the hand to fit the screen however many cards it holds: how far apart the cards sit,
  // and how much each one tilts
  function spreadFan() {
    const n = fan.children.length;
    const card = fan.firstElementChild;
    if (n < 2 || !card) return;
    fan.classList.toggle('is-full', n > 8);
    const half = (n - 1) / 2;
    const rot = Math.min(6, 24 / (n - 1));
    // Each card turns about a point below it (transform-origin 50% 130%), which carries the outer
    // ones further out: leave room for that
    const swing = card.offsetHeight * 1.3 * Math.sin((half * rot * Math.PI) / 180);
    const room = fan.clientWidth / 2 - card.offsetWidth / 2 - 24 - swing;
    fan.style.setProperty('--fan-spread', `${Math.min(156, room / half).toFixed(1)}px`);
    fan.style.setProperty('--fan-rot', `${rot.toFixed(2)}deg`);
  }

  // One card per bed collection; each opens its own page
  function renderFan() {
    if (!fan) return;
    const shown = sets;
    // The middle card sits on top, the others fan out behind it to either side
    const mid = (shown.length - 1) / 2;
    fan.style.setProperty('--n', shown.length);
    fan.innerHTML = shown.map((c, i) => {
      const count = setProducts(c).length;
      return `
      <a href="bedroom-collection.html?set=${encodeURIComponent(c.name)}" data-set="${escapeHtml(c.name)}" class="fan-card${i > mid ? ' is-right' : ''}" style="--i:${i};--k:${(i - mid).toFixed(1)};--card:${FAN_COLORS[i % FAN_COLORS.length]};z-index:${Math.round(20 - Math.abs(i - mid) * 2)}">
        <span class="fan-card-media"><img src="${escapeHtml(bedCard(c.pieces.Beds))}" alt="" loading="lazy"></span>
        <span class="fan-card-name">${escapeHtml(c.name)}</span>
        <span class="fan-card-count">${count} bedroom ${count === 1 ? 'piece' : 'pieces'}</span>
      </a>`;
    }).join('');
    spreadFan();
    window.addEventListener('resize', spreadFan);
    // Deal the cards out when the fan scrolls into view
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        fan.classList.add('is-dealt');
        // Once dealt, hovering should react straight away rather than with the dealing delay
        setTimeout(() => fan.classList.add('is-settled'), 1800);
      }, { threshold: 0.35 });
      io.observe(fan);
    } else {
      fan.classList.add('is-dealt');
    }
  }

  // Show a collection: its bedroom in the studio, then every piece in it underneath. The address
  // keeps the collection, so the page can be shared or reloaded.
  async function pickSet(set) {
    renderSkus(set);
    const url = new URL(window.location.href);
    url.searchParams.set('set', set.name);
    history.replaceState(null, '', url);
    document.title = `${set.name} Bedroom | Lineage Collections`;
    // Bring the collection's button into view in the row
    const btn = Array.from(setsBox.querySelectorAll('[data-set]')).find((b) => b.dataset.set === set.name);
    if (btn) setsBox.scrollTo({ left: btn.offsetLeft - (setsBox.clientWidth - btn.offsetWidth) / 2, behavior: 'smooth' });
    if (set !== current) await showSet(set, true);
    paintBuild();
  }

  /* ---------- Every piece in the collection ---------- */

  const skus = document.querySelector('[data-skus]');
  const TYPE_ORDER = ['Beds', 'Nightstands', 'Dressers', 'Mirrors', 'Chests'];
  const rank = (t) => (TYPE_ORDER.indexOf(t) + 1 || TYPE_ORDER.length + 1);
  let skuList = [];

  function renderSkus(set) {
    if (!skus) return;
    skuList = setProducts(set).slice().sort((a, b) => rank(a.type) - rank(b.type) || (a.price || 0) - (b.price || 0));
    skus.querySelector('[data-skus-name]').textContent = set.name;
    skus.querySelector('[data-skus-count]').textContent = `${skuList.length} ${skuList.length === 1 ? 'piece' : 'pieces'}`;
    const grid = skus.querySelector('[data-skus-grid]');
    grid.innerHTML = skuList.map((p, i) => `
      <article class="room-sku" style="--i:${i}">
        <a href="${escapeHtml(p.url)}" class="room-sku-media">${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">` : ''}</a>
        <p class="room-sku-type">${escapeHtml(p.type || '')}</p>
        <h3 class="room-sku-name"><a href="${escapeHtml(p.url)}">${escapeHtml(p.name)}</a></h3>
        <div class="room-sku-foot">
          <span class="room-sku-price">${p.price == null ? 'Price on request' : money(p.price, p.currency)}</span>
          <button type="button" class="room-sku-add" data-add="${escapeHtml(p.sku)}"><span class="room-sku-add-text">Add to cart</span><span class="room-sku-added-text">Added</span></button>
        </div>
      </article>`).join('');
    // Deal the cards in
    grid.classList.remove('is-in');
    void grid.offsetWidth;
    grid.classList.add('is-in');
  }
  if (skus) {
    skus.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      const p = add && skuList.find((x) => x.sku === add.dataset.add);
      if (!p || !window.LineageCart) return;
      window.LineageCart.add(p, 1);
      add.classList.add('is-added');
      setTimeout(() => add.classList.remove('is-added'), 1800);
    });
  }

  // Shared with the other room pages (js/living.js): photo helpers
  window.LineageRoom = { cutouts, firstCutout, frontPhoto, withoutBackground, largeImage };

  /* ---------- Load ---------- */

  async function load() {
    const bc = window.LineageBC;
    if (!Catalog || !bc || !bc.enabled) { page.classList.add('is-offline'); return; }
    try {
      const raw = await bc.allProducts();
      const products = raw.map(Catalog.classify).filter((p) => p.room === room && !/display/i.test(p.name));
      const counts = { pieces: products.length, power: products.filter((p) => POWER.test(p.name)).length };
      document.querySelectorAll('[data-count]').forEach((el) => { el.textContent = counts[el.dataset.count] ?? el.textContent; });
      roomProducts = products;
      renderPieces(products);
      renderChapters(products);
      if (!fan && !build) return;
      sets = await findSets(products);
      if (!sets.length) { if (build) build.hidden = true; return; }
      renderFan();
      if (!build) return;
      setsBox.innerHTML = sets.map((s) => `<button type="button" class="room-set" data-set="${escapeHtml(s.name)}" role="tab" aria-selected="false">${escapeHtml(s.name)}</button>`).join('');
      const wanted = new URLSearchParams(window.location.search).get('set');
      await pickSet(sets.find((x) => x.name === wanted) || sets[0]);
    } catch (err) {
      console.warn('Room page: could not load products.', err);
      page.classList.add('is-offline');
    }
  }
  load();

  measure();
  window.addEventListener('resize', measure);
  wide.addEventListener('change', measure);
  (function frame() {
    if (pinned) paintBuild();
    paintDepth();
    paintStory();
    requestAnimationFrame(frame);
  })();
})();
