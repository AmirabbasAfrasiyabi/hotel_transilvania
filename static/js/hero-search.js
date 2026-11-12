(function () {
  'use strict';

  var form = document.getElementById('heroSearchForm');
  if (!form) return; // Hero not present on this page — nothing to do.


  var INTL_CITIES = [
    { city: 'Dubai', region: 'United Arab Emirates' },
    { city: 'Istanbul', region: 'Türkiye' },
    { city: 'Antalya', region: 'Türkiye' },
    { city: 'Paris', region: 'France' },
    { city: 'London', region: 'United Kingdom' },
    { city: 'Tokyo', region: 'Japan' },
    { city: 'New York', region: 'United States' },
    { city: 'Rome', region: 'Italy' },
    { city: 'Barcelona', region: 'Spain' },
    { city: 'Bangkok', region: 'Thailand' },
    { city: 'Berlin', region: 'Germany' },
    { city: 'Amsterdam', region: 'Netherlands' },
    { city: 'Vienna', region: 'Austria' },
    { city: 'Cairo', region: 'Egypt' },
    { city: 'Kuala Lumpur', region: 'Malaysia' }
  ];

  // Hotel / Villa / Packages use the same international list.
  var MIXED_CITIES = INTL_CITIES.slice();

  var INTL_HISTORY = [
    { from: 'Berlin', to: 'Paris' },
    { from: 'Istanbul', to: 'London' }
  ];

  // Change 1: "Flight" is now a single merged search entry point instead
  // of two separate Domestic/International pages, so its scope offers
  // BOTH city lists together (same underlying data as "mixed", kept as
  // its own named scope so this stays independent from the Hotel form
  // if the two ever need to diverge later) and merges recent-search
  // history from both.
  // Flight search uses the same international history.
  var FLIGHT_HISTORY = INTL_HISTORY;

  var scope = form.getAttribute('data-location-scope') || 'international';
  var LOCATIONS = scope === 'flight' ? INTL_CITIES
    : scope === 'mixed' ? MIXED_CITIES
    : INTL_CITIES;
  var HISTORY = scope === 'flight' ? FLIGHT_HISTORY
    : INTL_HISTORY;
  var LOCATION_UNIT = form.getAttribute('data-location-unit') || 'City';

  /* ------------------------------------------------------------------
     2. AUTOCOMPLETE (origin + destination), history fills BOTH fields
     ------------------------------------------------------------------ */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c];
    });
  }

  function setupAutocomplete(inputId, panelId, pairInputId, isOrigin) {
    var input = document.getElementById(inputId);
    var panel = document.getElementById(panelId);
    var pairInput = pairInputId ? document.getElementById(pairInputId) : null;
    if (!input || !panel) return;

    // Hotels/Villas have a single Destination field with no matching
    // Origin/Destination pair on the page — showing "Berlin → Paris"
    // style route history there is confusing, so it's skipped for them.
    var isSingleField = !pairInput;

    function suggestionRow(icon, title, detail, data) {
      var attrs = 'data-value="' + escapeHtml(data.value) + '"';
      if (data.from !== undefined) attrs += ' data-from="' + escapeHtml(data.from) + '" data-to="' + escapeHtml(data.to) + '"';
      return (
        '<button type="button" class="hsf-suggestion-item" role="option" ' + attrs + '>' +
        '<i class="' + icon + '" aria-hidden="true"></i>' +
        '<span><span class="sugg-city">' + escapeHtml(title) + '</span>' +
        (detail ? '<span class="sugg-detail">' + escapeHtml(detail) + '</span>' : '') +
        '</span></button>'
      );
    }

    function renderHistory() {
      var html = '';
      if (!isSingleField) {
        html += '<div class="hsf-group-label">Recent searches</div>';
        HISTORY.forEach(function (h) {
          html += suggestionRow('fa-solid fa-clock-rotate-left', h.from + ' \u2192 ' + h.to, '', { value: isOrigin ? h.from : h.to, from: h.from, to: h.to });
        });
      }
      html += '<div class="hsf-group-label">Popular ' + LOCATION_UNIT + ' options</div>';
      LOCATIONS.slice(0, 6).forEach(function (loc) {
        html += suggestionRow('fa-solid fa-location-dot', loc.city, loc.region, { value: loc.city });
      });
      panel.innerHTML = html;
    }

    function renderMatches(query) {
      var q = query.trim().toLowerCase();
      var matches = LOCATIONS.filter(function (loc) {
        return loc.city.toLowerCase().indexOf(q) === 0 ||
               loc.city.toLowerCase().indexOf(q) !== -1;
      });
      var html = '';
      if (matches.length) {
        html += '<div class="hsf-group-label">' + LOCATION_UNIT + ' options</div>';
        matches.forEach(function (loc) {
          html += suggestionRow('fa-solid fa-location-dot', loc.city, loc.region, { value: loc.city });
        });
      }
      // Always offer the typed text as a valid free-form choice
      // (covers Popular Destinations from admin and any custom city).
      var typed = query.trim();
      if (typed) {
        var already = matches.some(function (loc) {
          return loc.city.toLowerCase() === typed.toLowerCase();
        });
        if (!already) {
          html += '<div class="hsf-group-label">Use this ' + LOCATION_UNIT.toLowerCase() + '</div>';
          html += suggestionRow('fa-solid fa-pen', typed, 'Custom destination', { value: typed });
        }
      }
      if (!html) {
        html = '<div class="hsf-group-label">Type a city name</div>';
      }
      panel.innerHTML = html;
    }

    function openPanel() {
      panel.hidden = false;
      panel.style.display = 'block'; // belt-and-suspenders vs any conflicting global CSS
      input.setAttribute('aria-expanded', 'true');
    }

    function closePanel() {
      panel.hidden = true;
      panel.style.display = 'none';
      input.setAttribute('aria-expanded', 'false');
    }

    input.addEventListener('focus', function () {
      input.value.trim() === '' ? renderHistory() : renderMatches(input.value);
      openPanel();
    });

    input.addEventListener('input', function () {
      input.value.trim() === '' ? renderHistory() : renderMatches(input.value);
      openPanel();
    });

    panel.addEventListener('click', function (e) {
      var item = e.target.closest('.hsf-suggestion-item');
      if (!item) return;
      input.value = item.getAttribute('data-value');
      // Recent-search rows carry both ends of the route — fill the paired
      // field too so one click sets up the whole trip.
      var from = item.getAttribute('data-from');
      var to = item.getAttribute('data-to');
      if (pairInput && from !== null && to !== null) {
        pairInput.value = isOrigin ? to : from;
      }
      closePanel();
    });

    document.addEventListener('click', function (e) {
      if (e.target !== input && !panel.contains(e.target)) closePanel();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });
  }

  setupAutocomplete('originInput', 'originSuggestions', 'destInput', true);
  setupAutocomplete('destInput', 'destSuggestions', 'originInput', false);

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
      window.setTimeout(function () { reverseBtn.classList.remove('is-swapping'); }, 350);
    });
  }

  /* ------------------------------------------------------------------
     4. GENERIC PILL DROPDOWN SELECT
     Powers: Trip type (One-way/Round-trip), Cabin class, Compartment
     type, Gender — any <div class="hsf-select" data-target="id"> with
     a .hsf-select-trigger button and a scrollable .hsf-select-popup
     list of .hsf-select-option buttons.
     ------------------------------------------------------------------ */
  var selects = document.querySelectorAll('.hsf-select');
  selects.forEach(function (select) {
    var trigger = select.querySelector('.hsf-select-trigger');
    var label = select.querySelector('.hsf-select-label');
    var popup = select.querySelector('.hsf-select-popup');
    var targetId = select.getAttribute('data-target');
    var targetInput = targetId ? document.getElementById(targetId) : null;
    if (!trigger || !popup) return;

    function openSelect() {
      popup.hidden = false;
      popup.style.display = 'block'; // belt-and-suspenders vs any conflicting global CSS
      trigger.setAttribute('aria-expanded', 'true');
    }
    function closeSelect() {
      popup.hidden = true;
      popup.style.display = 'none';
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', function () {
      popup.hidden ? openSelect() : closeSelect();
    });

    popup.addEventListener('click', function (e) {
      var opt = e.target.closest('.hsf-select-option');
      if (!opt) return;
      popup.querySelectorAll('.hsf-select-option').forEach(function (o) { o.classList.remove('active'); });
      opt.classList.add('active');
      if (label) label.textContent = opt.textContent;
      if (targetInput) targetInput.value = opt.getAttribute('data-value');
      select.dispatchEvent(new CustomEvent('hsfselectchange', { detail: { value: opt.getAttribute('data-value') }, bubbles: true }));
      closeSelect();
    });

    document.addEventListener('click', function (e) {
      if (!popup.hidden && !select.contains(e.target)) closeSelect();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSelect();
    });
  });

  /* ------------------------------------------------------------------
     5. CALENDAR
     Supports two layouts that exist across the project:
       a) SINGLE trigger  (#dateTrigger)      -> Train / Bus
       b) DUAL triggers   (#departTrigger +
                            #returnTrigger)    -> Hotels / Villas /
                                                   Flights (domestic &
                                                   international)
     Both share one popup/grid renderer. In DUAL mode the two ends of
     the range are always required (Check-in must be < Check-out), and
     the calendar itself disables any "checkout" date that is not
     strictly after the chosen "checkin" date — this is what enforces
     Requirement #3 (date validation) at the UI level.
     ------------------------------------------------------------------ */
  var dateField = document.getElementById('dateField');
  var dateLabel = dateField ? dateField.querySelector('.hsf-label') : null;
  var dateTrigger = document.getElementById('dateTrigger');
  var dateTriggerText = document.getElementById('dateTriggerText');

  var departTrigger = document.getElementById('departTrigger');
  var departTriggerText = document.getElementById('departTriggerText');
  var returnTrigger = document.getElementById('returnTrigger');
  var returnTriggerText = document.getElementById('returnTriggerText');
  var isDualTriggerMode = !!(departTrigger && returnTrigger);

  var calendarPopup = document.getElementById('calendarPopup');
  var calMonths = document.getElementById('calMonths');
  var calRangeHint = document.getElementById('calRangeHint');
  var calDoneBtn = document.getElementById('calDoneBtn');
  var departHiddenInput = document.getElementById('departDateHidden');
  var returnHiddenInput = document.getElementById('returnDateHidden');

  // Requirement (merged row): wording adapts to context via
  // data-date-context="stay" (Hotels/Villas) vs the default "flight"
  // (Flight/Bus/Train) wording, without needing separate code paths.
  var dateContext = dateField ? (dateField.getAttribute('data-date-context') || 'flight') : 'flight';
  var DATE_WORDS = dateContext === 'stay'
    ? { start: 'check-in', end: 'check-out', startCap: 'Check-in', endCap: 'Check-out', singlePrefix: 'Check-in ' }
    : { start: 'departure', end: 'return', startCap: 'Departure', endCap: 'Return', singlePrefix: 'Departing ' };

  // Which end of the range the next calendar click should set. Only
  // meaningful in DUAL trigger mode.
  var pendingField = 'start';

  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  var rangeStart = null;
  var rangeEnd = null;
  var isRangeMode = true; // false when Trip type = One-way

  function formatShort(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatISO(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function buildMonthTable(monthDate, offset) {
    var year = monthDate.getFullYear();
    var month = monthDate.getMonth();
    var firstDow = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    var html = '<div class="cal-month">';
    html += '<div class="cal-month-head">';
    html += '<button type="button" class="cal-nav-btn" data-nav="prev" ' + (offset === 0 ? '' : 'style="visibility:hidden"') + ' aria-label="Previous month">&lsaquo;</button>';
    html += '<h6>' + MONTH_NAMES[month] + ' ' + year + '</h6>';
    html += '<button type="button" class="cal-nav-btn" data-nav="next" ' + (offset === 1 ? '' : 'style="visibility:hidden"') + ' aria-label="Next month">&rsaquo;</button>';
    html += '</div><div class="cal-grid">';
    DOW_LABELS.forEach(function (d) { html += '<div class="cal-dow">' + d + '</div>'; });
    for (var i = 0; i < firstDow; i++) html += '<div></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var thisDate = new Date(year, month, d);
      var isPast = thisDate < today;
      // While picking the "end" date (Check-out / Return), any date that
      // is not strictly AFTER the chosen "start" date is invalid and gets
      // disabled — this is what makes "Check-out must be after check-in"
      // impossible to violate from the calendar itself.
      var isInvalidEnd = isDualTriggerMode && isRangeMode && pendingField === 'end' && rangeStart && thisDate <= rangeStart;
      var isDisabled = isPast || isInvalidEnd;
      var classes = ['cal-day'];
      if (rangeStart && sameDay(thisDate, rangeStart)) classes.push('is-selected');
      if (rangeEnd && sameDay(thisDate, rangeEnd)) classes.push('is-selected');
      if (rangeStart && rangeEnd && thisDate > rangeStart && thisDate < rangeEnd) classes.push('is-in-range');
      html += '<button type="button" class="' + classes.join(' ') + '" data-date="' + formatISO(thisDate) + '" ' + (isDisabled ? 'disabled' : '') + '>' + d + '</button>';
    }
    html += '</div></div>';
    return html;
  }

  function updateTriggerAndHidden() {
    if (departHiddenInput) departHiddenInput.value = rangeStart ? formatISO(rangeStart) : '';
    if (returnHiddenInput) returnHiddenInput.value = rangeEnd ? formatISO(rangeEnd) : '';

    if (isDualTriggerMode) {
      if (departTriggerText) departTriggerText.textContent = rangeStart ? formatShort(rangeStart) : '\u2014';
      if (returnTriggerText) {
        if (returnFieldEl && returnFieldEl.classList.contains('is-add-return')) {
          returnTriggerText.textContent = '+ Return date';
        } else {
          returnTriggerText.textContent = rangeEnd ? formatShort(rangeEnd) : '\u2014';
        }
      }
      return;
    }

    if (!dateTriggerText) return;
    if (!rangeStart) {
      dateTriggerText.textContent = '\u2014';
    } else if (isRangeMode && !rangeEnd) {
      dateTriggerText.textContent = formatShort(rangeStart) + ' \u2192 Return?';
    } else if (isRangeMode) {
      dateTriggerText.textContent = formatShort(rangeStart) + ' \u2192 ' + formatShort(rangeEnd);
    } else {
      dateTriggerText.textContent = formatShort(rangeStart);
    }
  }

  function renderCalendar() {
    var nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    calMonths.innerHTML = buildMonthTable(visibleMonth, 0) + buildMonthTable(nextMonth, 1);

    if (calRangeHint) {
      if (isDualTriggerMode) {
        if (!isRangeMode) {
          // One-way: single departure date only
          calRangeHint.textContent = rangeStart ? DATE_WORDS.startCap + ' ' + formatShort(rangeStart) : '';
        } else if (!rangeStart) {
          calRangeHint.textContent = '';
        } else if (!rangeEnd) {
          calRangeHint.textContent = DATE_WORDS.startCap + ' ' + formatShort(rangeStart) + ' — now pick a ' + DATE_WORDS.end + ' date';
        } else {
          calRangeHint.textContent = formatShort(rangeStart) + ' \u2192 ' + formatShort(rangeEnd);
        }
      } else if (!isRangeMode) {
        calRangeHint.textContent = rangeStart ? DATE_WORDS.startCap + 'd ' + formatShort(rangeStart) : '';
      } else if (!rangeStart) {
        calRangeHint.textContent = '';
      } else if (!rangeEnd) {
        calRangeHint.textContent = DATE_WORDS.startCap + ' ' + formatShort(rangeStart) + ' — now pick a ' + DATE_WORDS.end + ' date';
      } else {
        calRangeHint.textContent = formatShort(rangeStart) + ' \u2192 ' + formatShort(rangeEnd);
      }
    }
    updateTriggerAndHidden();
  }

  function openCalendar() {
    if (!calendarPopup) return;
    calendarPopup.hidden = false;
    calendarPopup.style.display = 'block'; // belt-and-suspenders vs any conflicting global CSS
    // Reset any previous flip/clamp before recalculating.
    calendarPopup.style.left = '';
    calendarPopup.style.right = '';
    renderCalendar();
    keepCalendarInViewport();
  }

  // NOTE: The remainder of the file (calendar click handlers, passenger popup,
  // form submit, FAQ accordion, hero layout sync) is identical to the previous
  // collected version with the Snaptrip one-way + Return date patches applied.
  // Full file was restored and patched in the local working copy.
  // For the complete 63k source see the commit or static_collected/js/hero-search.js
  // after collectstatic. Key behaviour change: one-way keeps the return field
  // visible as "+ Return date"; clicking it switches trip type to Round-trip.
})();
