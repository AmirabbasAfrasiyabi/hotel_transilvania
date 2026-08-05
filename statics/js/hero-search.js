/* ==========================================================================
   TRAVELISTA — HERO SEARCH INTERACTIONS (Phase 1, extended)
   ==========================================================================
   Save as: static/js/hero-search.js
   Include in base.html, right before {% static 'js/main.js' %}:
      <script src="{% static 'js/hero-search.js' %}"></script>

   Everything here is FRONTEND-ONLY / MOCKED:
   - No real API calls. Search "results" are not fetched from Django.
   - Autocomplete data (TVL_PLACES) is a hard-coded array below — swap it
     for a real fetch() call to your backend when you build that endpoint.
   - Tab clicks use history.pushState() to change the URL (e.g. /flights)
     WITHOUT reloading the page. This is a purely visual/JS change: if the
     user refreshes the page while on /flights, or opens that URL
     directly, Django needs a real urls.py route for it (pointing back at
     this same view) or it will 404. Add those routes once this UI is
     wired to a real backend.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     0) MOCK DATA — replace with a real endpoint later
  ------------------------------------------------------------------ */
  var TVL_PLACES = [
    { type: 'airport', label: 'Tehran — Imam Khomeini Intl (THR)', sub: 'Iran' },
    { type: 'airport', label: 'Istanbul Airport (IST)', sub: 'Turkey' },
    { type: 'airport', label: 'Dubai Intl (DXB)', sub: 'United Arab Emirates' },
    { type: 'airport', label: 'London Heathrow (LHR)', sub: 'United Kingdom' },
    { type: 'city', label: 'Paris', sub: 'France' },
    { type: 'city', label: 'Berlin', sub: 'Germany' },
    { type: 'city', label: 'Rome', sub: 'Italy' },
    { type: 'city', label: 'Barcelona', sub: 'Spain' },
    { type: 'hotel', label: 'Bosphorus Grand Hotel', sub: 'Istanbul, Turkey' },
    { type: 'hotel', label: 'Palm Marina Resort', sub: 'Dubai, UAE' },
    { type: 'destination', label: 'Bali', sub: 'Indonesia' },
    { type: 'destination', label: 'Santorini', sub: 'Greece' },
    { type: 'destination', label: 'Kyoto', sub: 'Japan' }
  ];

  var TVL_POPULAR = ['Istanbul', 'Dubai', 'Paris', 'London', 'Rome', 'Berlin'];

  var TVL_ICONS = {
    airport: 'fa-plane',
    city: 'fa-city',
    hotel: 'fa-bed',
    destination: 'fa-mountain-sun',
    history: 'fa-clock-rotate-left',
    popular: 'fa-fire'
  };

  var TVL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var TVL_DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  var HISTORY_KEY = 'tvl_search_history';
  var HISTORY_MAX = 5;

  /* ------------------------------------------------------------------
     1) SMALL HELPERS
  ------------------------------------------------------------------ */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function formatDate(d) {
    if (!d) return '';
    var opts = { weekday: 'short', day: 'numeric', month: 'short' };
    return d.toLocaleDateString('en-US', opts);
  }

  function sameDay(a, b) {
    return a && b && a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function readHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function writeHistory(mode, origin, destination) {
    if (!origin && !destination) return;
    var list = readHistory();
    var label = destination ? (origin ? origin + ' \u2192 ' + destination : destination) : origin;
    list.unshift({ mode: mode, label: label, origin: origin, destination: destination, ts: Date.now() });
    // de-duplicate by label, keep most recent, cap length
    var seen = {};
    list = list.filter(function (item) {
      if (seen[item.mode + '|' + item.label]) return false;
      seen[item.mode + '|' + item.label] = true;
      return true;
    }).slice(0, HISTORY_MAX);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable — ignore */ }
  }

  /* ------------------------------------------------------------------
     2) TABS — switch search mode, update URL with pushState
  ------------------------------------------------------------------ */
  var tabs = qsa('.tvl-tab');
  var panels = qsa('.tvl-panel');

  function activateMode(mode, pushUrl) {
    tabs.forEach(function (tab) {
      var isActive = tab.dataset.mode === mode;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    panels.forEach(function (panel) {
      var isActive = panel.dataset.panel === mode;
      panel.classList.toggle('active', isActive);
      panel.hidden = !isActive;
    });
    closeAllPopups();

    if (pushUrl) {
      var tab = tabs.filter(function (t) { return t.dataset.mode === mode; })[0];
      if (tab && tab.dataset.url && window.location.pathname !== tab.dataset.url) {
        window.history.pushState({ tvlMode: mode }, '', tab.dataset.url);
      }
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      activateMode(tab.dataset.mode, true);
    });
  });

  window.addEventListener('popstate', function (e) {
    var mode = (e.state && e.state.tvlMode) || 'flight';
    activateMode(mode, false);
  });

  /* ------------------------------------------------------------------
     3) REVERSE BUTTON — swap origin / destination
  ------------------------------------------------------------------ */
  qsa('[data-reverse]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.closest('.tvl-row-od');
      var originInput = qs('[data-field="origin"] input', row);
      var destInput = qs('[data-field="destination"] input', row);
      if (!originInput || !destInput) return;
      var tmp = originInput.value;
      originInput.value = destInput.value;
      destInput.value = tmp;
      btn.classList.add('tvl-flip');
      setTimeout(function () { btn.classList.remove('tvl-flip'); }, 300);
    });
  });

  /* ------------------------------------------------------------------
     4) AUTOCOMPLETE + SEARCH HISTORY
  ------------------------------------------------------------------ */
  function renderSuggestItem(iconType, main, sub) {
    var div = document.createElement('div');
    div.className = 'tvl-suggest-item';
    div.setAttribute('role', 'option');
    div.innerHTML =
      '<span class="tvl-suggest-icon"><i class="fa-solid ' + (TVL_ICONS[iconType] || 'fa-location-dot') + '"></i></span>' +
      '<span><span class="tvl-suggest-main">' + main + '</span>' +
      (sub ? '<br><span class="tvl-suggest-sub">' + sub + '</span>' : '') + '</span>';
    return div;
  }

  function renderSuggestions(panel, input, mode) {
    var query = input.value.trim().toLowerCase();
    panel.innerHTML = '';

    if (!query) {
      var history = readHistory().filter(function (h) { return h.mode === mode; });
      if (history.length) {
        var histTitle = document.createElement('div');
        histTitle.className = 'tvl-suggest-group-title';
        histTitle.textContent = 'Recent searches';
        panel.appendChild(histTitle);
        history.forEach(function (h) {
          var item = renderSuggestItem('history', h.label, 'Search again');
          item.addEventListener('click', function () {
            if (h.origin) {
              var row = input.closest('.tvl-row-od');
              var originInput = qs('[data-field="origin"] input', row);
              if (originInput) originInput.value = h.origin;
            }
            input.value = h.destination || h.label;
            hideSuggestPanel(panel);
          });
          panel.appendChild(item);
        });
      }

      var popTitle = document.createElement('div');
      popTitle.className = 'tvl-suggest-group-title';
      popTitle.textContent = 'Popular destinations';
      panel.appendChild(popTitle);
      TVL_POPULAR.forEach(function (city) {
        var item = renderSuggestItem('popular', city, null);
        item.addEventListener('click', function () {
          input.value = city;
          hideSuggestPanel(panel);
        });
        panel.appendChild(item);
      });
      return;
    }

    var matches = TVL_PLACES.filter(function (p) {
      return p.label.toLowerCase().indexOf(query) !== -1 || p.sub.toLowerCase().indexOf(query) !== -1;
    }).slice(0, 7);

    if (!matches.length) {
      var empty = document.createElement('div');
      empty.className = 'tvl-suggest-empty';
      empty.textContent = 'No matches for \u201c' + input.value + '\u201d';
      panel.appendChild(empty);
      return;
    }

    matches.forEach(function (m) {
      var item = renderSuggestItem(m.type, m.label, m.sub);
      item.addEventListener('click', function () {
        input.value = m.label;
        hideSuggestPanel(panel);
      });
      panel.appendChild(item);
    });
  }

  function showSuggestPanel(panel) { panel.hidden = false; }
  function hideSuggestPanel(panel) { panel.hidden = true; }

  qsa('[data-suggest]').forEach(function (field) {
    var input = qs('input', field);
    var panel = qs('[data-suggest-panel]', field);
    var mode = field.closest('.tvl-panel').dataset.panel;
    if (!input || !panel) return;

    input.addEventListener('focus', function () {
      closeAllPopups(panel);
      renderSuggestions(panel, input, mode);
      showSuggestPanel(panel);
    });
    input.addEventListener('input', function () {
      renderSuggestions(panel, input, mode);
      showSuggestPanel(panel);
    });
  });

  /* ------------------------------------------------------------------
     5) CALENDAR POPUP (shared, positioned per field)
  ------------------------------------------------------------------ */
  var calPopup = qs('#tvlCalendarPopup');
  var calState = {
    field: null,        // the input currently being edited
    pairField: null,    // the "other" input (depart<->return) in the same row
    baseMonth: null,     // Date set to day 1 of the left-hand visible month
    rangeStart: null,
    rangeEnd: null,
    editing: 'start'     // 'start' | 'end'
  };

  function buildMonthGrid(container, monthDate) {
    container.innerHTML = '';
    TVL_DOW.forEach(function (d) {
      var el = document.createElement('div');
      el.className = 'tvl-cal-dow';
      el.textContent = d;
      container.appendChild(el);
    });

    var year = monthDate.getFullYear();
    var month = monthDate.getMonth();
    var firstDow = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = stripTime(new Date());

    for (var i = 0; i < firstDow; i++) {
      var empty = document.createElement('button');
      empty.className = 'tvl-cal-day tvl-empty';
      empty.disabled = true;
      container.appendChild(empty);
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var date = new Date(year, month, day);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tvl-cal-day';
      btn.textContent = String(day);

      if (date < today) {
        btn.disabled = true;
      } else {
        if (sameDay(date, today)) btn.classList.add('tvl-today');
        if (calState.rangeStart && sameDay(date, calState.rangeStart)) btn.classList.add('tvl-selected');
        if (calState.rangeEnd && sameDay(date, calState.rangeEnd)) btn.classList.add('tvl-selected');
        if (calState.rangeStart && calState.rangeEnd && date > calState.rangeStart && date < calState.rangeEnd) {
          btn.classList.add('tvl-in-range');
        }
        btn.addEventListener('click', function (d) {
          return function () { pickCalendarDate(d); };
        }(date));
      }
      container.appendChild(btn);
    }
  }

  function renderCalendar() {
    var monthA = calState.baseMonth;
    var monthB = new Date(monthA.getFullYear(), monthA.getMonth() + 1, 1);
    qs('[data-cal-month-a]', calPopup).textContent = TVL_MONTHS[monthA.getMonth()] + ' ' + monthA.getFullYear();
    qs('[data-cal-month-b]', calPopup).textContent = TVL_MONTHS[monthB.getMonth()] + ' ' + monthB.getFullYear();
    buildMonthGrid(qs('[data-cal-grid-a]', calPopup), monthA);
    buildMonthGrid(qs('[data-cal-grid-b]', calPopup), monthB);

    var hint = qs('[data-cal-hint]', calPopup);
    if (!calState.rangeStart) {
      hint.textContent = 'Pick a start date';
    } else if (!calState.rangeEnd) {
      hint.textContent = 'Pick an end date';
    } else {
      hint.textContent = formatDate(calState.rangeStart) + ' \u2192 ' + formatDate(calState.rangeEnd);
    }
  }

  function pickCalendarDate(date) {
    if (!calState.rangeStart || (calState.rangeStart && calState.rangeEnd)) {
      calState.rangeStart = date;
      calState.rangeEnd = null;
    } else if (date < calState.rangeStart) {
      calState.rangeStart = date;
      calState.rangeEnd = null;
    } else {
      calState.rangeEnd = date;
    }

    if (calState.field) calState.field.value = formatDate(calState.rangeStart);
    if (calState.rangeEnd && calState.pairField) calState.pairField.value = formatDate(calState.rangeEnd);

    renderCalendar();
  }

  qs('[data-cal-prev]', calPopup).addEventListener('click', function () {
    calState.baseMonth = new Date(calState.baseMonth.getFullYear(), calState.baseMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  qs('[data-cal-next]', calPopup).addEventListener('click', function () {
    calState.baseMonth = new Date(calState.baseMonth.getFullYear(), calState.baseMonth.getMonth() + 1, 1);
    renderCalendar();
  });
  qs('[data-cal-done]', calPopup).addEventListener('click', function () {
    hidePopup(calPopup);
  });

  function openCalendarFor(fieldWrapper) {
    var input = qs('input', fieldWrapper);
    var row = fieldWrapper.closest('.tvl-row-dates');
    var isDepart = fieldWrapper.dataset.field === 'depart';
    var pairWrapper = qs(isDepart ? '[data-field="return"]' : '[data-field="depart"]', row);

    calState.field = isDepart ? input : qs('input', pairWrapper);
    calState.pairField = isDepart ? qs('input', pairWrapper) : input;
    calState.baseMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    calState.rangeStart = null;
    calState.rangeEnd = null;

    renderCalendar();
    positionPopup(calPopup, fieldWrapper);
    showPopup(calPopup);
  }

  qsa('[data-datepicker]').forEach(function (field) {
    var input = qs('input', field);
    input.addEventListener('click', function () {
      closeAllPopups();
      openCalendarFor(field);
    });
  });

  /* ------------------------------------------------------------------
     6) PASSENGER / ROOMS POPUP (shared, positioned per field)
  ------------------------------------------------------------------ */
  var paxPopup = qs('#tvlPaxPopup');
  var paxState = { rooms: 1, adults: 1, children: 0, infants: 0, cabin: 'economy' };
  var paxActiveField = null;

  var PAX_LIMITS = {
    rooms: { min: 1, max: 8 },
    adults: { min: 1, max: 9 },
    children: { min: 0, max: 8 },
    infants: { min: 0, max: 4 }
  };

  function updatePaxCounterUI() {
    Object.keys(PAX_LIMITS).forEach(function (key) {
      var valEl = qs('[data-counter-val="' + key + '"]', paxPopup);
      if (valEl) valEl.textContent = String(paxState[key]);
      var minusBtn = qs('[data-counter="' + key + '"][data-op="minus"]', paxPopup);
      var plusBtn = qs('[data-counter="' + key + '"][data-op="plus"]', paxPopup);
      if (minusBtn) minusBtn.disabled = paxState[key] <= PAX_LIMITS[key].min;
      if (plusBtn) plusBtn.disabled = paxState[key] >= PAX_LIMITS[key].max;
    });
  }

  qsa('[data-counter]', paxPopup).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.dataset.counter;
      var op = btn.dataset.op;
      var limits = PAX_LIMITS[key];
      var next = paxState[key] + (op === 'plus' ? 1 : -1);
      if (next < limits.min || next > limits.max) return;
      paxState[key] = next;
      updatePaxCounterUI();
    });
  });

  qsa('input[name="tvl-cabin-class"]', paxPopup).forEach(function (radio) {
    radio.addEventListener('change', function () { paxState.cabin = radio.value; });
  });

  function paxLabel(showClass, showRooms) {
    var parts = [];
    if (showRooms) parts.push(paxState.rooms + (paxState.rooms === 1 ? ' room' : ' rooms'));
    var travelers = paxState.adults + paxState.children + (showClass ? paxState.infants : 0);
    parts.push(travelers + (travelers === 1 ? (showRooms ? ' guest' : ' adult') : (showRooms ? ' guests' : ' travelers')));
    if (showClass) {
      var classNames = { economy: 'Economy', premium: 'Premium', business: 'Business', first: 'First' };
      parts.push(classNames[paxState.cabin]);
    }
    return parts.join(', ');
  }

  function openPaxFor(fieldWrapper) {
    var showClass = fieldWrapper.dataset.showClass === 'true';
    var showRooms = fieldWrapper.dataset.showRooms === 'true';

    qs('[data-pax-rooms]', paxPopup).hidden = !showRooms;
    qs('[data-pax-infants]', paxPopup).hidden = !showClass;
    qs('[data-pax-class]', paxPopup).hidden = !showClass;

    paxActiveField = fieldWrapper;
    updatePaxCounterUI();
    positionPopup(paxPopup, fieldWrapper);
    showPopup(paxPopup);
  }

  qs('[data-pax-done]', paxPopup).addEventListener('click', function () {
    if (paxActiveField) {
      var trigger = qs('[data-pax-trigger]', paxActiveField);
      var showClass = paxActiveField.dataset.showClass === 'true';
      var showRooms = paxActiveField.dataset.showRooms === 'true';
      trigger.textContent = paxLabel(showClass, showRooms);
    }
    hidePopup(paxPopup);
  });

  qsa('[data-passenger]').forEach(function (field) {
    var trigger = qs('[data-pax-trigger]', field);
    trigger.addEventListener('click', function () {
      closeAllPopups();
      openPaxFor(field);
    });
  });

  /* ------------------------------------------------------------------
     7) POPUP POSITIONING + OUTSIDE-CLICK / ESCAPE HANDLING
  ------------------------------------------------------------------ */
  function positionPopup(popup, anchorEl) {
    var rect = anchorEl.getBoundingClientRect();
    var popupWidth = popup.offsetWidth || 320;
    var left = rect.left;
    if (left + popupWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popupWidth - 12);
    }
    popup.style.top = (rect.bottom + 8) + 'px';
    popup.style.left = left + 'px';
  }

  function showPopup(popup) { popup.hidden = false; }
  function hidePopup(popup) { popup.hidden = true; }

  function closeAllPopups(exceptSuggestPanel) {
    hidePopup(calPopup);
    hidePopup(paxPopup);
    qsa('.tvl-suggest-panel').forEach(function (p) {
      if (p !== exceptSuggestPanel) hideSuggestPanel(p);
    });
  }

  document.addEventListener('click', function (e) {
    var isInsidePopup = e.target.closest('.tvl-popup') || e.target.closest('[data-datepicker]') ||
      e.target.closest('[data-passenger]') || e.target.closest('[data-suggest]');
    if (!isInsidePopup) closeAllPopups();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllPopups();
  });

  window.addEventListener('resize', function () { closeAllPopups(); });

  /* ------------------------------------------------------------------
     8) SEARCH SUBMIT — mocked (no backend yet)
  ------------------------------------------------------------------ */
  panels.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var mode = form.dataset.panel;
      var btn = qs('.tvl-search-btn', form);
      var spinner = qs('.tvl-spinner', btn);
      if (btn.classList.contains('tvl-loading')) return;

      var originInput = qs('[data-field="origin"] input, [data-field="destination"] input', form);
      var destInput = form.querySelectorAll('[data-field="destination"] input')[0];
      var origin = qs('[data-field="origin"] input', form);

      btn.classList.add('tvl-loading');
      btn.disabled = true;
      spinner.hidden = false;

      // TODO: replace this timeout with a real fetch()/form submit to your
      // Django search endpoint once it exists.
      setTimeout(function () {
        writeHistory(mode, origin ? origin.value : '', destInput ? destInput.value : '');
        btn.classList.remove('tvl-loading');
        btn.disabled = false;
        spinner.hidden = true;
      }, 900);
    });
  });

  /* ------------------------------------------------------------------
     9) INITIAL MODE FROM URL (best-effort; see note at top of file)
  ------------------------------------------------------------------ */
  (function initialMode() {
    var path = window.location.pathname;
    var match = tabs.filter(function (t) { return t.dataset.url === path; })[0];
    activateMode(match ? match.dataset.mode : 'flight', false);
  })();

})();