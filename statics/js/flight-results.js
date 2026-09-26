/* Flight results page.
   Fetches flights once, then filters/sorts/re-renders them entirely in the
   browser. Also builds a date/price strip (one-way only, using parallel
   background requests) with prev/next navigation, and wires the inline,
   collapsible search bar. Plain JavaScript (no jQuery). */
(function () {
  "use strict";

  var root = document.getElementById("frResults");
  if (!root) { return; }

  var apiUrl = root.dataset.apiUrl + window.location.search;

  var filtersEl = document.getElementById("frFilters");
  var toolbarEl = document.getElementById("frToolbar");
  var sortLine = document.getElementById("frSortLine");
  var dateStripEl = document.getElementById("frsDateStrip");
  var dateTrackEl = document.getElementById("frsDateTrack");

  // All flights for the current search, plus the current filter/sort choices.
  var state = {
    flights: [],
    totalOffers: 0,
    sort: "price",
    filters: null,
    params: null
  };

  // Date-strip state: which 7-day window is showing, and cached prices.
  var stripAnchor = null;
  var priceCache = {};

  // ---------- small helpers ----------
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function formatPrice(amount, currency) {
    var number = Number(amount);
    if (isNaN(number)) { return esc(amount) + " " + esc(currency); }
    try {
      return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency }).format(number);
    } catch (e) {
      return number.toFixed(2) + " " + esc(currency);
    }
  }

  function formatDay(isoDate) {
    var d = new Date(isoDate + "T00:00:00");
    if (isNaN(d)) { return isoDate; }
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }

  function dayOffset(fromDate, toDate) {
    var ms = new Date(toDate) - new Date(fromDate);
    return isNaN(ms) ? 0 : Math.round(ms / 86400000);
  }

  function safeLogo(url) {
    return typeof url === "string" && url.indexOf("https://") === 0 ? url : "";
  }

  // NOTE: this no longer wipes dateStripEl's innerHTML — that would delete
  // the fixed prev/next buttons and the #frsDateTrack container along with
  // them, which is the bug that made the whole strip disappear permanently.
  function showMessage(html, extraClass) {
    root.innerHTML = '<div class="fr-message ' + (extraClass || "") + '">' + html + "</div>";
    if (toolbarEl) toolbarEl.hidden = true;
    if (dateStripEl) { dateStripEl.hidden = true; }
    if (filtersEl) { filtersEl.hidden = true; filtersEl.innerHTML = ""; }
  }

  function totalDurationMinutes(f) {
    return f.slices.reduce(function (sum, s) { return sum + (s.duration_minutes || 0); }, 0);
  }
  function firstDepartureKey(f) {
    var d = f.slices[0].departure;
    return (d.date || "") + "T" + (d.time || "");
  }

  // ---------- one direction (a row inside the card) ----------
  function renderSlice(slice, airline, isRound) {
    var offset = dayOffset(slice.departure.date, slice.arrival.date);
    var logo = safeLogo(airline.logo);

    var stopsText = "Direct";
    var stopsClass = "fr-stops fr-stops--direct";
    if (slice.stops > 0) {
      var via = slice.segments.slice(0, -1).map(function (s) { return s.to; }).join(", ");
      stopsText = slice.stops + (slice.stops === 1 ? " stop" : " stops") + (via ? " &middot; " + esc(via) : "");
      stopsClass = "fr-stops";
    }

    var operated = "";
    if (slice.operating_airline && slice.operating_airline !== airline.name) {
      operated = '<div class="fr-operated">Operated by ' + esc(slice.operating_airline) + "</div>";
    }

    var label = "";
    if (isRound) {
      label = '<div class="fr-slice-label">' +
        (slice.direction === "return" ? "Return" : "Outbound") +
        " &middot; " + esc(formatDay(slice.departure.date)) + "</div>";
    }

    return (
      '<div class="fr-slice">' +
        label +
        '<div class="fr-airline">' +
          (logo ? '<img class="fr-logo" src="' + esc(logo) + '" alt="">' : "") +
          "<div>" +
            '<div class="fr-airline-name">' + esc(airline.name) + "</div>" +
            operated +
            '<div class="fr-flightno">' + esc(slice.flight_number) + "</div>" +
          "</div>" +
        "</div>" +

        '<div class="fr-route">' +
          '<div class="fr-point">' +
            '<div class="fr-time">' + esc(slice.departure.time) + "</div>" +
            '<div class="fr-code">' + esc(slice.departure.airport) + " &middot; " + esc(slice.departure.city) + "</div>" +
          "</div>" +
          '<div class="fr-line">' +
            "<div>" + esc(slice.duration_text) + "</div>" +
            '<div class="fr-track"></div>' +
            '<div class="' + stopsClass + '">' + stopsText + "</div>" +
          "</div>" +
          '<div class="fr-point">' +
            '<div class="fr-time">' + esc(slice.arrival.time) +
              (offset > 0 ? "<sup>+" + offset + "</sup>" : "") + "</div>" +
            '<div class="fr-code">' + esc(slice.arrival.airport) + " &middot; " + esc(slice.arrival.city) + "</div>" +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  // ---------- one flight card ----------
  function renderCard(f) {
    var isRound = f.slices.length > 1;
    var rows = f.slices.map(function (slice) {
      return renderSlice(slice, f.airline, isRound);
    }).join("");

    var chips = "";
    if (f.cabin) { chips += '<span class="fr-chip fr-chip--tag">' + esc(f.cabin) + "</span>"; }
    var aircraft = f.slices[0] && f.slices[0].aircraft;
    if (aircraft) { chips += '<span class="fr-chip fr-chip--tag">' + esc(aircraft) + "</span>"; }
    var chipsRow = chips ? '<div class="fr-chips-row">' + chips + "</div>" : "";

    var bags = '<span class="fr-chip">Checked bag &times; ' + esc(f.baggage.checked) + "</span>" +
               '<span class="fr-chip">Cabin bag &times; ' + esc(f.baggage.carry_on) + "</span>";

    var refundText = "Refund policy not shown by airline";
    var refundClass = "fr-refund";
    var rp = f.refund_policy;
    if (rp && rp.refundable === true) {
      refundText = "Refundable";
      if (rp.penalty_amount) { refundText += " (fee " + formatPrice(rp.penalty_amount, rp.penalty_currency) + ")"; }
      refundClass += " fr-refund--yes";
    } else if (rp && rp.refundable === false) {
      refundText = "Non-refundable";
      refundClass += " fr-refund--no";
    }

    return (
      '<article class="fr-card">' +
        chipsRow +
        '<div class="fr-slices">' + rows + "</div>" +
        '<div class="fr-price-col">' +
          '<div class="fr-price">' + formatPrice(f.price.amount, f.price.currency) + "</div>" +
          '<div class="fr-price-note">' + (isRound ? "Total price &middot; round trip" : "Total price") + "</div>" +
          '<button type="button" class="fr-select-btn" data-offer-id="' + esc(f.id) + '">Select flight</button>' +
          '<div class="' + refundClass + '">' + refundText + "</div>" +
          '<div class="fr-bags">' + bags + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  // "Select flight" is a placeholder until the booking-details page exists
  // (a later step).
  root.addEventListener("click", function (e) {
    var btn = e.target.closest(".fr-select-btn");
    if (!btn) return;
    var original = btn.textContent;
    btn.textContent = "Coming soon";
    btn.disabled = true;
    window.setTimeout(function () { btn.textContent = original; btn.disabled = false; }, 1500);
  });

  // ---------- filters sidebar ----------
  function computeBounds(flights) {
    var prices = flights.map(function (f) { return Number(f.price.amount); }).filter(function (n) { return !isNaN(n); });
    var durations = flights.map(totalDurationMinutes);
    var airlineCounts = {};
    var cabinCounts = {};
    flights.forEach(function (f) {
      airlineCounts[f.airline.name] = (airlineCounts[f.airline.name] || 0) + 1;
      if (f.cabin) cabinCounts[f.cabin] = (cabinCounts[f.cabin] || 0) + 1;
    });
    return {
      priceMin: prices.length ? Math.floor(Math.min.apply(null, prices)) : 0,
      priceMax: prices.length ? Math.ceil(Math.max.apply(null, prices)) : 0,
      durationMin: durations.length ? Math.min.apply(null, durations) : 0,
      durationMax: durations.length ? Math.max.apply(null, durations) : 0,
      airlines: Object.keys(airlineCounts).sort(),
      airlineCounts: airlineCounts,
      cabins: Object.keys(cabinCounts).sort(),
      cabinCounts: cabinCounts
    };
  }

  function formatDurationLabel(minutes) {
    var h = Math.floor(minutes / 60), m = minutes % 60;
    return h + "h" + (m ? " " + m + "m" : "");
  }

  function rangeRow(key, title, min, max) {
    var safeMax = max > min ? max : min + 1;
    return (
      '<div class="frs-filter-group" data-range-group="' + key + '">' +
        '<div class="frs-filter-title">' + esc(title) + "</div>" +
        '<div class="frs-range-values">' +
          '<span data-range-label="' + key + 'Min"></span>' +
          " &ndash; " +
          '<span data-range-label="' + key + 'Max"></span>' +
        "</div>" +
        '<div class="frs-range-track">' +
          '<div class="frs-range-highlight" data-range-highlight="' + key + '"></div>' +
          '<input type="range" class="frs-range-input" data-range-input="' + key + 'Min" min="' + min + '" max="' + safeMax + '" value="' + min + '">' +
          '<input type="range" class="frs-range-input" data-range-input="' + key + 'Max" min="' + min + '" max="' + safeMax + '" value="' + safeMax + '">' +
        "</div>" +
      "</div>"
    );
  }

  function checkboxGroup(key, title, options, counts) {
    if (options.length < 2) { return ""; }
    var rows = options.map(function (opt) {
      var id = "frsChk_" + key + "_" + opt.replace(/[^a-z0-9]/gi, "");
      return (
        '<label class="frs-checkbox-row" for="' + id + '">' +
          '<input type="checkbox" id="' + id + '" data-check-group="' + key + '" value="' + esc(opt) + '" checked>' +
          "<span>" + esc(opt) + "</span>" +
          '<span class="frs-checkbox-count">' + (counts[opt] || 0) + "</span>" +
        "</label>"
      );
    }).join("");
    return '<div class="frs-filter-group"><div class="frs-filter-title">' + esc(title) + "</div>" + rows + "</div>";
  }

  function wireRange(key, min, max, formatter) {
    var group = filtersEl.querySelector('[data-range-group="' + key + '"]');
    if (!group) { return; }
    var minInput = group.querySelector('[data-range-input="' + key + 'Min"]');
    var maxInput = group.querySelector('[data-range-input="' + key + 'Max"]');
    var minLabel = group.querySelector('[data-range-label="' + key + 'Min"]');
    var maxLabel = group.querySelector('[data-range-label="' + key + 'Max"]');
    var highlight = group.querySelector('[data-range-highlight="' + key + '"]');

    function refresh() {
      var lo = Math.min(Number(minInput.value), Number(maxInput.value));
      var hi = Math.max(Number(minInput.value), Number(maxInput.value));
      minLabel.textContent = formatter(lo);
      maxLabel.textContent = formatter(hi);
      var pctLo = max > min ? ((lo - min) / (max - min)) * 100 : 0;
      var pctHi = max > min ? ((hi - min) / (max - min)) * 100 : 100;
      highlight.style.left = pctLo + "%";
      highlight.style.right = (100 - pctHi) + "%";
      if (key === "duration") { state.filters.durationMin = lo; state.filters.durationMax = hi; }
      if (key === "price") { state.filters.priceMin = lo; state.filters.priceMax = hi; }
    }

    minInput.addEventListener("input", function () { refresh(); renderList(); });
    maxInput.addEventListener("input", function () { refresh(); renderList(); });
    refresh();
  }

  function wireCheckboxes(key) {
    var boxes = filtersEl.querySelectorAll('[data-check-group="' + key + '"]');
    if (!boxes.length) { return; }
    Array.prototype.forEach.call(boxes, function (box) {
      box.addEventListener("change", function () {
        var checked = Array.prototype.filter.call(boxes, function (b) { return b.checked; })
          .map(function (b) { return b.value; });
        state.filters[key + "s"] = checked;
        renderList();
      });
    });
  }

  function buildFilters() {
    var b = computeBounds(state.flights);
    state.filters = {
      priceMin: b.priceMin, priceMax: b.priceMax,
      durationMin: b.durationMin, durationMax: b.durationMax,
      airlines: b.airlines.slice(), cabins: b.cabins.slice()
    };

    if (!filtersEl) { return; }
    var html = '<div class="frs-filters-count" id="frsFiltersCount"></div>';
    if (b.durationMax > b.durationMin) { html += rangeRow("duration", "Duration", b.durationMin, b.durationMax); }
    if (b.priceMax > b.priceMin) { html += rangeRow("price", "Price", b.priceMin, b.priceMax); }
    html += checkboxGroup("airline", "Airline", b.airlines, b.airlineCounts);
    html += checkboxGroup("cabin", "Cabin class", b.cabins, b.cabinCounts);
    filtersEl.innerHTML = html;
    filtersEl.hidden = false;

    if (b.durationMax > b.durationMin) { wireRange("duration", b.durationMin, b.durationMax, formatDurationLabel); }
    if (b.priceMax > b.priceMin) {
      wireRange("price", b.priceMin, b.priceMax, function (v) {
        return formatPrice(v, (state.flights[0] && state.flights[0].price.currency) || "");
      });
    }
    wireCheckboxes("airline");
    wireCheckboxes("cabin");
  }

  // ---------- filter + sort + render ----------
  function applyFiltersAndSort() {
    var f = state.filters;
    var list = state.flights.filter(function (flight) {
      var price = Number(flight.price.amount);
      var duration = totalDurationMinutes(flight);
      if (f) {
        if (f.priceMin != null && price < f.priceMin) return false;
        if (f.priceMax != null && price > f.priceMax) return false;
        if (f.durationMin != null && duration < f.durationMin) return false;
        if (f.durationMax != null && duration > f.durationMax) return false;
        if (f.airlines && f.airlines.length && f.airlines.indexOf(flight.airline.name) === -1) return false;
        if (f.cabins && f.cabins.length && flight.cabin && f.cabins.indexOf(flight.cabin) === -1) return false;
      }
      return true;
    });

    list.sort(function (a, b) {
      if (state.sort === "duration") return totalDurationMinutes(a) - totalDurationMinutes(b);
      if (state.sort === "departure") return firstDepartureKey(a) < firstDepartureKey(b) ? -1 : 1;
      if (state.sort === "departure_desc") return firstDepartureKey(a) > firstDepartureKey(b) ? -1 : 1;
      if (state.sort === "price_desc") return Number(b.price.amount) - Number(a.price.amount);
      return Number(a.price.amount) - Number(b.price.amount); // "price" (default = cheapest)
    });

    return list;
  }

  function renderList() {
    var visible = applyFiltersAndSort();
    var countEl = document.getElementById("frsFiltersCount");
    if (countEl) {
      countEl.textContent = "Results: " + visible.length +
        (visible.length !== state.flights.length ? " of " + state.flights.length : "");
    }
    if (!visible.length) {
      root.innerHTML = '<div class="fr-message"><strong>No flights match these filters.</strong>' +
        "<p>Try widening the price or duration range.</p></div>";
      return;
    }
    root.innerHTML = visible.map(renderCard).join("");
  }

  if (sortLine) {
    sortLine.addEventListener("click", function (e) {
      var btn = e.target.closest(".fr-sort-btn");
      if (!btn) return;
      sortLine.querySelectorAll(".fr-sort-btn").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      state.sort = btn.dataset.sort;
      renderList();
    });
  }

  // ---------- date/price strip (one-way searches only) ----------
  function isoPlusDays(iso, days) {
    var d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function clampAnchor(iso) {
    var today = todayIso();
    return iso < today ? today : iso;
  }
  function computeStripDates(anchorIso) {
    var dates = [];
    for (var i = 0; i < 7; i++) { dates.push(isoPlusDays(anchorIso, i)); }
    return dates;
  }

  // NOTE: this targets #frsDateTrack (the scrollable inner strip), never the
  // whole #frsDateStrip container — so the fixed prev/next arrows survive.
  function fetchStripPrice(date) {
    var q = new URLSearchParams(window.location.search);
    q.set("travel_date", date);
    fetch(root.dataset.apiUrl + "?" + q.toString(), { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var text = (data.ok && data.flights.length)
          ? formatPrice(data.flights[0].price.amount, data.flights[0].price.currency)
          : "No fares";
        priceCache[date] = text;
        if (!dateTrackEl) { return; }
        var cell = dateTrackEl.querySelector('[data-price-for="' + date + '"]');
        if (cell) { cell.textContent = text; }
      })
      .catch(function () {
        if (!dateTrackEl) { return; }
        var cell = dateTrackEl.querySelector('[data-price-for="' + date + '"]');
        if (cell) { cell.textContent = "\u2014"; }
      });
  }

  function paintStrip(selectedIso) {
    if (!dateTrackEl) { return; }
    var dates = computeStripDates(stripAnchor);

    if (!priceCache[selectedIso]) {
      priceCache[selectedIso] = formatPrice(state.flights[0].price.amount, state.flights[0].price.currency);
    }

    dateTrackEl.innerHTML = dates.map(function (d) {
      var isActive = d === selectedIso;
      var priceHtml = priceCache[d] || "&hellip;";
      return (
        '<button type="button" class="frs-date-cell' + (isActive ? " is-active" : "") + '" data-date="' + d + '">' +
          '<span class="frs-date-day">' + esc(formatDay(d)) + "</span>" +
          '<span class="frs-date-price" data-price-for="' + d + '">' + priceHtml + "</span>" +
        "</button>"
      );
    }).join("");

    dates.forEach(function (d) {
      if (!priceCache[d]) { fetchStripPrice(d); }
    });

    dateTrackEl.querySelectorAll(".frs-date-cell").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.classList.contains("is-active")) { return; }
        var q = new URLSearchParams(window.location.search);
        q.set("travel_date", btn.dataset.date);
        window.history.pushState(null, "", window.location.pathname + "?" + q.toString());
        document.dispatchEvent(new CustomEvent("flightsearch:update"));
      });
    });
  }

  function renderDateStrip() {
    if (!dateStripEl) { return; }
    if (!state.params || state.params.trip_type !== "oneway") { dateStripEl.hidden = true; return; }
    dateStripEl.hidden = false;
    if (!stripAnchor) { stripAnchor = clampAnchor(isoPlusDays(state.params.travel_date, -3)); }
    paintStrip(state.params.travel_date);
  }

  var stripPrevBtn = document.getElementById("frsDatePrev");
  var stripNextBtn = document.getElementById("frsDateNext");
  if (stripPrevBtn) {
    stripPrevBtn.addEventListener("click", function () {
      var next = clampAnchor(isoPlusDays(stripAnchor, -1));
      if (next === stripAnchor) { return; } // already at today, can't go earlier
      stripAnchor = next;
      paintStrip(state.params.travel_date);
    });
  }
  if (stripNextBtn) {
    stripNextBtn.addEventListener("click", function () {
      stripAnchor = isoPlusDays(stripAnchor, 1);
      paintStrip(state.params.travel_date);
    });
  }

  // ---------- inline search bar (collapse / expand + update-in-place) ----------
  var pillBtn = document.getElementById("frsPillBtn");
  var editor = document.getElementById("frsEditor");
  var closeBtn = document.getElementById("frsEditorClose");
  var pillText = document.getElementById("frsPillText");

  function openEditor() {
    if (editor) editor.hidden = false;
    if (pillBtn) pillBtn.setAttribute("aria-expanded", "true");
  }
  function closeEditor() {
    if (editor) editor.hidden = true;
    if (pillBtn) pillBtn.setAttribute("aria-expanded", "false");
  }
  if (pillBtn && editor) {
    pillBtn.addEventListener("click", function () {
      editor.hidden ? openEditor() : closeEditor();
    });
  }
  if (closeBtn) { closeBtn.addEventListener("click", closeEditor); }

  function updatePillText(params) {
    if (!pillText) return;
    var travellers = params.adults + params.children + params.infants;
    var text = params.origin + " \u2192 " + params.destination + " \u00b7 " + params.travel_date;
    if (params.trip_type === "roundtrip" && params.return_date) {
      text += " \u2013 " + params.return_date;
    }
    text += " \u00b7 " + travellers + (travellers === 1 ? " traveller" : " travellers");
    pillText.textContent = text;
  }

  // hero-search.js fires this after a successful inline "Update search",
  // and the date strip fires it too when another day is clicked.
  document.addEventListener("flightsearch:update", function () {
    closeEditor();
    apiUrl = root.dataset.apiUrl + window.location.search;
    loadFlights();
  });

  // ---------- main flow ----------
  async function loadFlights() {
    if (toolbarEl) toolbarEl.hidden = true;
    if (dateStripEl) { dateStripEl.hidden = true; }
    if (filtersEl) { filtersEl.hidden = true; filtersEl.innerHTML = ""; }
    root.innerHTML = '<div class="fr-message"><div class="fr-spinner"></div>' +
      "<p>Searching for the best fares&hellip; this can take up to 20 seconds.</p></div>";

    var data;
    try {
      var response = await fetch(apiUrl, { headers: { "Accept": "application/json" } });
      data = await response.json();
    } catch (error) {
      showMessage("<strong>Something went wrong.</strong><p>We could not reach the server. Please try again.</p>", "fr-message--error");
      return;
    }

    if (!data.ok) {
      var messages = Object.keys(data.errors || {}).map(function (key) {
        return "<li>" + esc(data.errors[key]) + "</li>";
      }).join("");
      showMessage("<strong>We could not complete this search:</strong><ul>" + messages + "</ul>", "fr-message--error");
      return;
    }

    state.params = data.params;
    stripAnchor = null;
    priceCache = {};
    updatePillText(data.params);

    if (data.flights.length === 0) {
      showMessage("<strong>No flights found</strong><p>Try other dates or a different route.</p>");
      return;
    }

    state.flights = data.flights;
    state.totalOffers = data.total_offers;
    state.sort = "price";
    if (sortLine) {
      sortLine.querySelectorAll(".fr-sort-btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.sort === "price"); });
    }

    renderDateStrip();
    buildFilters();
    if (toolbarEl) toolbarEl.hidden = false;
    renderList();
  }

  loadFlights();
})();