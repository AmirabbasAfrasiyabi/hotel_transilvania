/*
 * ==========================================================================
 *  HERO SEARCH – FULL SOURCE + SNAPTRIP PATCH (main branch)
 * ==========================================================================
 *
 *  The complete working file is in:
 *      static_collected/js/hero-search.js   (~61 KB)
 *
 *  To activate everything (including the Snaptrip-style one-way behaviour):
 *
 *      cp static_collected/js/hero-search.js static/js/hero-search.js
 *      patch -p1 < patches/snaptrip-oneway-return.patch
 *
 *  After that the search bar will:
 *    - Show all fields in one row on desktop
 *    - Keep "+ Return date" visible in One-way mode
 *    - Switch to Round-trip when the user clicks "+ Return date"
 *    - Only allow a single departure date in One-way mode
 *
 *  The patch file is already on main:
 *      patches/snaptrip-oneway-return.patch
 *
 * ==========================================================================
 */

(function () {
  'use strict';
  console.warn(
    '[Travelista] hero-search.js is a stub. ' +
    'Run: cp static_collected/js/hero-search.js static/js/hero-search.js && ' +
    'patch -p1 < patches/snaptrip-oneway-return.patch'
  );
})();
