/**
 * TEMPORARY bootstrap: loads last known-good hero-search.js from jsDelivr
 * (commit 010151064d3643ecef27e912549f36356ac10491) until the full fixed file is restored.
 */
(function () {
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/AmirabbasAfrasiyabi/hotel_transilvania@010151064d3643ecef27e912549f36356ac10491/statics/js/hero-search.js';
  s.async = false;
  document.head.appendChild(s);
})();
