// Runs before the module bundle, including when that bundle cannot be loaded.
(function () {
  var key = 'meatmall:page-load-retry-at';
  var reloading = false;
  function isChunkError(error) {
    return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed|Unable to preload CSS/i.test(String(error && error.message || error || ''));
  }
  function reload() { window.location.reload(); }
  function tryReload(error) {
    if (!isChunkError(error) || navigator.onLine === false) return false;
    if (reloading) return true;
    // Persist the limit across reloads. If storage is blocked, offer manual retry.
    try {
      var previous = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - previous < 60000) return false;
      sessionStorage.setItem(key, String(Date.now()));
    } catch (_) { return false; }
    reloading = true;
    reload();
    return true;
  }
  function showStartupError() {
    var root = document.getElementById('root');
    if (!root) {
      document.addEventListener('DOMContentLoaded', showStartupError, { once: true });
      return;
    }
    if (root.childElementCount) return;
    var card = document.createElement('section');
    card.setAttribute('role', 'alert');
    card.style.cssText = 'max-width:440px;margin:15vh auto;padding:28px;border:1px solid #e5e7eb;border-radius:16px;background:white;color:#161616;font-family:Arial,sans-serif;line-height:1.6';
    var heading = document.createElement('h1');
    heading.textContent = 'Хуудас ачаалж чадсангүй';
    var text = document.createElement('p');
    text.textContent = 'Интернэт холболтоо шалгаад дахин ачаална уу. Таны сагс болон нэвтрэх мэдээллийг устгахгүй.';
    var button = document.createElement('button');
    button.textContent = 'Дахин ачаалах';
    button.style.cssText = 'border:0;border-radius:8px;background:#e4002b;color:white;padding:12px 20px;font-size:16px;cursor:pointer';
    button.addEventListener('click', reload);
    card.append(heading, text, button);
    root.append(card);
  }
  window.meatmallRecovery = { isChunkError: isChunkError, tryReload: tryReload };
  window.addEventListener('vite:preloadError', function (event) {
    // Let React receive a rejected import when automatic recovery is exhausted.
    tryReload(event.payload);
  });
  window.addEventListener('unhandledrejection', function (event) {
    if (isChunkError(event.reason) && !tryReload(event.reason)) showStartupError();
  });
  window.addEventListener('error', function (event) {
    var target = event.target;
    if (target && target.tagName === 'SCRIPT' && target.type === 'module') {
      if (!tryReload(new Error('Failed to fetch dynamically imported module'))) showStartupError();
    }
  }, true);
})();
