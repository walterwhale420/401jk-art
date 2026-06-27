/* =========================================================================
   401jK — lightbox.js
   Lightbox module for the main gallery (app.js). Renders each NFT's detail
   view, including its mint address and current holder wallet.
   ========================================================================= */

export const PLACEHOLDER = 'PLACEHOLDER';

const COPY_SVG = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1"/></svg>`;
const CHECK_SVG = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 9 6 13 14 3"/></svg>`;
const EXT_SVG  = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9"/><polyline points="10 1 15 1 15 6"/><line x1="15" y1="1" x2="7" y2="9"/></svg>`;

const _holders = new Map(); // mintAddress → owner wallet

/** Call after loading holders.json so the lightbox can show the current holder. */
export function setHolders(holdersMap) {
  Object.entries(holdersMap).forEach(([mint, info]) => _holders.set(mint, info.owner));
}

function trunc(addr) { return addr.slice(0, 5) + '…' + addr.slice(-5); }

function makeAddrBlock(label, addr, solscanPath) {
  const wrap = document.createElement('div');
  wrap.className = 'lb-addr-block';
  const lbl = document.createElement('div');
  lbl.className = 'lb-addr-label';
  lbl.textContent = label;
  const row = document.createElement('div');
  row.className = 'lb-addr-row';
  const val = document.createElement('span');
  val.className = 'lb-addr-val';
  val.textContent = trunc(addr);
  val.title = addr;
  const copyBtn = document.createElement('button');
  copyBtn.className = 'lb-addr-btn';
  copyBtn.innerHTML = COPY_SVG;
  copyBtn.setAttribute('aria-label', `Copy ${label}`);
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(addr).then(() => {
      copyBtn.innerHTML = CHECK_SVG;
      copyBtn.classList.add('copied');
      setTimeout(() => { copyBtn.innerHTML = COPY_SVG; copyBtn.classList.remove('copied'); }, 1600);
    });
  });
  const ext = document.createElement('a');
  ext.className = 'lb-addr-ext';
  ext.href = `https://solscan.io/${solscanPath}/${addr}`;
  ext.target = '_blank';
  ext.rel = 'noopener';
  ext.setAttribute('aria-label', 'View on Solscan');
  ext.innerHTML = EXT_SVG;
  row.append(val, copyBtn, ext);
  wrap.append(lbl, row);
  return wrap;
}

export const isLive = (url) =>
  typeof url === 'string' && url && url !== PLACEHOLDER && /^https?:\/\//i.test(url);

export function wireTensor(el, url, baseLabel) {
  if (isLive(url)) {
    el.setAttribute('href', url);
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
    el.removeAttribute('aria-disabled');
    el.innerHTML = `${baseLabel} <span class="arr">&#8599;</span>`;
  } else {
    el.setAttribute('aria-disabled', 'true');
    el.setAttribute('href', '#');
    el.setAttribute('title', 'Tensor listing coming soon');
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
  lb.me        = $('#lb-me');
  lb.addresses = $('#lb-addresses');
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
  const id = state.visible[index]?.id;
  if (id) history.replaceState(null, '', `#nft-${id}`);
}

/**
 * If the URL hash is #nft-<id>, open that NFT's lightbox.
 * Call after collection data has been rendered.
 * @param {Array} allNfts - full list of NFT objects
 */
export function openLightboxFromHash(allNfts) {
  const m = location.hash.match(/^#nft-(.+)$/);
  if (!m) return;
  const id = m[1];
  const nft = allNfts.find((n) => n.id === id);
  if (nft) openLightboxFor(id, allNfts);
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
  if (lb.addresses) {
    lb.addresses.innerHTML = '';
    if (n.mintAddress) {
      lb.addresses.appendChild(makeAddrBlock('Mint', n.mintAddress, 'token'));
      const owner = _holders.get(n.mintAddress);
      if (owner) lb.addresses.appendChild(makeAddrBlock('Holder', owner, 'address'));
    }
  }
  wireTensor(lb.me, n.tensorUrl, 'View NFT on Tensor');
  lb.counter.textContent = `${state.lbIndex + 1} / ${state.visible.length}`;
}

function step(dir) {
  if (!state.visible.length) return;
  state.lbIndex = (state.lbIndex + dir + state.visible.length) % state.visible.length;
  paintLightbox();
  const id = state.visible[state.lbIndex]?.id;
  if (id) history.replaceState(null, '', `#nft-${id}`);
}

function closeLightbox() {
  lb.el.classList.remove('open');
  lb.el.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (state.lastFocus?.focus) state.lastFocus.focus();
  history.replaceState(null, '', '#gallery');
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
