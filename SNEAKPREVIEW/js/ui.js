// 401jK interface behavior that works with or without the motion layer:
// nav menu, footer wordmark sizing, milestone card stack, token distribution donut and wallet list,
// intro video, Mona's speech bubble and hover-only meme videos.
(function () {
  initNavMenu();
  fitAll();
  window.addEventListener('resize', fitAll);
  // Registered before motion.js waits on fonts, so headers are sized before they are split into lines.
  if (document.fonts) document.fonts.ready.then(fitAll);
  document.querySelectorAll('.cards').forEach(initCardStack);
  document.querySelectorAll('[data-distribution]').forEach(initDistribution);
  document.querySelectorAll('[data-intro]').forEach(initIntro);
  document.querySelectorAll('[data-mona]').forEach(initMonaBubble);
  document.querySelectorAll('[data-hover-video]').forEach(initHoverVideo);

  function fitAll() { fitHeaders(); fitWordmark(); sizeSteps(); sizeMemeStrip(); }

  // ---------- Home: intro video ----------
  // Mouse: plays muted while hovered, pauses when the pointer leaves; a click toggles the sound.
  // Touch: a tap plays it with sound, the next tap pauses it. The sound button toggles the sound on both.
  function initIntro(fig) {
    var video = fig.querySelector('video');
    var screen = fig.querySelector('.intro__screen');
    var soundBtn = fig.querySelector('.intro__sound');
    var soundLabel = fig.querySelector('[data-intro-sound]');
    var bar = fig.querySelector('.intro__progress i');
    var canHover = window.matchMedia('(hover: hover)').matches;
    if (!canHover) fig.querySelector('[data-intro-hint]').textContent = 'Tap to play with sound';

    var setSound = function (on) {
      video.muted = !on;
      fig.classList.toggle('is-sound', on);
      soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      soundBtn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
      soundLabel.textContent = on ? 'Sound on' : 'Sound off';
    };
    var play = function () { video.play().catch(function () {}); };
    video.addEventListener('play', function () { fig.classList.add('is-playing'); });
    video.addEventListener('pause', function () { fig.classList.remove('is-playing'); });
    video.addEventListener('timeupdate', function () {
      if (video.duration) bar.style.setProperty('--progress', (video.currentTime / video.duration).toFixed(4));
    });

    soundBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setSound(video.muted);
      if (video.paused) play();
    });
    if (canHover) {
      fig.addEventListener('mouseenter', play);
      fig.addEventListener('mouseleave', function () { video.pause(); });
      screen.addEventListener('click', function () { setSound(video.muted); if (video.paused) play(); });
    } else {
      screen.addEventListener('click', function () {
        if (video.paused) { setSound(true); play(); } else video.pause();
      });
    }
  }

  // ---------- Manifesto: Mona's bubble pops in once the "Read the manifesto" button is on screen ----------
  function initMonaBubble(fig) {
    var btn = fig.closest('section').querySelector('.btn');
    if (!btn || !('IntersectionObserver' in window)) return;
    fig.setAttribute('data-bubble', 'wait');
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      fig.removeAttribute('data-bubble');
      io.disconnect();
    }, { threshold: 1 });
    io.observe(btn);
  }

  // ---------- Meme tiles with a video: play only while hovered (from the start each time) ----------
  // Touch screens show the video version straight away (motion.css), so it plays while it is on screen.
  function initHoverVideo(tile) {
    var video = tile.querySelector('video');
    if (!video) return;
    var start = function () { video.currentTime = 0; video.play().catch(function () {}); };
    var stop = function () { video.pause(); };
    if (window.matchMedia('(hover: hover)').matches && window.innerWidth > 860) {
      tile.addEventListener('mouseenter', start);
      tile.addEventListener('mouseleave', stop);
      tile.addEventListener('focus', start);
      tile.addEventListener('blur', stop);
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? video.play().catch(function () {}) : stop();
      }, { threshold: 0.2 }).observe(video);
    }
  }

  // ---------- Memes strip: flex-grow chosen so an expanded tile is exactly 3:2 (the memes' shape) ----------
  // The strip height is fixed in CSS (same as the hero strip). Others stay at .75 (motion.css). Phones use their own layout (CSS).
  function sizeMemeStrip() {
    document.querySelectorAll('.strip--memes').forEach(function (strip) {
      if (window.innerWidth <= 860) { strip.style.removeProperty('--meme-grow'); return; }
      var n = strip.children.length;
      if (!n) return;
      var gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
      var cs = getComputedStyle(strip.children[0]);
      var border = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
      var share = strip.clientWidth - gap * (n - 1) - border * n;
      var inner = (strip.clientHeight - border) * 1.5;
      var r = Math.min(inner / share, 0.9);
      strip.style.setProperty('--meme-grow', (0.75 * (n - 1) * r / (1 - r)).toFixed(3));
    });
  }

  // ---------- How to Buy: width of a fully condensed step card (one other card hovered) ----------
  // Matches the flex-grow values in motion.css (.8 condensed, 2.6 expanded); the clock guy is sized to fit it.
  function sizeSteps() {
    document.querySelectorAll('.xsteps').forEach(function (row) {
      var cards = row.children.length;
      if (!cards) return;
      var gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      var cs = getComputedStyle(row.children[0]);
      // Padding and borders are fixed per card; only the remaining space is shared by flex-grow.
      var fixed = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].reduce(function (a, k) { return a + parseFloat(cs[k]); }, 0);
      var share = row.clientWidth - gap * (cards - 1) - fixed * cards;
      row.style.setProperty('--xstep-condensed', (fixed + share * 0.8 / (2.6 + 0.8 * (cards - 1))) + 'px');
      // Height available below the step number (bottom of "05"), measured on the guy's own card.
      var guyBox = row.querySelector('.xstep__guy');
      if (guyBox) row.style.setProperty('--xstep-guy-h', guyBox.clientHeight + 'px');
    });
  }

  // ---------- Headers share one size and never run past three lines ----------
  // Each header is shrunk until it fits; the smallest result is then applied to all of them, so they always match.
  function fitHeaders() {
    var heads = document.querySelectorAll('.display, .h2');
    var common = Infinity;
    heads.forEach(function (el) {
      var max = parseInt(el.getAttribute('data-max-lines') || '3', 10);
      el.style.fontSize = '';
      var size = parseFloat(getComputedStyle(el).fontSize);
      var min = 20;
      while (lineCount(el) > max && size > min) {
        size = Math.max(min, size * 0.94);
        el.style.fontSize = size + 'px';
      }
      common = Math.min(common, size);
    });
    heads.forEach(function (el) { el.style.fontSize = common + 'px'; });
  }
  function lineCount(el) {
    var lh = parseFloat(getComputedStyle(el).lineHeight);
    return Math.round(el.getBoundingClientRect().height / lh);
  }

  // ---------- Top bar: menu toggle on phones; hides on scroll down, returns on scroll up ----------
  function initNavMenu() {
    var bar = document.querySelector('.topbar');
    if (!bar) return;
    var toggle = bar.querySelector('.topbar__toggle');
    var close = function () { bar.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', function () {
      var open = bar.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    bar.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });

    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (Math.abs(y - lastY) < 6) return;
      if (!bar.classList.contains('is-open')) bar.classList.toggle('is-hidden', y > lastY && y > 120);
      lastY = y;
    }, { passive: true });
  }

  // ---------- Footer wordmark fills the width ----------
  function fitWordmark() {
    document.querySelectorAll('.wordmark').forEach(function (wm) {
      wm.style.fontSize = '100px';
      var natural = wm.lastElementChild.getBoundingClientRect().right - wm.firstElementChild.getBoundingClientRect().left;
      if (natural > 0) wm.style.fontSize = (100 * wm.clientWidth / natural) + 'px';
    });
  }

  // ---------- Milestone card stack: click (or Enter) sends the top card to the back ----------
  function initCardStack(stack) {
    var cards = Array.prototype.slice.call(stack.querySelectorAll('.cards__card'));
    var counter = stack.parentElement.querySelector('[data-cards-counter]');
    var total = cards.length;
    var shown = 1;
    var rot = [-3, 2.5, -1.5, 3.5, -2.5];
    var busy = false;

    function layout() {
      cards.forEach(function (c, i) {
        c.style.zIndex = String(total - i);
        c.style.transform = 'translate(' + (i * 12) + 'px,' + (i * -12) + 'px) rotate(' + rot[i % rot.length] + 'deg) scale(' + (1 - i * 0.035) + ')';
        c.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
      });
      if (counter) counter.textContent = pad(shown) + ' / ' + pad(total);
    }
    function next() {
      if (busy) return;
      busy = true;
      var top = cards[0];
      top.classList.add('is-leaving');
      setTimeout(function () {
        top.classList.remove('is-leaving');
        cards.push(cards.shift());
        shown = shown % total + 1;
        layout();
        busy = false;
      }, 380);
    }
    stack.addEventListener('click', next);
    stack.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
    });
    layout();
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // ---------- Token distribution: donut + wallet list from data/distribution.json ----------
  // Data comes from data/distribution.js (window.DISTRIBUTION), which also works when the page is opened from disk.
  function initDistribution(root) {
    if (!window.DISTRIBUTION) {
      root.querySelector('[data-wallets]').innerHTML = '<p class="mono">Distribution data could not be loaded.</p>';
      return;
    }
    renderDistribution(root, window.DISTRIBUTION);
  }

  function renderDistribution(root, d) {
    var supply = d.supply;
    var listed = d.wallets.reduce(function (a, w) { return a + w.tokens; }, 0);
    var wallets = d.wallets.slice().sort(function (a, b) { return b.tokens - a.tokens; });
    // The top-100 retail wallets are carved out of circulating supply and drawn as their own (dark grey) slice.
    var top = d.top100 ? [{ key: 'top100', label: d.top100.label, desc: d.top100.desc, tokens: d.top100.tokens, color: d.top100.color }] : [];
    var topTokens = top.length ? top[0].tokens : 0;
    var items = wallets.concat(top, [{ key: 'circulating', label: top.length ? 'Everyone else' : 'Circulating', desc: d.circulatingDesc, tokens: supply - listed - topTokens, color: '#080914' }]);
    var pct = function (t) { return (t / supply * 100).toFixed(1) + '%'; };
    var fmt = function (t) { return Math.round(t).toLocaleString('en-US'); };
    var short = function (a) { return a.slice(0, 4) + '…' + a.slice(-4); };

    // Donut
    // Real circumference lengths instead of pathLength, which some browsers ignore for dash patterns.
    // Each slice is one dash starting at the path's origin, rotated into place. A dash that crosses the origin of the
    // closed circle path gets a corner join there (a visible notch), so no slice may cross it.
    var svg = root.querySelector('.donut');
    var ns = 'http://www.w3.org/2000/svg';
    var R = 80, C = 2 * Math.PI * R;
    var offset = 0;
    items.forEach(function (it) {
      var len = it.tokens / supply * C;
      var c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', '100'); c.setAttribute('cy', '100'); c.setAttribute('r', String(R));
      c.setAttribute('stroke', it.color);
      c.setAttribute('stroke-dasharray', len.toFixed(3) + ' ' + C.toFixed(3));
      c.setAttribute('transform', 'rotate(' + (offset / C * 360).toFixed(4) + ' 100 100)');
      c.setAttribute('data-seg', it.key);
      svg.appendChild(c);
      offset += len;
    });

    // Center readout
    var center = root.querySelector('[data-donut-center]');
    var canHover = window.matchMedia('(hover: hover)').matches;
    var setCenter = function (it) {
      center.innerHTML = it
        ? '<strong>' + pct(it.tokens) + '</strong><span>' + fmt(it.tokens) + '</span><em>' + it.label + '</em>'
        : '<strong>' + fmt(supply) + '</strong><span>tokens</span><em>' + (canHover ? 'Hover' : 'Tap') + ' a slice</em>';
    };
    setCenter(null);

    // Wallet list: named wallets only. The top-100 and "everyone else" slices appear in the donut only.
    var list = root.querySelector('[data-wallets]');
    list.innerHTML = items.filter(function (it) { return it.key !== 'top100' && it.key !== 'circulating'; }).map(function (it) {
      var addr = it.address
        ? '<a class="wallets__addr" href="' + it.url + '" target="_blank" rel="noopener">' + short(it.address) + ' ↗</a>'
        : '<span class="wallets__addr"></span>';
      return '<li data-key="' + it.key + '" tabindex="0">' +
        '<i style="background:' + it.color + '"></i>' +
        '<strong class="wallets__name">' + it.label + '</strong>' +
        '<span class="wallets__pct">' + pct(it.tokens) + '</span>' +
        '<span class="wallets__tokens">' + fmt(it.tokens) + '</span>' + addr +
        '<p class="wallets__desc">' + it.desc + '</p></li>';
    }).join('');

    // Hover sync: slice ↔ list row
    var activate = function (key) {
      var it = items.filter(function (x) { return x.key === key; })[0] || null;
      svg.querySelectorAll('circle[data-seg]').forEach(function (c) { c.classList.toggle('is-active', c.getAttribute('data-seg') === key); });
      list.querySelectorAll('li').forEach(function (li) { li.classList.toggle('is-active', li.getAttribute('data-key') === key); });
      setCenter(it);
    };
    svg.querySelectorAll('circle[data-seg]').forEach(function (c) {
      c.addEventListener('mouseenter', function () { activate(c.getAttribute('data-seg')); });
      c.addEventListener('mouseleave', function () { activate(null); });
    });
    list.querySelectorAll('li').forEach(function (li) {
      ['mouseenter', 'focus'].forEach(function (ev) { li.addEventListener(ev, function () { activate(li.getAttribute('data-key')); }); });
      ['mouseleave', 'blur'].forEach(function (ev) { li.addEventListener(ev, function () { activate(null); }); });
    });

    if (window.__animateDonut) window.__animateDonut(svg, C);
  }
})();
