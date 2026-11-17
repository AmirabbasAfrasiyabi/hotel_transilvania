(function () {
  "use strict";

  // Use a pipe to separate the result count from the searched route, matching
  // the compact summary style used across desktop, tablet, and mobile.
  function formatSummary(el) {
    if (!el || !el.textContent) return;
    var formatted = el.textContent.replace(/\s*[·•]\s*/g, " | ");
    if (formatted !== el.textContent) el.textContent = formatted;
  }

  function watchSummary(id) {
    var el = document.getElementById(id);
    if (!el || el.__frSummaryObserver) return;
    formatSummary(el);
    var observer = new MutationObserver(function () {
      formatSummary(el);
    });
    observer.observe(el, { childList: true, characterData: true, subtree: true });
    el.__frSummaryObserver = observer;
  }

  function setup() {
    ["frsMobileCount", "frsTabletCount", "frToolbarCount"].forEach(watchSummary);
    // The toolbar/count nodes are initialized by flight-results.js; observe
    // later additions as well as result-count text updates.
    var root = document.querySelector(".fr-layout");
    if (root && !root.__frSummaryObserver) {
      var observer = new MutationObserver(function () {
        ["frsMobileCount", "frsTabletCount", "frToolbarCount"].forEach(watchSummary);
      });
      observer.observe(root, { childList: true, subtree: true });
      root.__frSummaryObserver = observer;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();
