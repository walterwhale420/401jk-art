/* =========================================================================
   401jK — lightbox.js
   Shared lightbox module. Single source of truth used by the main gallery
   (app.js) and NFT Watch (/nft-watch/). Any edit here applies to both.
   ========================================================================= */

export const PLACEHOLDER = 'PLACEHOLDER';

export const isLive = (url) =>
  typeof url === 'string' && url && url !== PLACEHOLDER && /^https?:\/\//i.test(url);

export function wireMagicEden(el, url, baseLabel) {
  if (isLive(url)) {
    el.setAttribute('href', url);
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
    el.removeAttribute('aria-disabled');
    el.innerHTML = `${baseLabel} <span class="arr">&#8599;</span>`;
  } else {
    el.setAttribute('aria-disabled', 'true');
    el.setAttribute('href', '#');
    el.setAttribute('title', 'MagicEden listing coming soon');
    el.innerHTML = `${baseLabel} <span style="opacity:.6">&middot; soon</span>`;
    el.addEventListener('click', (e) => e.preventDefault());
  }
}

const ARTIST_X = {
  'Shadow':       'https://x.com/OthersideShad0w',
  'Walter Whale': 'https://x.com/Walter_Whale420',
};

const state = {
  lineById:  new Map(),
  visible:   [],
  lbIndex:   -1,
  lastFocus: null,
};

const lb = {};

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Call once after collection data loads so the lightbox knows line names/accents. */
export function setLightboxData(lineById) {
  state.lineById = lineById;
}

const accentOf = (lineId) => state.lineById.get(lineId)?.accent || 'green';
const lineName  = (lineId) => state.lineById.get(lineId)?.name  || '';

/** Initialise once after the DOM is ready. */
export function initLightbox() {
  lb.el      = $('#lightbox');
  lb.img     = $('#lb-img');
  lb.title   = $('#lb-title');
  lb.artist  = $('#lb-artist');
  lb.desc    = $('#lb-desc');
  lb.tagLine = $('#lb-tag-line');
  lb.tagId   = $('#lb-tag-id');
  lb.me      = $('#lb-me');
  lb.counter = $('#lb-counter');

  $('#lb-close').addEventListener('click', closeLightbox);
  $('#lb-prev').addEventListener('click',  () => step(-1));
  $('#lb-next').addEventListener('click',  () => step(1));
  lb.el.addEventListener('click', (e) => { if (e.target === lb.el) closeLightbox(); });
  document.addEventListener('keydown', onKey);
}

/**
 * Open the lightbox for a specific NFT within a navigable set.
 * Primary entry point for click handlers on both pages.
 * @param {string} id      - nft.id to show first
 * @param {Array}  members - list to navigate with prev/next
 */
export function openLightboxFor(id, members) {
  state.visible = members.slice();
  const idx = state.visible.findIndex((n) => n.id === id);
  openLightbox(Math.max(0, idx));
}

/** Open by index; the caller must have set state.visible first via openLightboxFor. */
export function openLightbox(index) {
  if (!state.visible.length) return;
  state.lbIndex   = index;
  state.lastFocus = document.activeElement;
  paintLightbox();
  lb.el.classList.add('open');
  lb.el.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  $('#lb-close').focus();
}

function paintLightbox() {
  const n = state.visible[state.lbIndex];
  if (!n) return;
  lb.el.querySelector('.lb-panel').dataset.accent = accentOf(n.line);
  lb.img.src  = n.view;
  lb.img.alt  = n.alt;
  lb.title.textContent = n.title;
  const xUrl = ARTIST_X[n.artist];
  lb.artist.innerHTML = xUrl
    ? `Artist <a class="lb-artist-link" href="${xUrl}" target="_blank" rel="noopener noreferrer"><b>${n.artist}</b></a>`
    : `Artist <b>${n.artist}</b>`;
  lb.desc.textContent    = n.description;
  lb.tagLine.textContent = `Series ${n.line} · ${lineName(n.line)}`;
  lb.tagId.textContent   = `#${n.id}`;
  wireMagicEden(lb.me, n.magicEdenUrl, 'View NFT on MagicEden');
  lb.counter.textContent = `${state.lbIndex + 1} / ${state.visible.length}`;
}

function step(dir) {
  if (!state.visible.length) return;
  state.lbIndex = (state.lbIndex + dir + state.visible.length) % state.visible.length;
  paintLightbox();
}

function closeLightbox() {
  lb.el.classList.remove('open');
  lb.el.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (state.lastFocus?.focus) state.lastFocus.focus();
}

function onKey(e) {
  if (!lb.el?.classList.contains('open')) return;
  if      (e.key === 'Escape')     closeLightbox();
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft')  step(-1);
  else if (e.key === 'Tab')        trapFocus(e);
}

function trapFocus(e) {
  const focusables = $$('button, a[href], [tabindex]:not([tabindex="-1"])', lb.el)
    .filter((el) => el.offsetParent !== null && !el.hasAttribute('aria-disabled'));
  if (!focusables.length) return;
  const first = focusables[0];
  const last  = focusables[focusables.length - 1];
  if      (e.shiftKey  && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last)  { e.preventDefault(); first.focus(); }
}
