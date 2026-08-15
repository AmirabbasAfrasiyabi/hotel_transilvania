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
  var LOCATIONS = scope === 'domestic' ? IRAN_CITIES : INTL_CITIES;
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
      var html = '<div class="hsf-group-label">Recent searches</div>';
      HISTORY.forEach(function (h) {
        html += suggestionRow('fa-solid fa-clock-rotate-left', h.from + ' \u2192 ' + h.to, '', { value: isOrigin ? h.from : h.to, from: h.from, to: h.to });
      });
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
     5. CALENDAR (range picker that can also run in single-date mode,
     used when Trip type = One-way)
     ------------------------------------------------------------------ */
  var dateField = document.getElementById('dateField');
  var dateLabel = dateField ? dateField.querySelector('.hsf-label') : null;
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
      var classes = ['cal-day'];
      if (rangeStart && sameDay(thisDate, rangeStart)) classes.push('is-selected');
      if (rangeEnd && sameDay(thisDate, rangeEnd)) classes.push('is-selected');
      if (rangeStart && rangeEnd && thisDate > rangeStart && thisDate < rangeEnd) classes.push('is-in-range');
      html += '<button type="button" class="' + classes.join(' ') + '" data-date="' + formatISO(thisDate) + '" ' + (isPast ? 'disabled' : '') + '>' + d + '</button>';
    }
    html += '</div></div>';
    return html;
  }

  function updateTriggerAndHidden() {
    if (departHiddenInput) departHiddenInput.value = rangeStart ? formatISO(rangeStart) : '';
    if (returnHiddenInput) returnHiddenInput.value = rangeEnd ? formatISO(rangeEnd) : '';

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
      if (!isRangeMode) {
        calRangeHint.textContent = rangeStart ? 'Departing ' + formatShort(rangeStart) : 'Select your travel date';
      } else if (!rangeStart) {
        calRangeHint.textContent = 'Select a departure date';
      } else if (!rangeEnd) {
        calRangeHint.textContent = 'Departing ' + formatShort(rangeStart) + ' — now pick a return date';
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
    renderCalendar();
  }

  function closeCalendar() {
    if (!calendarPopup) return;
    calendarPopup.hidden = true;
    calendarPopup.style.display = 'none';
  }

  function setRangeMode(rangeMode) {
    isRangeMode = rangeMode;
    rangeStart = null;
    rangeEnd = null;
    if (dateLabel) dateLabel.textContent = isRangeMode ? 'Depart — Return' : 'Departure date';
    updateTriggerAndHidden();
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
      if (!calendarPopup.hidden && !calendarPopup.contains(e.target) && e.target !== dateTrigger && !dateTrigger.contains(e.target)) {
        closeCalendar();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCalendar();
    });
  }

  // Hook the Trip type select (if present on this page) into the calendar,
  // and sync to whichever option starts active (pages can default differently).
  var tripTypeGroup = document.getElementById('tripTypeGroup');
  if (tripTypeGroup && dateTrigger) {
    var initialOption = tripTypeGroup.querySelector('.hsf-select-option.active');
    if (initialOption) setRangeMode(initialOption.getAttribute('data-value') !== 'oneway');

    tripTypeGroup.addEventListener('hsfselectchange', function (e) {
      setRangeMode(e.detail.value !== 'oneway');
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


  var submitBtn = document.getElementById('heroSearchSubmit');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!submitBtn) return;
    var label = submitBtn.querySelector('.btn-label');
    var loading = submitBtn.querySelector('.btn-loading');
    if (label) label.hidden = true;
    if (loading) loading.hidden = false;
    submitBtn.disabled = true;

    // TODO(backend): swap this timeout for the real fetch/redirect once
    // the search results endpoint exists.
    window.setTimeout(function () {
      if (label) label.hidden = false;
      if (loading) loading.hidden = true;
      submitBtn.disabled = false;
    }, 900);
  });
})();