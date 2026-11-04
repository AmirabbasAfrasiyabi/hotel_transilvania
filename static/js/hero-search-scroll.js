(function () {
  'use strict';

  var HEADER_OFFSET = 72;   // fixed header height approx
  var POPUP_ROOM = 340;     // space needed below the trigger for popups
  var SCROLL_PAD = 16;

  function getCard() {
    return document.getElementById('heroSearchCard') ||
      document.querySelector('.hero-search-card');
  }

  function scrollForPopup(triggerEl) {
    if (!triggerEl) return;

    var card = getCard();
    var anchor = triggerEl.closest('.hsf-field, .hsf-date-group, .hsf-passenger-field, .hsf-date-box') || triggerEl;
    var rect = anchor.getBoundingClientRect();
    var spaceBelow = window.innerHeight - rect.bottom;
    var spaceNeeded = POPUP_ROOM;

    // If not enough room below the field, scroll so field sits higher
    if (spaceBelow < spaceNeeded) {
      var delta = spaceNeeded - spaceBelow + SCROLL_PAD;
      // Prefer scrolling the card toward the top under the header
      if (card) {
        var cardTop = card.getBoundingClientRect().top;
        var targetCardTop = HEADER_OFFSET + 8;
        if (cardTop > targetCardTop) {
          delta = Math.max(delta, cardTop - targetCardTop);
        }
      }
      window.scrollBy({ top: delta, behavior: 'smooth' });
    }
  }

  function onInteract(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (!t.closest('.hero-search-card, .hero-search-form')) return;

    // clicks / focus on inputs, triggers, nudges
    var interactive = t.closest(
      '.hsf-input, .hsf-date-trigger, .hsf-date-nudge, ' +
      '#passengerTrigger, .hsf-select-trigger, .hsf-field, .hsf-date-box'
    );
    if (!interactive) return;

    // slight delay so popup can open first, then measure
    setTimeout(function () {
      scrollForPopup(interactive);
    }, 30);
  }

  // MutationObserver: when a popup becomes visible, ensure room
  function observePopups() {
    var roots = document.querySelectorAll(
      '.hsf-calendar-popup, .hsf-passenger-popup, .hsf-suggestions, .hsf-select-popup'
    );
    if (!roots.length) return;

    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        var el = m.target;
        if (!el || el.hidden) return;
        if (el.getAttribute && el.getAttribute('hidden') !== null) return;
        // popup opened
        var field = el.closest('.hsf-field, .hsf-date-group, .hsf-passenger-field, .hsf-date-box') || el;
        setTimeout(function () {
          scrollForPopup(field);
        }, 20);
      });
    });

    roots.forEach(function (el) {
      obs.observe(el, { attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
    });
  }

  function init() {
    var form = document.getElementById('heroSearchForm') ||
      document.querySelector('.hero-search-form');
    if (!form) return;

    form.addEventListener('focusin', onInteract, true);
    form.addEventListener('click', onInteract, true);

    // observe after a tick so DOM popups exist
    setTimeout(observePopups, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
