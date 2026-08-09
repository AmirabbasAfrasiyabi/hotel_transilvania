/* ==========================================================================
   TRAVELISTA — hero-search.js
   Drives the homepage Hero search card: location autocomplete + search
   history, departure/return calendar range picker, passenger & class
   selector, and the reverse (swap origin/destination) button.

   Everything here is FRONTEND-ONLY / MOCKED for the build phase.
   Every spot that should eventually talk to the backend is marked
   with a // TODO(backend) comment.
   ========================================================================== */

(function () {
  'use strict';

  var form = document.getElementById('heroSearchForm');
  if (!form) return; // Hero not present on this page — nothing to do.

  /* ------------------------------------------------------------------
     1. MOCK DATA
     TODO(backend): replace with a real /api/locations/?q= endpoint and
     a real /api/search-history/ endpoint (scoped to the logged-in user).
     ------------------------------------------------------------------ */
  var LOCATIONS = [
    { city: 'Dubai', code: 'DXB', country: 'United Arab Emirates', type: 'Airport' },
    { city: 'Istanbul', code: 'IST', country: 'Türkiye', type: 'Airport' },
    { city: 'Paris', code: 'CDG', country: 'France', type: 'Airport' },
    { city: 'London', code: 'LHR', country: 'United Kingdom', type: 'Airport' },
    { city: 'Tokyo', code: 'HND', country: 'Japan', type: 'Airport' },
    { city: 'New York', code: 'JFK', country: 'United States', type: 'Airport' },
    { city: 'Rome', code: 'FCO', country: 'Italy', type: 'Airport' },
    { city: 'Barcelona', code: 'BCN', country: 'Spain', type: 'Airport' },
    { city: 'Bangkok', code: 'BKK', country: 'Thailand', type: 'Airport' },
    { city: 'Berlin', code: 'BER', country: 'Germany', type: 'Airport' },
    { city: 'Tehran', code: 'IKA', country: 'Iran', type: 'Airport' },
    { city: 'Amsterdam', code: 'AMS', country: 'Netherlands', type: 'Airport' },
    { city: 'Vienna', code: 'VIE', country: 'Austria', type: 'Airport' },
    { city: 'Cairo', code: 'CAI', country: 'Egypt', type: 'Airport' },
    { city: 'Kuala Lumpur', code: 'KUL', country: 'Malaysia', type: 'Airport' }
  ];

  var SEARCH_HISTORY = [
    { from: 'Tehran', to: 'Dubai' },
    { from: 'Berlin', to: 'Paris' },
    { from: 'Istanbul', to: 'London' }
  ];

  /* ------------------------------------------------------------------
     2. AUTOCOMPLETE (origin + destination)
     ------------------------------------------------------------------ */
  function setupAutocomplete(inputId, panelId) {
    var input = document.getElementById(inputId);
    var panel = document.getElementById(panelId);
    if (!input || !panel) return;

    function renderHistory() {
      var html = '<div class="hsf-group-label">Recent searches</div>';
      SEARCH_HISTORY.forEach(function (h) {
        html += suggestionRow('fa-solid fa-clock-rotate-left', h.from + ' \u2192 ' + h.to, '', h.from);
      });
      html += '<div class="hsf-group-label">Popular destinations</div>';
      LOCATIONS.slice(0, 6).forEach(function (loc) {
        html += suggestionRow('fa-solid fa-location-dot', loc.city, loc.code + ' \u2022 ' + loc.country, loc.city);
      });
      panel.innerHTML = html;
    }

    function renderMatches(query) {
      var q = query.trim().toLowerCase();
      var matches = LOCATIONS.filter(function (loc) {
        return loc.city.toLowerCase().indexOf(q) === 0 || loc.code.toLowerCase().indexOf(q) === 0;
      });
      if (!matches.length) {
        panel.innerHTML = '<div class="hsf-group-label">No matches — try another city or airport code</div>';
        return;
      }
      var html = '<div class="hsf-group-label">Cities & airports</div>';
      matches.forEach(function (loc) {
        html += suggestionRow('fa-solid fa-plane-departure', loc.city, loc.code + ' \u2022 ' + loc.type, loc.city);
      });
      panel.innerHTML = html;
    }

    function suggestionRow(icon, title, detail, value) {
      return (
        '<button type="button" class="hsf-suggestion-item" role="option" data-value="' + escapeHtml(value) + '">' +
        '<i class="' + icon + '" aria-hidden="true"></i>' +
        '<span><span class="sugg-city">' + escapeHtml(title) + '</span>' +
        (detail ? '<span class="sugg-detail">' + escapeHtml(detail) + '</span>' : '') +
        '</span></button>'
      );
    }

    function openPanel() {
      panel.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function closePanel() {
      panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    }

    input.addEventListener('focus', function () {
      if (input.value.trim() === '') {
        renderHistory();
      } else {
        renderMatches(input.value);
      }
      openPanel();
    });

    input.addEventListener('input', function () {
      if (input.value.trim() === '') {
        renderHistory();
      } else {
        renderMatches(input.value);
      }
      openPanel();
    });

    panel.addEventListener('click', function (e) {
      var item = e.target.closest('.hsf-suggestion-item');
      if (!item) return;
      input.value = item.getAttribute('data-value');
      closePanel();
    });

    document.addEventListener('click', function (e) {
      if (e.target !== input && !panel.contains(e.target)) {
        closePanel();
      }
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  setupAutocomplete('originInput', 'originSuggestions');
  setupAutocomplete('destInput', 'destSuggestions');

  /* ------------------------------------------------------------------
     3. REVERSE (swap origin / destination)
     ------------------------------------------------------------------ */
  var reverseBtn = document.getElementById('reverseBtn');
  var originInput = document.getElementById('originInput');
  var destInput = document.getElementById('destInput');

  if (reverseBtn && originInput && destInput) {
    reverseBtn.addEventListener('click', function () {
      var tmp = originInput.value;
      originInput.value = destInput.value;
      destInput.value = tmp;

      reverseBtn.classList.add('is-swapping');
      window.setTimeout(function () {
        reverseBtn.classList.remove('is-swapping');
      }, 350);
    });
  }

  /* ------------------------------------------------------------------
     4. CALENDAR RANGE PICKER (depart / return)
     ------------------------------------------------------------------ */
  var dateTrigger = document.getElementById('dateTrigger');
  var dateTriggerText = document.getElementById('dateTriggerText');
  var calendarPopup = document.getElementById('calendarPopup');
  var calMonths = document.getElementById('calMonths');
  var calRangeHint = document.getElementById('calRangeHint');
  var calDoneBtn = document.getElementById('calDoneBtn');
  var departHiddenInput = document.getElementById('departDateHidden');
  var returnHiddenInput = document.getElementById('returnDateHidden');

  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  var rangeStart = null;
  var rangeEnd = null;

  function formatShort(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatISO(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function buildMonthTable(monthDate, monthIndexOffset) {
    var year = monthDate.getFullYear();
    var month = monthDate.getMonth();
    var firstDow = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    var html = '<div class="cal-month">';
    html += '<div class="cal-month-head">';
    html += '<button type="button" class="cal-nav-btn" data-nav="prev" ' + (monthIndexOffset === 0 ? '' : 'style="visibility:hidden"') + ' aria-label="Previous month">&lsaquo;</button>';
    html += '<h6>' + MONTH_NAMES[month] + ' ' + year + '</h6>';
    html += '<button type="button" class="cal-nav-btn" data-nav="next" ' + (monthIndexOffset === 1 ? '' : 'style="visibility:hidden"') + ' aria-label="Next month">&rsaquo;</button>';
    html += '</div>';
    html += '<div class="cal-grid">';
    DOW_LABELS.forEach(function (d) { html += '<div class="cal-dow">' + d + '</div>'; });

    for (var i = 0; i < firstDow; i++) {
      html += '<div></div>';
    }
    for (var d = 1; d <= daysInMonth; d++) {
      var thisDate = new Date(year, month, d);
      var isPast = thisDate < today;
      var classes = ['cal-day'];
      if (rangeStart && sameDay(thisDate, rangeStart)) classes.push('is-selected');
      if (rangeEnd && sameDay(thisDate, rangeEnd)) classes.push('is-selected');
      if (rangeStart && rangeEnd && thisDate > rangeStart && thisDate < rangeEnd) classes.push('is-in-range');
      html += '<button type="button" class="' + classes.join(' ') + '" data-date="' + formatISO(thisDate) + '" ' + (isPast ? 'disabled' : '') + '>' + d + '</button>';
    }
    html += '</div></div>';
    return html;
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function renderCalendar() {
    var nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    calMonths.innerHTML = buildMonthTable(visibleMonth, 0) + buildMonthTable(nextMonth, 1);

    if (!rangeStart) {
      calRangeHint.textContent = 'Select a departure date';
    } else if (rangeStart && !rangeEnd) {
      calRangeHint.textContent = 'Departing ' + formatShort(rangeStart) + ' — now pick a return date';
    } else {
      calRangeHint.textContent = formatShort(rangeStart) + ' \u2192 ' + formatShort(rangeEnd);
    }
  }

  function openCalendar() {
    calendarPopup.hidden = false;
    renderCalendar();
  }

  function closeCalendar() {
    calendarPopup.hidden = true;
  }

  if (dateTrigger && calendarPopup) {
    dateTrigger.addEventListener('click', function () {
      calendarPopup.hidden ? openCalendar() : closeCalendar();
    });

    calMonths.addEventListener('click', function (e) {
      var navBtn = e.target.closest('.cal-nav-btn');
      if (navBtn) {
        var dir = navBtn.getAttribute('data-nav') === 'next' ? 1 : -1;
        visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + dir, 1);
        renderCalendar();
        return;
      }

      var dayBtn = e.target.closest('.cal-day');
      if (!dayBtn || dayBtn.disabled) return;
      var picked = new Date(dayBtn.getAttribute('data-date') + 'T00:00:00');

      if (!rangeStart || (rangeStart && rangeEnd)) {
        rangeStart = picked;
        rangeEnd = null;
      } else if (picked < rangeStart) {
        rangeStart = picked;
      } else {
        rangeEnd = picked;
      }
      renderCalendar();
    });

    calDoneBtn.addEventListener('click', function () {
      if (rangeStart) {
        departHiddenInput.value = formatISO(rangeStart);
        dateTriggerText.textContent = rangeEnd
          ? formatShort(rangeStart) + ' \u2192 ' + formatShort(rangeEnd)
          : formatShort(rangeStart) + ' \u2192 Return?';
      }
      if (rangeEnd) {
        returnHiddenInput.value = formatISO(rangeEnd);
      }
      closeCalendar();
    });

    document.addEventListener('click', function (e) {
      if (!calendarPopup.hidden && !calendarPopup.contains(e.target) && e.target !== dateTrigger && !dateTrigger.contains(e.target)) {
        closeCalendar();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCalendar();
    });
  }

  /* ------------------------------------------------------------------
     5. PASSENGER & CLASS SELECTOR
     ------------------------------------------------------------------ */
  var passengerTrigger = document.getElementById('passengerTrigger');
  var passengerTriggerText = document.getElementById('passengerTriggerText');
  var passengerPopup = document.getElementById('passengerPopup');
  var paxApplyBtn = document.getElementById('paxApplyBtn');

  var paxCounts = { adults: 1, children: 0, infants: 0 };
  var cabinClass = 'Economy';

  function openPassengerPopup() {
    passengerPopup.hidden = false;
    passengerTrigger.setAttribute('aria-expanded', 'true');
  }

  function closePassengerPopup() {
    passengerPopup.hidden = true;
    passengerTrigger.setAttribute('aria-expanded', 'false');
  }

  if (passengerTrigger && passengerPopup) {
    passengerTrigger.addEventListener('click', function () {
      passengerPopup.hidden ? openPassengerPopup() : closePassengerPopup();
    });

    passengerPopup.addEventListener('click', function (e) {
      var stepBtn = e.target.closest('.pax-btn');
      if (stepBtn) {
        var stepper = stepBtn.closest('.pax-stepper');
        var key = stepper.getAttribute('data-pax');
        var min = parseInt(stepper.getAttribute('data-min'), 10);
        var max = parseInt(stepper.getAttribute('data-max'), 10);
        var delta = stepBtn.getAttribute('data-action') === 'inc' ? 1 : -1;
        paxCounts[key] = Math.min(max, Math.max(min, paxCounts[key] + delta));
        stepper.querySelector('.pax-count').textContent = paxCounts[key];
        return;
      }

      var classBtn = e.target.closest('.pax-class-btn');
      if (classBtn) {
        passengerPopup.querySelectorAll('.pax-class-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        classBtn.classList.add('active');
        cabinClass = classBtn.getAttribute('data-class');
      }
    });

    paxApplyBtn.addEventListener('click', function () {
      document.getElementById('adultsHidden').value = paxCounts.adults;
      document.getElementById('childrenHidden').value = paxCounts.children;
      document.getElementById('infantsHidden').value = paxCounts.infants;
      document.getElementById('cabinClassHidden').value = cabinClass;

      var totalPax = paxCounts.adults + paxCounts.children + paxCounts.infants;
      passengerTriggerText.textContent = totalPax + (totalPax === 1 ? ' Traveler, ' : ' Travelers, ') + cabinClass;
      closePassengerPopup();
    });

    document.addEventListener('click', function (e) {
      if (!passengerPopup.hidden && !passengerPopup.contains(e.target) && e.target !== passengerTrigger && !passengerTrigger.contains(e.target)) {
        closePassengerPopup();
      }
    });
  }

  /* ------------------------------------------------------------------
     6. FORM SUBMIT — mocked loading state
     TODO(backend): replace with a real submit to the transport search
     results endpoint/view once it exists.
     ------------------------------------------------------------------ */
  var submitBtn = document.getElementById('heroSearchSubmit');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!submitBtn) return;

    submitBtn.querySelector('.btn-label').hidden = true;
    submitBtn.querySelector('.btn-loading').hidden = false;
    submitBtn.disabled = true;

    // TODO(backend): swap this timeout for the real fetch/redirect once
    // the search results endpoint exists.
    window.setTimeout(function () {
      submitBtn.querySelector('.btn-label').hidden = false;
      submitBtn.querySelector('.btn-loading').hidden = true;
      submitBtn.disabled = false;
    }, 900);
  });
})();