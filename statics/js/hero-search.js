(function () {
  'use strict';

  var form = document.getElementById('heroSearchForm');
  if (!form) return; // Hero not present on this page — nothing to do.


  var IRAN_CITIES = [
    { city: 'Tehran', region: 'Tehran Province' },
    { city: 'Mashhad', region: 'Razavi Khorasan' },
    { city: 'Isfahan', region: 'Isfahan Province' },
    { city: 'Shiraz', region: 'Fars Province' },
    { city: 'Tabriz', region: 'East Azerbaijan' },
    { city: 'Ahvaz', region: 'Khuzestan' },
    { city: 'Kish Island', region: 'Hormozgan' },
    { city: 'Qeshm', region: 'Hormozgan' },
    { city: 'Bandar Abbas', region: 'Hormozgan' },
    { city: 'Kerman', region: 'Kerman Province' },
    { city: 'Rasht', region: 'Gilan' },
    { city: 'Yazd', region: 'Yazd Province' },
    { city: 'Kermanshah', region: 'Kermanshah Province' },
    { city: 'Urmia', region: 'West Azerbaijan' },
    { city: 'Zahedan', region: 'Sistan & Baluchestan' },
    { city: 'Qom', region: 'Qom Province' },
    { city: 'Sari', region: 'Mazandaran' }
  ];

  var INTL_CITIES = [
    { city: 'Dubai', region: 'United Arab Emirates' },
    { city: 'Istanbul', region: 'Türkiye' },
    { city: 'Antalya', region: 'Türkiye' },
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

  // Requirement (Hotel): both Iran AND international destinations, so
  // Hotel search gets the union of both lists.
  var MIXED_CITIES = IRAN_CITIES.concat(INTL_CITIES);

  // Requirement (Villa): Iran ONLY, and specifically resort/vacation
  // towns rather than the airport-oriented city list used by
  // Flight/Bus/Train — kept as its own list so it never mixes with the
  // Hotel destination system.
  var IRAN_VILLA_DESTINATIONS = [
    { city: 'Tehran', region: 'Tehran Province' },
    { city: 'Ramsar', region: 'Mazandaran' },
    { city: 'Chalus', region: 'Mazandaran' },
    { city: 'Kelardasht', region: 'Mazandaran' },
    { city: 'Sari', region: 'Mazandaran' },
    { city: 'Lahijan', region: 'Gilan' },
    { city: 'Rasht', region: 'Gilan' },
    { city: 'Masal', region: 'Gilan' },
    { city: 'Kish Island', region: 'Hormozgan' },
    { city: 'Qeshm', region: 'Hormozgan' },
    { city: 'Shiraz', region: 'Fars Province' },
    { city: 'Isfahan', region: 'Isfahan Province' }
  ];

  var IRAN_HISTORY = [
    { from: 'Tehran', to: 'Mashhad' },
    { from: 'Shiraz', to: 'Isfahan' },
    { from: 'Tabriz', to: 'Tehran' }
  ];

  var INTL_HISTORY = [
    { from: 'Tehran', to: 'Dubai' },
    { from: 'Berlin', to: 'Paris' },
    { from: 'Istanbul', to: 'London' }
  ];

  var scope = form.getAttribute('data-location-scope') || 'international';
  var LOCATIONS = scope === 'domestic' ? IRAN_CITIES
    : scope === 'villa' ? IRAN_VILLA_DESTINATIONS
    : scope === 'mixed' ? MIXED_CITIES
    : INTL_CITIES;
  var HISTORY = scope === 'domestic' ? IRAN_HISTORY : INTL_HISTORY;
  var LOCATION_UNIT = form.getAttribute('data-location-unit') || 'City';

  /* ------------------------------------------------------------------
     2. AUTOCOMPLETE (origin + destination), history fills BOTH fields
     ------------------------------------------------------------------ */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function setupAutocomplete(inputId, panelId, pairInputId, isOrigin) {
    var input = document.getElementById(inputId);
    var panel = document.getElementById(panelId);
    var pairInput = pairInputId ? document.getElementById(pairInputId) : null;
    if (!input || !panel) return;

    // Hotels/Villas have a single Destination field with no matching
    // Origin/Destination pair on the page — showing "Tehran → Mashhad"
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
        return loc.city.toLowerCase().indexOf(q) === 0;
      });
      if (!matches.length) {
        panel.innerHTML = '<div class="hsf-group-label">No matches — try another city</div>';
        return;
      }
      var html = '<div class="hsf-group-label">' + LOCATION_UNIT + ' options</div>';
      matches.forEach(function (loc) {
        html += suggestionRow('fa-solid fa-location-dot', loc.city, loc.region, { value: loc.city });
      });
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
      if (departTriggerText) departTriggerText.textContent = rangeStart ? formatShort(rangeStart) : 'Select date';
      if (returnTriggerText) returnTriggerText.textContent = rangeEnd ? formatShort(rangeEnd) : 'Select date';
      return;
    }

    if (!dateTriggerText) return;
    if (!rangeStart) {
      dateTriggerText.textContent = isRangeMode ? 'Select dates' : 'Select a date';
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
        if (!rangeStart) {
          calRangeHint.textContent = 'Select a ' + DATE_WORDS.start + ' date';
        } else if (!rangeEnd) {
          calRangeHint.textContent = DATE_WORDS.startCap + ' ' + formatShort(rangeStart) + ' — now pick a ' + DATE_WORDS.end + ' date';
        } else {
          calRangeHint.textContent = formatShort(rangeStart) + ' \u2192 ' + formatShort(rangeEnd);
        }
      } else if (!isRangeMode) {
        calRangeHint.textContent = rangeStart ? DATE_WORDS.startCap + 'd ' + formatShort(rangeStart) : 'Select your travel date';
      } else if (!rangeStart) {
        calRangeHint.textContent = 'Select a ' + DATE_WORDS.start + ' date';
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

  // Requirement #6: the calendar must stay fully inside the visible
  // viewport (and, in practice, inside the search card) instead of
  // spilling off the right edge — which is what happens by default once
  // the date fields sit in the rightmost column of the merged row.
  function keepCalendarInViewport() {
    if (!calendarPopup || calendarPopup.hidden) return;
    requestAnimationFrame(function () {
      var viewportWidth = document.documentElement.clientWidth;
      var margin = 8;
      var rect = calendarPopup.getBoundingClientRect();

      if (rect.right > viewportWidth - margin) {
        calendarPopup.style.left = 'auto';
        calendarPopup.style.right = '0';
      }

      var rectAfterFlip = calendarPopup.getBoundingClientRect();
      if (rectAfterFlip.left < margin) {
        // Still doesn't fit either side (very narrow screen) — pin it to
        // a fixed inset from the left instead of letting it run off.
        calendarPopup.style.left = margin + 'px';
        calendarPopup.style.right = 'auto';
      }
    });
  }

  window.addEventListener('resize', keepCalendarInViewport);

  function closeCalendar() {
    if (!calendarPopup) return;
    calendarPopup.hidden = true;
    calendarPopup.style.display = 'none';
  }

  function setRangeMode(rangeMode) {
    isRangeMode = rangeMode;
    rangeStart = null;
    rangeEnd = null;
    if (dateLabel) dateLabel.textContent = isRangeMode ? (DATE_WORDS.startCap + ' — ' + DATE_WORDS.endCap) : (DATE_WORDS.startCap + ' date');
    updateTriggerAndHidden();
  }

  // Any trigger button that can open this shared calendar popup — used
  // for the "click outside to close" check below, regardless of mode.
  var allDateTriggers = [dateTrigger, departTrigger, returnTrigger].filter(Boolean);

  function calendarClickedOutside(e) {
    if (calendarPopup.hidden) return false;
    if (calendarPopup.contains(e.target)) return false;
    return allDateTriggers.every(function (t) { return e.target !== t && !t.contains(e.target); });
  }

  if (calendarPopup && (dateTrigger || isDualTriggerMode)) {

    if (dateTrigger) {
      // SINGLE trigger mode (Train / Bus): unchanged behavior.
      dateTrigger.addEventListener('click', function () {
        pendingField = 'start';
        calendarPopup.hidden ? openCalendar() : closeCalendar();
      });
    }

    if (isDualTriggerMode) {
      // DUAL trigger mode (Hotels / Villas / Flights): clicking
      // "Check-in" always (re)starts the range; clicking "Check-out"
      // keeps the existing check-in and only asks for the end date.
      departTrigger.addEventListener('click', function () {
        pendingField = 'start';
        calendarPopup.hidden ? openCalendar() : renderCalendar();
      });
      returnTrigger.addEventListener('click', function () {
        pendingField = rangeStart ? 'end' : 'start';
        calendarPopup.hidden ? openCalendar() : renderCalendar();
      });
    }

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

      if (isDualTriggerMode) {
        // Check-out (pendingField "end") is only accepted if it's
        // strictly after Check-in — the calendar already disables
        // anything else, this is just a safety net.
        if (pendingField === 'end' && rangeStart && picked > rangeStart) {
          rangeEnd = picked;
          renderCalendar();
          window.setTimeout(closeCalendar, 300);
        } else {
          rangeStart = picked;
          rangeEnd = null;
          pendingField = 'end';
          renderCalendar(); // stay open so the user can immediately pick check-out
        }
        return;
      }

      if (!isRangeMode) {
        rangeStart = picked;
        rangeEnd = null;
        renderCalendar();
        window.setTimeout(closeCalendar, 250);
        return;
      }

      if (!rangeStart || (rangeStart && rangeEnd)) {
        rangeStart = picked;
        rangeEnd = null;
      } else if (picked < rangeStart) {
        rangeStart = picked;
      } else {
        rangeEnd = picked;
      }
      renderCalendar();
      if (rangeStart && rangeEnd) {
        window.setTimeout(closeCalendar, 350);
      }
    });

    if (calDoneBtn) {
      calDoneBtn.addEventListener('click', closeCalendar);
    }

    document.addEventListener('click', function (e) {
      if (calendarClickedOutside(e)) closeCalendar();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCalendar();
    });
  }

  // Hook the Trip type select (if present on this page) into the calendar,
  // and sync to whichever option starts active (pages can default differently).
  var tripTypeGroup = document.getElementById('tripTypeGroup');
  var returnFieldEl = document.getElementById('returnField');

  // Requirement #7/#9: One-way hides/disables the Return field entirely;
  // Round-trip brings it back. Clears any previously chosen return date.
  function setReturnFieldVisible(showReturn) {
    if (returnFieldEl) returnFieldEl.style.display = showReturn ? '' : 'none';
    if (!showReturn) {
      rangeEnd = null;
      pendingField = 'start';
      if (returnHiddenInput) returnHiddenInput.value = '';
      updateTriggerAndHidden();
    }
  }

  if (tripTypeGroup && dateTrigger) {
    // SINGLE trigger mode (kept for backward compatibility — no page
    // currently uses it, since Bus/Train were upgraded to dual fields).
    var initialOption = tripTypeGroup.querySelector('.hsf-select-option.active');
    if (initialOption) setRangeMode(initialOption.getAttribute('data-value') !== 'oneway');

    tripTypeGroup.addEventListener('hsfselectchange', function (e) {
      setRangeMode(e.detail.value !== 'oneway');
    });
  }

  if (tripTypeGroup && isDualTriggerMode) {
    var initialOptionDual = tripTypeGroup.querySelector('.hsf-select-option.active');
    if (initialOptionDual) setReturnFieldVisible(initialOptionDual.getAttribute('data-value') !== 'oneway');

    tripTypeGroup.addEventListener('hsfselectchange', function (e) {
      setReturnFieldVisible(e.detail.value !== 'oneway');
    });
  }

  /* ------------------------------------------------------------------
     6. PASSENGER SELECTOR (Adults / Children / Infants — class now
     lives in its own standalone chip-group, handled in section 4)
     ------------------------------------------------------------------ */
  var passengerTrigger = document.getElementById('passengerTrigger');
  var passengerTriggerText = document.getElementById('passengerTriggerText');
  var passengerPopup = document.getElementById('passengerPopup');
  var paxApplyBtn = document.getElementById('paxApplyBtn');

  var paxCounts = { adults: 1, children: 0, infants: 0 };
  document.querySelectorAll('.pax-stepper').forEach(function (stepper) {
    var key = stepper.getAttribute('data-pax');
    var startVal = parseInt(stepper.querySelector('.pax-count').textContent, 10);
    if (key && !isNaN(startVal)) paxCounts[key] = startVal;
  });

  function openPassengerPopup() {
    if (!passengerPopup) return;
    passengerPopup.hidden = false;
    passengerPopup.style.display = 'block'; // belt-and-suspenders vs any conflicting global CSS
    if (passengerTrigger) passengerTrigger.setAttribute('aria-expanded', 'true');
  }

  function closePassengerPopup() {
    if (!passengerPopup) return;
    passengerPopup.hidden = true;
    passengerPopup.style.display = 'none';
    if (passengerTrigger) passengerTrigger.setAttribute('aria-expanded', 'false');
  }

  function paxSummaryText() {
    var keys = Object.keys(paxCounts).filter(function (k) {
      return document.querySelector('.pax-stepper[data-pax="' + k + '"]');
    });
    var total = keys.reduce(function (sum, k) { return sum + paxCounts[k]; }, 0);
    return total + (total === 1 ? ' Traveler' : ' Travelers');
  }

  if (passengerTrigger && passengerPopup && !document.getElementById('roomsList')) {
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
        // Live-update the trigger label too, no need to wait for Apply.
        if (passengerTriggerText) passengerTriggerText.textContent = paxSummaryText();
        return;
      }

      // Backward-compat: hotels.html/tour.html still nest their Room
      // type / Travel style options inside this popup (old .pax-class-btn
      // pattern) rather than using the newer standalone .hsf-chip-group.
      var classBtn = e.target.closest('.pax-class-btn');
      if (classBtn) {
        passengerPopup.querySelectorAll('.pax-class-btn').forEach(function (b) { b.classList.remove('active'); });
        classBtn.classList.add('active');
        var classHidden = document.getElementById('cabinClassHidden');
        if (classHidden) classHidden.value = classBtn.getAttribute('data-class');
      }
    });

    if (paxApplyBtn) {
      paxApplyBtn.addEventListener('click', function () {
        var adultsHidden = document.getElementById('adultsHidden');
        var childrenHidden = document.getElementById('childrenHidden');
        var infantsHidden = document.getElementById('infantsHidden');
        if (adultsHidden) adultsHidden.value = paxCounts.adults;
        if (childrenHidden) childrenHidden.value = paxCounts.children;
        if (infantsHidden) infantsHidden.value = paxCounts.infants;
        if (passengerTriggerText) passengerTriggerText.textContent = paxSummaryText();
        closePassengerPopup();
      });
    }

    document.addEventListener('click', function (e) {
      if (!passengerPopup.hidden && !passengerPopup.contains(e.target) && e.target !== passengerTrigger && !passengerTrigger.contains(e.target)) {
        closePassengerPopup();
      }
    });
  }


  /* ------------------------------------------------------------------
     6b. ROOMS MANAGER (Hotels & Villas) — replaces the old single
     "Rooms" stepper with a real per-room Adults/Children breakdown.
     Each room is capped at MAX_PER_ROOM (4) guests, per Requirement #4.
     ------------------------------------------------------------------ */
  var roomsList = document.getElementById('roomsList');
  var MAX_PER_ROOM = 4;

  if (roomsList) {
    // BUGFIX: in rooms mode the old open/close click handler on
    // passengerTrigger was skipped entirely (it's gated to the legacy
    // stepper branch above), so the popup never opened. Wire it here.
    if (passengerTrigger && passengerPopup) {
      passengerTrigger.addEventListener('click', function () {
        passengerPopup.hidden ? openPassengerPopup() : closePassengerPopup();
      });
    }

    var addRoomBtn = document.getElementById('addRoomBtn');
    var maxRooms = parseInt(roomsList.getAttribute('data-max-rooms'), 10) || 8;
    var roomNoun = /bedroom/i.test((document.getElementById('infantsHidden') || {}).name || '') ? 'Bedroom' : 'Room';

    // Seed initial state from the two rooms that used to live in the old
    // single-room markup (adults/children hidden inputs), so a page that
    // still has adults=2/children=0 defaults keeps behaving the same.
    var seedAdults = parseInt((document.getElementById('adultsHidden') || {}).value, 10) || 2;
    var seedChildren = parseInt((document.getElementById('childrenHidden') || {}).value, 10) || 0;
    var rooms = [{ adults: Math.min(seedAdults, MAX_PER_ROOM), children: Math.min(seedChildren, MAX_PER_ROOM - Math.min(seedAdults, MAX_PER_ROOM)) }];

    function roomCard(room, index) {
      var adultsMax = MAX_PER_ROOM - room.children;
      var childrenMax = MAX_PER_ROOM - room.adults;
      return (
        '<div class="hsf-room-card" data-room-index="' + index + '">' +
          '<div class="hsf-room-card-head">' +
            '<strong>' + roomNoun + ' ' + (index + 1) + '</strong>' +
            (rooms.length > 1 ? '<button type="button" class="hsf-remove-room-btn" data-action="remove-room" aria-label="Remove room"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>' : '') +
          '</div>' +
          '<div class="pax-row">' +
            '<div class="pax-copy"><strong>Adults</strong><span>Guests 12+ years</span></div>' +
            '<div class="pax-stepper" data-room-pax="adults" data-min="1" data-max="' + adultsMax + '">' +
              '<button type="button" class="pax-btn" data-action="dec" aria-label="Decrease adults">\u2212</button>' +
              '<span class="pax-count">' + room.adults + '</span>' +
              '<button type="button" class="pax-btn" data-action="inc" aria-label="Increase adults">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="pax-row">' +
            '<div class="pax-copy"><strong>Children</strong><span>2\u201311 years</span></div>' +
            '<div class="pax-stepper" data-room-pax="children" data-min="0" data-max="' + childrenMax + '">' +
              '<button type="button" class="pax-btn" data-action="dec" aria-label="Decrease children">\u2212</button>' +
              '<span class="pax-count">' + room.children + '</span>' +
              '<button type="button" class="pax-btn" data-action="inc" aria-label="Increase children">+</button>' +
            '</div>' +
          '</div>' +
          '<p class="hsf-room-limit-msg" ' + (room.adults + room.children >= MAX_PER_ROOM ? '' : 'hidden') + '>Maximum ' + MAX_PER_ROOM + ' guests are allowed per room.</p>' +
        '</div>'
      );
    }

    function renderRooms() {
      roomsList.innerHTML = rooms.map(roomCard).join('');
      if (addRoomBtn) addRoomBtn.disabled = rooms.length >= maxRooms;
      updateRoomsSummary();
    }

    function updateRoomsSummary() {
      var totalAdults = 0, totalChildren = 0;
      rooms.forEach(function (r) { totalAdults += r.adults; totalChildren += r.children; });
      var totalGuests = totalAdults + totalChildren;

      var adultsHidden = document.getElementById('adultsHidden');
      var childrenHidden = document.getElementById('childrenHidden');
      var roomsCountHidden = document.getElementById('infantsHidden'); // legacy id, holds room/bedroom count
      var roomsDetailHidden = document.getElementById('roomsDetailHidden');
      if (adultsHidden) adultsHidden.value = totalAdults;
      if (childrenHidden) childrenHidden.value = totalChildren;
      if (roomsCountHidden) roomsCountHidden.value = rooms.length;
      if (roomsDetailHidden) roomsDetailHidden.value = JSON.stringify(rooms);

      if (passengerTriggerText) {
        passengerTriggerText.textContent = rooms.length + ' ' + roomNoun + (rooms.length === 1 ? '' : 's') + ', ' + totalGuests + ' Guest' + (totalGuests === 1 ? '' : 's');
      }
    }

    renderRooms();

    if (addRoomBtn) {
      addRoomBtn.addEventListener('click', function () {
        if (rooms.length >= maxRooms) return;
        rooms.push({ adults: 1, children: 0 });
        renderRooms();
      });
    }

    roomsList.addEventListener('click', function (e) {
      var removeBtn = e.target.closest('[data-action="remove-room"]');
      if (removeBtn) {
        var idx = parseInt(removeBtn.closest('.hsf-room-card').getAttribute('data-room-index'), 10);
        if (rooms.length > 1) rooms.splice(idx, 1);
        renderRooms();
        return;
      }

      var stepBtn = e.target.closest('.pax-btn');
      if (!stepBtn) return;
      var card = stepBtn.closest('.hsf-room-card');
      var idx2 = parseInt(card.getAttribute('data-room-index'), 10);
      var stepper = stepBtn.closest('.pax-stepper');
      var key = stepper.getAttribute('data-room-pax');
      var delta = stepBtn.getAttribute('data-action') === 'inc' ? 1 : -1;
      var room = rooms[idx2];
      var nextVal = room[key] + delta;
      var otherKey = key === 'adults' ? 'children' : 'adults';
      var floor = key === 'adults' ? 1 : 0;

      if (nextVal < floor) return; // respect the minimum (1 adult, 0 children)
      if (nextVal + room[otherKey] > MAX_PER_ROOM) return; // respect the 4-guests-per-room cap

      room[key] = nextVal;
      renderRooms();
    });

    if (paxApplyBtn) {
      paxApplyBtn.addEventListener('click', function () {
        updateRoomsSummary();
        closePassengerPopup();
      });
    }

    document.addEventListener('click', function (e) {
      if (!passengerPopup.hidden && !passengerPopup.contains(e.target) && e.target !== passengerTrigger && !passengerTrigger.contains(e.target)) {
        closePassengerPopup();
      }
    });
  }

  /* ------------------------------------------------------------------
     7. FORM VALIDATION (Requirement #18)
     Currently implemented for the Hotel / Villa layout (detected via
     the checkin_date/checkout_date field names both pages share).
     Shows/hides the shared #formErrorBox above the Search button and
     blocks submission until every rule passes.
     ------------------------------------------------------------------ */
  var formErrorBox = document.getElementById('formErrorBox');
  var formErrorText = document.getElementById('formErrorText');

  function showFormError(message) {
    if (!formErrorBox || !formErrorText) { window.alert(message); return; }
    formErrorText.textContent = message;
    formErrorBox.hidden = false;
  }

  function clearFormError() {
    if (formErrorBox) formErrorBox.hidden = true;
  }

  function validateHotelVillaForm() {
    var destinationInput = document.getElementById('originInput');
    if (!destinationInput || !destinationInput.value.trim()) {
      showFormError('Please select a destination.');
      if (destinationInput) destinationInput.focus();
      return false;
    }
    if (!departHiddenInput || !departHiddenInput.value) {
      showFormError('Please select a check-in date.');
      if (departTrigger) departTrigger.focus(); else if (dateTrigger) dateTrigger.focus();
      return false;
    }
    if (!returnHiddenInput || !returnHiddenInput.value) {
      showFormError('Please select a check-out date.');
      if (returnTrigger) returnTrigger.focus(); else if (dateTrigger) dateTrigger.focus();
      return false;
    }
    if (new Date(returnHiddenInput.value) <= new Date(departHiddenInput.value)) {
      showFormError('Check-out date must be after the check-in date.');
      return false;
    }
    if (roomsList) {
      var roomsDetailHidden = document.getElementById('roomsDetailHidden');
      var savedRooms = roomsDetailHidden && roomsDetailHidden.value ? JSON.parse(roomsDetailHidden.value) : [];
      var overLimit = savedRooms.some(function (r) { return (r.adults + r.children) > MAX_PER_ROOM; });
      if (overLimit) {
        showFormError('Maximum ' + MAX_PER_ROOM + ' guests are allowed per room.');
        return false;
      }
    }
    clearFormError();
    return true;
  }

  // Validation for Flight (domestic/international), Bus and Train — all
  // share the Origin/Destination + Departure/Return field set.
  function validateOriginDestinationForm() {
    var originInputEl = document.getElementById('originInput');
    var destInputEl = document.getElementById('destInput');

    if (!originInputEl || !originInputEl.value.trim()) {
      showFormError('Please select an origin.');
      if (originInputEl) originInputEl.focus();
      return false;
    }
    if (!destInputEl || !destInputEl.value.trim()) {
      showFormError('Please select a destination.');
      if (destInputEl) destInputEl.focus();
      return false;
    }
    if (originInputEl.value.trim().toLowerCase() === destInputEl.value.trim().toLowerCase()) {
      showFormError('Origin and destination cannot be the same.');
      return false;
    }
    if (!departHiddenInput || !departHiddenInput.value) {
      showFormError('Please select a departure date.');
      if (departTrigger) departTrigger.focus(); else if (dateTrigger) dateTrigger.focus();
      return false;
    }

    // Return date is only required while the Return field is actually
    // visible — i.e. Trip type = Round-trip. One-way hides #returnField
    // entirely (see setReturnFieldVisible), so its own display state is
    // the source of truth here.
    var returnRequired = !returnFieldEl || returnFieldEl.style.display !== 'none';
    if (returnRequired) {
      if (!returnHiddenInput || !returnHiddenInput.value) {
        showFormError('Please select a return date.');
        if (returnTrigger) returnTrigger.focus(); else if (dateTrigger) dateTrigger.focus();
        return false;
      }
      if (new Date(returnHiddenInput.value) <= new Date(departHiddenInput.value)) {
        showFormError('Return date must be after the departure date.');
        return false;
      }
    }

    clearFormError();
    return true;
  }

  // This page uses the Hotel/Villa field set when it has named
  // checkin_date/checkout_date inputs — that's the only reliable,
  // markup-based signal shared by hotels.html and village.html.
  var isHotelVillaForm = !!(form.querySelector('[name="checkin_date"]') && form.querySelector('[name="checkout_date"]'));

  // Flight/Bus/Train all share Origin + Destination named fields.
  var isOriginDestinationForm = !!(form.querySelector('[name="origin"]') && form.querySelector('[name="destination"]'));

  var submitBtn = document.getElementById('heroSearchSubmit');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (isHotelVillaForm && !validateHotelVillaForm()) {
      return; // stop here — error box is already showing the reason
    }
    if (isOriginDestinationForm && !validateOriginDestinationForm()) {
      return; // stop here — error box is already showing the reason
    }

    if (!submitBtn) return;
    var label = submitBtn.querySelector('.btn-label');
    var loading = submitBtn.querySelector('.btn-loading');
    if (label) label.hidden = true;
    if (loading) loading.hidden = false;
    submitBtn.disabled = true;

    window.setTimeout(function () {
      if (label) label.hidden = false;
      if (loading) loading.hidden = true;
      submitBtn.disabled = false;
    }, 900);
  });

/* ------------------------------------------------------------------
   7. POPULAR DESTINATIONS — Native Scroll-Snap Carousel
   (بدون وابستگی به Owl Carousel) + اتصال به سرچ‌بار
   ------------------------------------------------------------------ */
(function () {
  var track = document.getElementById('pdTrack');
  if (!track) return; // این بخش در این صفحه وجود ندارد

  var prevBtn = document.getElementById('pdPrevBtn');
  var nextBtn = document.getElementById('pdNextBtn');
  var scrollbar = document.getElementById('pdScrollbar');
  var thumb = document.getElementById('pdScrollbarThumb');

  // یک "قدم" ورق‌زدن = عرض یک کارت + gap
  function cardStep() {
    var card = track.querySelector('.pd-card');
    if (!card) return 200;
    var trackStyle = window.getComputedStyle(track);
    var gap = parseFloat(trackStyle.columnGap || trackStyle.gap) || 18;
    return card.getBoundingClientRect().width + gap;
  }

  function maxScroll() {
    return track.scrollWidth - track.clientWidth;
  }

  function updateNavState() {
    if (!prevBtn || !nextBtn) return;
    var max = maxScroll();
    prevBtn.disabled = track.scrollLeft <= 2;
    nextBtn.disabled = track.scrollLeft >= max - 2;
  }

  function updateScrollbar() {
    if (!thumb || !scrollbar) return;
    var max = maxScroll();
    var trackWidth = scrollbar.clientWidth;
    var visibleRatio = track.clientWidth / track.scrollWidth;
    var thumbWidth = Math.max(36, visibleRatio * trackWidth);
    var maxThumbLeft = trackWidth - thumbWidth;
    var ratio = max > 0 ? track.scrollLeft / max : 0;

    thumb.style.width = thumbWidth + 'px';
    thumb.style.transform = 'translateX(' + (ratio * maxThumbLeft) + 'px)';
  }

  function onScroll() {
    updateNavState();
    updateScrollbar();
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      track.scrollBy({ left: -cardStep(), behavior: 'smooth' });
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      track.scrollBy({ left: cardStep(), behavior: 'smooth' });
    });
  }

  track.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  // امکان کشیدن (drag) مستقیم روی خود اسکرول‌بار سفارشی
  if (thumb && scrollbar) {
    var isDragging = false, startX = 0, startScrollLeft = 0;

    thumb.addEventListener('mousedown', function (e) {
      isDragging = true;
      startX = e.clientX;
      startScrollLeft = track.scrollLeft;
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      var max = maxScroll();
      var trackWidth = scrollbar.clientWidth;
      var thumbWidth = thumb.offsetWidth;
      var maxThumbLeft = trackWidth - thumbWidth;
      var deltaRatio = maxThumbLeft > 0 ? (e.clientX - startX) / maxThumbLeft : 0;
      track.scrollLeft = startScrollLeft + deltaRatio * max;
    });

    document.addEventListener('mouseup', function () {
      isDragging = false;
      document.body.style.userSelect = '';
    });

    // کلیک روی خط اسکرول‌بار (نه خود thumb) هم بپرد به همان نقطه
    scrollbar.addEventListener('click', function (e) {
      if (e.target === thumb) return;
      var rect = scrollbar.getBoundingClientRect();
      var clickRatio = (e.clientX - rect.left) / rect.width;
      track.scrollLeft = clickRatio * maxScroll();
    });
  }

  // ناوبری با کیبورد وقتی خود ردیف فوکوس دارد
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { track.scrollBy({ left: cardStep(), behavior: 'smooth' }); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { track.scrollBy({ left: -cardStep(), behavior: 'smooth' }); e.preventDefault(); }
  });

  updateNavState();
  updateScrollbar();

  // ---------- اتصال کلیک روی کارت مقصد به input مقصد سرچ‌بار ----------
  var destinationCards = track.querySelectorAll('[data-destination-card]');
  var destInput = document.getElementById('destInput');

  if (destinationCards.length && destInput) {
    var destSuggestPanel = document.getElementById('destSuggestions');

    destinationCards.forEach(function (card) {
      card.addEventListener('click', function () {
        var cityName = card.getAttribute('data-destination');
        if (!cityName) return;

        destInput.value = cityName;

        if (destSuggestPanel) {
          destSuggestPanel.hidden = true;
          destSuggestPanel.style.display = 'none';
        }
        destInput.setAttribute('aria-expanded', 'false');

        destinationCards.forEach(function (c) { c.classList.remove('is-selected'); });
        card.classList.add('is-selected');

        destInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }
})();

})();