/*
 * Lineage Collections — cabinet beds page (cabinet-beds.html). Styles: "Cabinet beds page" in
 * css/styles.css. Photos, footage and copy are chosen in js/data.js (cabinetBedsPage); names and
 * prices are live.
 *
 *   [data-cb-hero]     hero: the living room (day) is cut in two; as you scroll the top half lifts
 *                      like the cabinet's lid and the bottom folds towards you like the bed coming
 *                      out, revealing the guest room (night) behind
 *   [data-film]        real footage of the cabinet opening, played forwards and back by scrolling,
 *                      with chapters, a timecode and a progress bar
 *   [data-day]         one cabinet through 24 hours: the photos move sideways, a clock runs, and
 *                      the page goes from day to night and back to morning
 *   [data-hidden]      hotspots on the opened cabinet; each opens a lens on a close-up
 *   [data-finishes]    both finishes with live prices and Add to cart
 */
(function () {
  'use strict';

  const page = document.querySelector('.cb-page');
  if (!page) return;

  const Catalog = window.LineageCatalog;
  const CONFIG = (window.LINEAGE_DATA || {}).cabinetBedsPage || {};
  const motion = document.documentElement.classList.contains('motion');
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);
  // How far through a pinned section the page has scrolled (0 → 1)
  const progressOf = (el) => {
    const travel = el.offsetHeight - window.innerHeight;
    return clamp(-el.getBoundingClientRect().top / (travel || 1), 0, 1);
  };
  const onScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > -100 && r.top < window.innerHeight + 100;
  };

  /* ---------- Hero: the room unfolds ---------- */

  const hero = document.querySelector('[data-cb-hero]');
  if (hero && CONFIG.hero) {
    hero.style.setProperty('--day', `url("${CONFIG.hero.day}")`);
    hero.querySelector('[data-night]').src = CONFIG.hero.night;
  }
  function paintHero() {
    if (!hero) return;
    const p = motion ? progressOf(hero) : 0;
    const t = ease(clamp((p - 0.08) / 0.62, 0, 1));
    hero.style.setProperty('--fold', t.toFixed(4));
    hero.classList.toggle('is-night', t > 0.5);
  }

  /* ---------- Real footage ---------- */

  const film = document.querySelector('[data-film]');
  const filmVideo = film && film.querySelector('[data-film-video]');
  const filmChapter = film && film.querySelector('[data-film-chapter]');
  const filmTime = film && film.querySelector('[data-film-time]');
  const FILM = CONFIG.film || {};
  const chapters = FILM.chapters || [];
  let filmDur = 20.6;
  let filmAt = 0;
  let filmCh = -1;
  let filmBar = [];
  if (film && FILM.src) {
    filmVideo.poster = FILM.poster || '';
    filmVideo.src = FILM.src;
    filmVideo.addEventListener('loadedmetadata', () => { filmDur = filmVideo.duration || filmDur; buildBar(); });
    if (!motion) filmVideo.controls = true;
    // Some phones only show frames once the video has been played; start and stop it on first touch
    window.addEventListener('touchstart', () => {
      const pr = filmVideo.play();
      if (pr && pr.then) pr.then(() => filmVideo.pause()).catch(() => {});
    }, { once: true, passive: true });
    buildBar();
  }
  function buildBar() {
    const bar = film.querySelector('[data-film-bar]');
    bar.innerHTML = chapters.map((c, i) => {
      const end = i + 1 < chapters.length ? chapters[i + 1].at : filmDur;
      return `<li style="flex:${(end - c.at).toFixed(2)}"><i></i><span>${escapeHtml(c.title.replace(/\.$/, ''))}</span></li>`;
    }).join('');
    filmBar = Array.from(bar.children).map((li, i) => ({ fill: li.querySelector('i'), li, from: chapters[i].at, to: i + 1 < chapters.length ? chapters[i + 1].at : filmDur }));
  }
  const pad = (n) => String(Math.floor(n)).padStart(2, '0');
  function paintFilm() {
    if (!film || !onScreen(film) || !motion) return;
    const p = progressOf(film);
    film.style.setProperty('--p', p.toFixed(4));
    const target = clamp((p - 0.07) / 0.86, 0, 1) * filmDur;
    // Ease towards the scroll position, so the footage glides rather than jumps
    filmAt += (target - filmAt) * 0.22;
    if (Math.abs(filmAt - target) < 0.005) filmAt = target;
    if (filmVideo.readyState >= 1 && !filmVideo.seeking && Math.abs(filmVideo.currentTime - filmAt) > 0.02) {
      filmVideo.currentTime = Math.min(filmAt, filmDur - 0.05);
    }
    let ch = 0;
    chapters.forEach((c, i) => { if (filmAt >= c.at) ch = i; });
    if (ch !== filmCh) {
      filmCh = ch;
      filmChapter.innerHTML = `<span>${escapeHtml(chapters[ch].title)}</span>`;
      filmBar.forEach((b, i) => b.li.classList.toggle('is-on', i === ch));
    }
    filmTime.textContent = `00:${pad(filmAt)} / 00:${pad(filmDur)}`;
    filmBar.forEach((b) => { b.fill.style.transform = `scaleX(${clamp((filmAt - b.from) / (b.to - b.from), 0, 1).toFixed(4)})`; });
  }

  /* ---------- 24 hours ---------- */

  const day = document.querySelector('[data-day]');
  const dayTrack = day && day.querySelector('[data-day-track]');
  const clock = day && day.querySelector('[data-clock]');
  const BEATS = CONFIG.day || [];
  // The colour of the page at each moment: daylight, golden hour, dusk, night, morning
  const SKY = { '07:30': '#f2ede4', '13:00': '#f5f0e7', '18:30': '#ead7bb', '21:45': '#2b3650', '22:30': '#111722', '08:00': '#efe9df' };
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  let dayCards = [];
  let dayTravel = 0;
  let dayActive = -1;
  if (day) {
    dayTrack.innerHTML = BEATS.map((b, i) => `
      <article class="cb2-beat${b.night ? ' is-night' : ''}" style="--i:${i}">
        <div class="cb2-beat-media"><img src="${escapeHtml(b.image)}" alt="" decoding="async"></div>
        <p class="cb2-beat-time">${escapeHtml(formatTime(toMin(b.time)).text)} ${escapeHtml(formatTime(toMin(b.time)).half)}</p>
        <h3 class="cb2-beat-title display">${escapeHtml(b.title)}</h3>
        <p class="cb2-beat-text">${escapeHtml(b.text)}</p>
      </article>`).join('');
    dayCards = Array.from(dayTrack.children).map((el) => ({ el, img: el.querySelector('img') }));
  }
  function formatTime(min) {
    const m = ((Math.round(min) % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60);
    return { text: `${h % 12 || 12}:${String(m % 60).padStart(2, '0')}`, half: h < 12 ? 'am' : 'pm' };
  }
  // The section is as tall as the track is wide, so scrolling down moves it sideways
  function sizeDay() {
    if (!day || !motion) return;
    dayTravel = Math.max(0, dayTrack.scrollWidth - window.innerWidth);
    day.style.height = `${dayTravel + window.innerHeight}px`;
  }
  function paintDay() {
    if (!day || !BEATS.length || !onScreen(day)) return;
    const p = motion ? progressOf(day) : 0;
    if (motion) dayTrack.style.transform = `translate3d(${(-p * dayTravel).toFixed(1)}px, 0, 0)`;
    // Which moment is in the middle of the screen (fractional, so the clock runs between them)
    const mid = window.innerWidth / 2;
    let f = 0;
    const centers = dayCards.map((c) => { const r = c.el.getBoundingClientRect(); return r.left + r.width / 2; });
    for (let i = 0; i < centers.length - 1; i += 1) {
      if (mid >= centers[i]) f = i + clamp((mid - centers[i]) / (centers[i + 1] - centers[i]), 0, 1);
    }
    const i0 = Math.min(Math.floor(f), BEATS.length - 1);
    const i1 = Math.min(i0 + 1, BEATS.length - 1);
    const t = f - i0;
    let m0 = toMin(BEATS[i0].time);
    let m1 = toMin(BEATS[i1].time);
    if (m1 < m0) m1 += 1440;
    const now = formatTime(lerp(m0, m1, t));
    clock.innerHTML = `${now.text}<small>${now.half}</small>`;
    // The page's colour follows the clock
    const a = hex(SKY[BEATS[i0].time] || '#f2ede4');
    const b = hex(SKY[BEATS[i1].time] || '#f2ede4');
    const rgb = a.map((v, k) => Math.round(lerp(v, b[k], ease(t))));
    const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    day.style.setProperty('--sky', `rgb(${rgb.join(',')})`);
    day.classList.toggle('is-dark', lum < 0.45);
    const active = Math.round(f);
    if (active !== dayActive) {
      dayActive = active;
      dayCards.forEach((c, k) => c.el.classList.toggle('is-on', k === active));
    }
    // The photos drift inside their frames as they pass
    dayCards.forEach((c, k) => {
      const d = clamp((centers[k] - mid) / window.innerWidth, -1, 1);
      c.img.style.transform = `translate3d(${(d * -8).toFixed(2)}%, 0, 0) scale(1.18)`;
    });
  }

  /* ---------- Hidden in plain sight ---------- */

  const hidden = document.querySelector('[data-hidden]');
  const FEATURES = CONFIG.features || [];
  let hiddenOn = -1;
  if (hidden) {
    const stage = hidden.querySelector('[data-hidden-stage]');
    hidden.querySelector('[data-hidden-img]').src = CONFIG.open || '';
    hidden.querySelector('[data-hidden-texts]').innerHTML = FEATURES.map((f, i) => `
      <div class="cb2-hidden-text" data-k="${i}">
        <h2 class="display">${escapeHtml(f.title)}</h2>
        <p>${escapeHtml(f.text)}</p>
      </div>`).join('');
    // Each lens sits across from its hotspot, towards the open side of the photo
    const lines = [];
    FEATURES.forEach((f, i) => {
      const lx = clamp(f.x + (f.x > 0.5 ? -0.3 : 0.3), 0.18, 0.82);
      const ly = clamp(f.y + (f.y > 0.5 ? -0.3 : 0.32), 0.18, 0.82);
      const bg = f.image
        ? `background-image:url('${escapeHtml(f.image)}');background-size:cover;background-position:center`
        : `background-image:url('${escapeHtml(CONFIG.open)}');background-size:340%;background-position:${(f.x * 100).toFixed(1)}% ${(f.y * 100).toFixed(1)}%`;
      stage.insertAdjacentHTML('beforeend', `
        <span class="cb2-spot" data-k="${i}" style="left:${f.x * 100}%;top:${f.y * 100}%"></span>
        <span class="cb2-lens" data-k="${i}" style="left:${lx * 100}%;top:${ly * 100}%;${bg}"></span>`);
      lines.push(`<line data-k="${i}" x1="${f.x * 100}" y1="${f.y * 100}" x2="${lx * 100}" y2="${ly * 100}" pathLength="1" vector-effect="non-scaling-stroke"></line>`);
    });
    const svg = hidden.querySelector('[data-hidden-lines]');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = lines.join('');
  }
  function paintHidden() {
    if (!hidden || !FEATURES.length || !onScreen(hidden)) return;
    const p = motion ? progressOf(hidden) : 0;
    const k = Math.min(FEATURES.length - 1, Math.floor(clamp((p - 0.04) / 0.9, 0, 0.9999) * FEATURES.length));
    if (k === hiddenOn) return;
    hiddenOn = k;
    hidden.querySelectorAll('[data-k]').forEach((el) => {
      const n = Number(el.dataset.k);
      el.classList.toggle('is-on', n === k);
      el.classList.toggle('is-past', n < k);
    });
    hidden.querySelector('[data-hidden-n]').textContent = `0${k + 1} / 0${FEATURES.length}`;
  }

  /* ---------- Choose your finish ---------- */

  const finishes = document.querySelector('[data-finishes]');
  function renderFinishes(bySku) {
    if (!finishes) return;
    finishes.innerHTML = (CONFIG.finishes || []).map((f, i) => {
      const p = bySku.get(f.sku);
      if (!p) return '';
      return `
        <article class="cb-finish" style="--i:${i}">
          <a href="${escapeHtml(p.url)}" class="cb-finish-media"><img src="${escapeHtml(f.image)}" alt="${escapeHtml(p.name)}" loading="lazy"></a>
          <p class="cb-finish-col">${escapeHtml(f.name)}</p>
          <h3 class="cb-finish-name"><a href="${escapeHtml(p.url)}">${escapeHtml(p.name)}</a></h3>
          <p class="cb-finish-price">${p.price == null ? 'Price on request' : money(p.price)}</p>
          <div class="cb-finish-actions">
            <button type="button" class="btn btn-brand" data-add="${escapeHtml(p.sku)}"><span class="btn-dot"></span><span class="cb-add-text">Add to cart</span><span class="cb-added-text">Added</span></button>
            <a href="${escapeHtml(p.url)}" class="cb-finish-view">View details &rarr;</a>
          </div>
        </article>`;
    }).join('');
    finishes.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (!add || !window.LineageCart) return;
      window.LineageCart.add(bySku.get(add.dataset.add), 1);
      add.classList.add('is-added');
      setTimeout(() => add.classList.remove('is-added'), 1800);
    });
  }

  /* ---------- Load ---------- */

  async function load() {
    const bc = window.LineageBC;
    if (!Catalog || !bc || !bc.enabled) return;
    try {
      const raw = await bc.allProducts();
      const bySku = new Map(raw.map(Catalog.classify).map((p) => [p.sku, p]));
      renderFinishes(bySku);
    } catch (err) {
      console.warn('Cabinet beds page: could not load products.', err);
    }
  }
  load();

  sizeDay();
  window.addEventListener('resize', sizeDay);
  window.addEventListener('load', sizeDay);
  (function frame() {
    paintHero();
    paintFilm();
    paintDay();
    paintHidden();
    requestAnimationFrame(frame);
  })();
})();
