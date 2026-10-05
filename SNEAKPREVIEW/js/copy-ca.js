// Click-to-copy for the contract address. Any element with [data-copy-ca] copies it.
(function () {
  var CA = 'Cz7LGKdZPpAxonXx23ZYPW3RtDQvjcf17ZDCZEzFpump';

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy-ca]');
    if (!btn) return;
    var label = btn.textContent;
    var done = function () {
      btn.dataset.copied = 'true';
      btn.textContent = 'Copied';
      setTimeout(function () { btn.dataset.copied = 'false'; btn.textContent = label; }, 1600);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(CA).then(done, function () { fallbackCopy(CA); done(); });
    } else {
      fallbackCopy(CA);
      done();
    }
  });
})();
