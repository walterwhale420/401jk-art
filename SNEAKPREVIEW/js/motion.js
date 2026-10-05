// 401jK motion layer. Needs GSAP (+ ScrollTrigger, SplitText) and Lenis loaded first.
// With prefers-reduced-motion or missing libraries, nothing animates and the page stays complete.
// Non-motion behavior (menu, card stack, donut, wordmark sizing) lives in ui.js.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasLibs = window.gsap && window.ScrollTrigger && window.SplitText && window.Lenis;

  if (reduce || !hasLibs) {
    document.documentElement.classList.remove('js-motion');
    return;
  }
  window.__motionReady = true;

  gsap.registerPlugin(ScrollTrigger, SplitText);
  var EASE = 'expo.out';

  // ---------- Smooth scroll ----------
  var lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0 });
    });
  });

  // ---------- Stacking sections ----------
  var stacked = gsap.utils.toArray('.stack > .block');
  stacked.forEach(function (sec, i) {
    if (i === stacked.length - 1) return; // the last block scrolls away normally
    var tall = function () { return sec.offsetHeight > window.innerHeight; };
    ScrollTrigger.create({
      trigger: sec,
      start: function () { return tall() ? 'bottom bottom' : 'top top'; },
      end: function () { return '+=' + window.innerHeight; },
      pin: true,
      pinSpacing: false
    });
    // Darken the covered section as the next one slides over it.
    gsap.to(sec, {
      '--dim': 0.45, ease: 'none',
      scrollTrigger: { trigger: stacked[i + 1], start: 'top bottom', end: 'top top', scrub: true }
    });
  });

  // ---------- Line-by-line reveals (after fonts load, so ui.js has sized the headers first) ----------
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
  document.querySelectorAll('[data-reveal]').forEach(function (el) {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit: function (self) {
        el.style.visibility = 'visible';
        return gsap.from(self.lines, {
          yPercent: 110, duration: 1.1, ease: EASE, stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
      }
    });
  });
  ScrollTrigger.refresh();
  });

  // ---------- Marquee: always right to left, faster with scroll speed ----------
  document.querySelectorAll('.marquee').forEach(function (mq) {
    var track = mq.querySelector('.marquee__track');
    track.innerHTML += track.innerHTML; // two copies make a seamless loop
    var tween = gsap.to(track, { xPercent: -50, ease: 'none', duration: 28, repeat: -1 });
    var skew = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3' });
    lenis.on('scroll', function (l) {
      var v = l.velocity || 0;
      tween.timeScale(1 + Math.min(Math.abs(v) / 6, 5));
      skew(gsap.utils.clamp(-10, 10, -v * 0.35));
    });
  });

  // ---------- Count-up numbers ----------
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var end = parseFloat(el.dataset.count);
    var dec = parseInt(el.dataset.decimals || '0', 10);
    var suffix = el.dataset.suffix || '';
    var fmt = function (n) { return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix; };
    var obj = { v: 0 };
    el.textContent = fmt(0);
    gsap.to(obj, {
      v: end, duration: 2, ease: 'power3.out',
      onUpdate: function () { el.textContent = fmt(obj.v); },
      scrollTrigger: { trigger: el, start: 'top 90%', once: true }
    });
  });

  // ---------- Donut draws itself (called by ui.js once the data has rendered) ----------
  window.__animateDonut = function (svg, circumference) {
    gsap.from(svg.querySelectorAll('circle[data-seg]'), {
      attr: { 'stroke-dasharray': '0 ' + circumference }, duration: 1.4, ease: 'power3.inOut', stagger: 0.12,
      scrollTrigger: { trigger: svg, start: 'top 80%', once: true }
    });
    ScrollTrigger.refresh();
  };
  // ui.js loads first, so a donut may already be on the page.
  document.querySelectorAll('.donut').forEach(function (svg) {
    if (svg.querySelector('circle[data-seg]')) window.__animateDonut(svg, 2 * Math.PI * 80);
  });

  // ---------- Images zoom inside their frames ----------
  document.querySelectorAll('.frame img').forEach(function (im) {
    gsap.fromTo(im, { scale: 1.18 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: im.closest('.frame'), start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  // ---------- Video loops play only while visible ----------
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { en.isIntersecting ? en.target.play().catch(function () {}) : en.target.pause(); });
  }, { threshold: 0.2 });
  document.querySelectorAll('video[data-autoplay]').forEach(function (v) { v.removeAttribute('autoplay'); io.observe(v); });

  // ---------- Footer wordmark letters spring up on hover ----------
  // The outer span is a fixed hit area; only the inner letter moves, so a lifted letter never loses the hover.
  document.querySelectorAll('.wordmark > span').forEach(function (hit) {
    var letter = hit.firstElementChild;
    hit.addEventListener('pointerenter', function () {
      gsap.to(letter, { y: '-0.12em', rotation: gsap.utils.random(-9, 9), duration: 0.6, ease: 'elastic.out(1, 0.45)', overwrite: true });
    });
    hit.addEventListener('pointerleave', function () {
      gsap.to(letter, { y: 0, rotation: 0, duration: 1.1, ease: 'elastic.out(1, 0.3)', overwrite: true });
    });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
