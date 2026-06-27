/* =========================================================================
   401jK NFT Collection — app.js  (ES module; lightbox logic in lightbox.js)
   ========================================================================= */
import {
  isLive, wireTensor, setHolders,
  initLightbox, openLightboxFor, openLightboxFromHash, setLightboxData,
} from './lightbox.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  lines:   [],
  nfts:    [],
  lineById: new Map(),
  filter:  'all',
  visible: [],
};

/* ----------------------------------------------------------------- fetch */
async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

/* --------------------------------------------------------------- helpers */
const accentOf = (lineId) => state.lineById.get(lineId)?.accent || 'green';
const lineName  = (lineId) => state.lineById.get(lineId)?.name  || '';

function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }

/* ------------------------------------------------------------------ hero */
function renderReadout(data) {
  const el = $('#readout');
  if (!el) return;
  const artists = new Set(state.nfts.map((n) => n.artist)).size;
  el.innerHTML = `
    <span class="dot" aria-hidden="true"></span>
    <span><span class="lbl">pieces</span> <b class="g">${state.nfts.length}</b></span>
    <span><span class="lbl">series</span> <b class="o">${state.lines.length}</b></span>
    <span><span class="lbl">artists</span> <b class="c">${artists}</b></span>
    <span><span class="lbl">chain</span> <b class="p">${data.collection.chain}</b></span>
    <span><span class="lbl">raffle</span> <b class="y">monthly</b></span>
    <span><span class="lbl">mint</span> <b>01 / live</b></span>`;
}

/* ----------------------------------------------------------------- lines */
function renderLines() {
  const root = $('#lines-list');
  root.innerHTML = '';
  state.lines.forEach((line) => {
    const members = state.nfts.filter((n) => n.line === line.id);
    const strip = members.slice(0, 3);
    const row = document.createElement('article');
    row.className = 'line-row reveal';
    row.dataset.accent = line.accent;

    const left = document.createElement('div');
    left.innerHTML = `
      <div class="line-index">${String(line.id).padStart(2, '0')}<span class="of">series ${line.id} / ${state.lines.length}</span></div>
      <h3 class="line-name">${line.name}</h3>
      <div class="line-tagline">${line.tagline}</div>
      <div class="line-meta">
        <span class="by">artist&nbsp; <b>${line.artist}</b></span>
        <span>${members.length} pieces</span>
        <span>${line.aesthetic}</span>
      </div>
      <p class="line-desc">${line.description}</p>
      <div class="line-actions">
        <button class="btn-line act-browse" type="button">Browse series <span class="arr">&rarr;</span></button>
        <a class="btn-line act-me" role="button">View on Tensor</a>
      </div>`;
    left.querySelector('.act-browse').addEventListener('click', () => setFilter(String(line.id), true));
    wireTensor(left.querySelector('.act-me'), line.tensorUrl, 'View on Tensor');

    const right = document.createElement('div');
    right.className = 'line-strip';
    strip.forEach((n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Enlarge ${n.title}`);
      b.innerHTML = `<img src="${n.thumb}" alt="${escapeAttr(n.alt)}" loading="lazy" decoding="async">`;
      b.addEventListener('click', () => openLightboxFor(n.id, members));
      right.appendChild(b);
    });

    row.append(left, right);
    root.appendChild(row);
  });
}

/* --------------------------------------------------------------- filters */
function renderFilters() {
  const bar = $('#filters');
  bar.innerHTML = '';
  const make = (key, label, count) => {
    const b = document.createElement('button');
    b.className = 'filter';
    b.type = 'button';
    b.dataset.key = key;
    b.setAttribute('aria-pressed', String(state.filter === key));
    b.innerHTML = `${label}<span class="ct">${count}</span>`;
    b.addEventListener('click', () => setFilter(key));
    return b;
  };
  bar.appendChild(make('all', 'All', state.nfts.length));
  state.lines.forEach((l) => {
    const c = state.nfts.filter((n) => n.line === l.id).length;
    bar.appendChild(make(String(l.id), `L${l.id} ${l.name}`, c));
  });
  const spacer = document.createElement('span');
  spacer.className = 'filter-spacer';
  bar.appendChild(spacer);
  const count = document.createElement('span');
  count.className = 'filter-count';
  count.id = 'filter-count';
  bar.appendChild(count);
}

function setFilter(key, scroll = false) {
  state.filter = key;
  $$('#filters .filter').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.key === key)));
  renderGrid();
  if (scroll) document.getElementById('gallery').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ----------------------------------------------------------------- grid */
function renderGrid() {
  const grid = $('#grid');
  grid.innerHTML = '';
  state.visible = state.filter === 'all'
    ? state.nfts.slice()
    : state.nfts.filter((n) => String(n.line) === state.filter);

  const cnt = $('#filter-count');
  if (cnt) cnt.innerHTML = `<b>${state.visible.length}</b> shown`;

  if (!state.visible.length) {
    grid.innerHTML = '<p class="empty">No pieces match this filter.</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  state.visible.forEach((n) => {
    const tile = document.createElement('button');
    tile.className = 'tile';
    tile.type = 'button';
    tile.dataset.accent = accentOf(n.line);
    tile.setAttribute('aria-label', `Enlarge ${n.title}, ${lineName(n.line)}`);
    tile.innerHTML = `
      <div class="tile-img">
        <span class="tile-id">#${n.id}</span>
        <img src="${n.thumb}" alt="${escapeAttr(n.alt)}" loading="lazy" decoding="async">
      </div>
      <div class="tile-cap">
        <div class="tile-title">${n.title}</div>
        <div class="tile-line">Series ${n.line} &middot; ${n.artist}</div>
      </div>`;
    tile.addEventListener('click', () => openLightboxFor(n.id, state.visible));
    frag.appendChild(tile);
  });
  grid.appendChild(frag);
}

/* ---------------------------------------------------------------- raffle */
function renderRaffle(r) {
  const draft = $('#raffle-draft');
  if (r.status === 'placeholder') { draft.hidden = false; draft.textContent = 'Draft · official rules soon'; }
  else { draft.hidden = true; }
  $('#raffle-eyebrow').textContent = r.eyebrow || 'The Raffle';
  $('#raffle-title').textContent   = r.headline || '';
  $('#raffle-intro').textContent   = r.intro || '';

  const prizeEl = $('#raffle-prize');
  if (r.prizeDetail) {
    const faqUrl = r.raffleFaqUrl || null;
    const linkHtml = faqUrl
      ? `<a href="${faqUrl}" class="inline-link">Raffle FAQ</a>`
      : `<span class="inline-link soon" title="Coming soon">Raffle FAQ</span>`;
    prizeEl.innerHTML = `${r.prizeDetail} See the ${linkHtml} for full details.`;
    prizeEl.hidden = false;
  } else {
    prizeEl.hidden = true;
  }

  const steps = $('#steps');
  steps.innerHTML = '';
  (r.steps || []).forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'step reveal';
    el.innerHTML = `<div class="step-num">${String(i + 1).padStart(2, '0')}</div>
      <div><h3>${s.title}</h3><p>${s.body}</p></div>`;
    steps.appendChild(el);
  });
  const noteEl = $('#raffle-note');
  if (r.rulesNote) { noteEl.textContent = r.rulesNote; noteEl.hidden = false; }
  else { noteEl.hidden = true; }
}

/* --------------------------------------------------------------- winners */
function renderWinners(winnersData, raffle) {
  const winners = Array.isArray(winnersData) ? winnersData : (winnersData.winners || []);
  const root = $('#winners-body');
  root.innerHTML = '';

  if (!winners.length) {
    const dateLabel = raffle.firstDrawLabel || 'soon';
    const empty = document.createElement('div');
    empty.className = 'winners-empty reveal';
    empty.innerHTML = `
      <div class="stamp"><span class="pulse" aria-hidden="true"></span>Awaiting first draw</div>
      <h3>First winner drawn <span class="date">${dateLabel}</span>.</h3>
      <p>The wall of winners starts here. Every month from ${dateLabel}, the winning NFT and wallet get added here, with a link to the announcement and proof of prize pay-out. Watch this space.</p>`;
    root.appendChild(empty);
    return;
  }

  const sorted = winners.slice().sort((a, b) => String(b.month).localeCompare(String(a.month)));
  const tl = document.createElement('div');
  tl.className = 'timeline';
  sorted.forEach((w) => {
    const row = document.createElement('article');
    row.className = 'win reveal';
    const annLabel = w.platform === 'reddit' ? 'See announcement on Reddit' : 'See announcement on X';
    const actions = isLive(w.announcementUrl)
      ? `<a class="btn btn-outline btn-sm" href="${w.announcementUrl}" target="_blank" rel="noopener">${annLabel} <span class="arr">&#8599;</span></a>`
      : '';
    row.innerHTML = `
      <div class="win-when">${w.label || w.month}</div>
      <div>
        <div class="win-handle">${w.handle || 'Winner'}</div>
        ${w.prize ? `<div class="win-prize">Prize: ${w.prize}</div>` : ''}
        <div class="win-actions">${actions}</div>
        ${isLive(w.reactionEmbedUrl) ? `<div class="win-embed" data-embed="${w.platform || 'x'}" data-url="${w.reactionEmbedUrl}"></div>` : ''}
      </div>`;
    tl.appendChild(row);
  });
  root.appendChild(tl);
  hydrateEmbeds(root);
}

function hydrateEmbeds(scope) {
  const targets = $$('[data-embed]', scope);
  if (!targets.length) return;
  let needX = false, needReddit = false;
  targets.forEach((t) => {
    const url = t.dataset.url;
    if (t.dataset.embed === 'reddit') {
      needReddit = true;
      t.innerHTML = `<blockquote class="reddit-embed-bq" data-embed-height="316"><a href="${url}">View the reaction on Reddit</a></blockquote>`;
    } else {
      needX = true;
      t.innerHTML = `<blockquote class="twitter-tweet"><a href="${url}">View the reaction on X</a></blockquote>`;
    }
  });
  if (needX)      loadScriptOnce('https://platform.twitter.com/widgets.js');
  if (needReddit) loadScriptOnce('https://embed.reddit.com/widgets.js');
}

const loadedScripts = new Set();
function loadScriptOnce(src) {
  if (loadedScripts.has(src)) { window.twttr?.widgets?.load?.(); return; }
  loadedScripts.add(src);
  const s = document.createElement('script');
  s.src = src; s.async = true; s.charset = 'utf-8';
  document.body.appendChild(s);
}

/* ------------------------------------------------------------ chrome bits */
function initNav() {
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const burger = $('#hamburger');
  const drawer = $('#drawer');
  burger.addEventListener('click', () => {
    const open = drawer.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('#drawer a').forEach((a) => a.addEventListener('click', () => {
    drawer.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }));
}

function initCopy() {
  const btn = $('#copy-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const ca = $('#ca').textContent.trim();
    try { await navigator.clipboard.writeText(ca); }
    catch {
      const r = document.createRange();
      r.selectNode($('#ca'));
      getSelection().removeAllRanges();
      getSelection().addRange(r);
      document.execCommand('copy');
      getSelection().removeAllRanges();
    }
    const label = $('#copy-label');
    const prev = label.textContent;
    label.textContent = 'Copied';
    btn.classList.add('copied');
    setTimeout(() => { label.textContent = prev; btn.classList.remove('copied'); }, 1600);
  });
}

function initReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------ boot */
async function init() {
  initNav();
  initCopy();
  initLightbox();
  try {
    const [collection, raffle, winners, holdersData] = await Promise.all([
      loadJSON('data/collection.json'),
      loadJSON('data/raffle.json'),
      loadJSON('data/winners.json'),
      loadJSON('data/holders.json').catch(() => null),
    ]);
    state.lines   = collection.lines;
    state.nfts    = collection.nfts;
    state.lineById = new Map(collection.lines.map((l) => [l.id, l]));

    setLightboxData(state.lineById);
    if (holdersData?.holders) setHolders(holdersData.holders);

    renderReadout(collection);
    wireTensor($('#hero-me'), collection.collection.tensorUrl, 'View on Tensor');
    $('#hero-intro').textContent = collection.collection.intro;
    renderLines();
    renderFilters();
    renderGrid();
    renderRaffle(raffle);
    renderWinners(winners, raffle);
    openLightboxFromHash(state.nfts);
  } catch (err) {
    console.error('Failed to load collection data', err);
    const grid = $('#grid');
    if (grid) grid.innerHTML = `<p class="empty">Could not load the collection. ${escapeAttr(err.message)}</p>`;
  } finally {
    requestAnimationFrame(initReveal);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
