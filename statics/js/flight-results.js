/* Flight results page.
   Calls our own JSON API and draws one card per flight (one row per direction).
   Plain JavaScript (no jQuery). */
(function () {
  "use strict";

  var root = document.getElementById("frResults");
  if (!root) { return; }

  // Same query string as this page: ?origin=...&destination=...&travel_date=...
  var apiUrl = root.dataset.apiUrl + window.location.search;

  // ---------- helpers ----------
  // Escape text before putting it into HTML (protects against injected markup).
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

  // "2026-10-23" -> "Fri 23 Oct" (plain text, escape it where you use it).
  function formatDay(isoDate) {
    var d = new Date(isoDate + "T00:00:00");
    if (isNaN(d)) { return isoDate; }
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }

  // Days between two YYYY-MM-DD strings (used for the "+1" next-day mark).
  function dayOffset(fromDate, toDate) {
    var ms = new Date(toDate) - new Date(fromDate);
    return isNaN(ms) ? 0 : Math.round(ms / 86400000);
  }

  function safeLogo(url) {
    return typeof url === "string" && url.indexOf("https://") === 0 ? url : "";
  }

  function showMessage(html, extraClass) {
    root.innerHTML = '<div class="fr-message ' + (extraClass || "") + '">' + html + "</div>";
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

    var bags = '<span class="fr-chip">Checked bag &times; ' + esc(f.baggage.checked) + "</span>" +
               '<span class="fr-chip">Cabin bag &times; ' + esc(f.baggage.carry_on) + "</span>";

    return (
      '<article class="fr-card">' +
        '<div class="fr-slices">' + rows + "</div>" +
        '<div class="fr-price-col">' +
          '<div class="fr-price">' + formatPrice(f.price.amount, f.price.currency) + "</div>" +
          '<div class="fr-price-note">' + (isRound ? "Total price &middot; round trip" : "Total price") + "</div>" +
          '<div class="fr-bags">' + bags + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  // ---------- main flow ----------
  async function loadFlights() {
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

    if (data.flights.length === 0) {
      showMessage("<strong>No flights found</strong><p>Try other dates or a different route.</p>");
      return;
    }

    root.innerHTML =
      '<p class="fr-count">Showing the ' + data.flights.length + " cheapest of " + data.total_offers + " results</p>" +
      data.flights.map(renderCard).join("");
  }

  loadFlights();
})();