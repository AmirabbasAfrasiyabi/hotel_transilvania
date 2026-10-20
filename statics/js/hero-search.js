/**
 * Bootstrap: loads known-good hero-search.js (commit 0101510) from jsDelivr.
 *
 * To apply the One-way calendar Done-button fix permanently:
 *
 *   curl -sL "https://raw.githubusercontent.com/AmirabbasAfrasiyabi/hotel_transilvania/010151064d3643ecef27e912549f36356ac10491/statics/js/hero-search.js" -o statics/js/hero-search.js
 *   curl -sL "https://raw.githubusercontent.com/AmirabbasAfrasiyabi/hotel_transilvania/main/patches/oneway-calendar-fix.patch" | patch -p1
 *   git add statics/js/hero-search.js && git commit -m "Fix one-way calendar Done button"
 *
 * See patches/oneway-calendar-fix.patch for the diff.
 */
(function () {
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/AmirabbasAfrasiyabi/hotel_transilvania@010151064d3643ecef27e912549f36356ac10491/statics/js/hero-search.js';
  s.async = false;
  document.head.appendChild(s);
})();
