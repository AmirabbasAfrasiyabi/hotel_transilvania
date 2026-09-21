/* Flight results page (step 9).
   Calls our own JSON API and draws one card per flight. Plain JavaScript (no jQuery). */
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

  // ---------- one flight card ----------
  function renderCard(f) {
    var offset = dayOffset(f.departure.date, f.arrival.date);
    var logo = safeLogo(f.airline.logo);

    var stopsText = "Direct";
    var stopsClass = "fr-stops fr-stops--direct";
    if (f.stops > 0) {
      var via = f.segments.slice(0, -1).map(function (s) { return s.to; }).join(", ");
      stopsText = f.stops + (f.stops === 1 ? " stop" : " stops") + (via ? " &middot; " + esc(via) : "");
      stopsClass = "fr-stops";
    }

    var operated = "";
    if (f.operating_airline && f.operating_airline !== f.airline.name) {
      operated = '<div class="fr-operated">Operated by ' + esc(f.operating_airline) + "</div>";
    }

    var bags = '<span class="fr-chip">Checked bag &times; ' + esc(f.baggage.checked) + "</span>" +
               '<span class="fr-chip">Cabin bag &times; ' + esc(f.baggage.carry_on) + "</span>";

    return (
      '<article class="fr-card">' +
        '<div class="fr-airline">' +
          (logo ? '<img class="fr-logo" src="' + esc(logo) + '" alt="">' : "") +
          "<div>" +
            '<div class="fr-airline-name">' + esc(f.airline.name) + "</div>" +
            operated +
            '<div class="fr-flightno">' + esc(f.flight_number) + "</div>" +
          "</div>" +
        "</div>" +

        '<div class="fr-route">' +
          '<div class="fr-point">' +
            '<div class="fr-time">' + esc(f.departure.time) + "</div>" +
            '<div class="fr-code">' + esc(f.departure.airport) + " &middot; " + esc(f.departure.city) + "</div>" +
          "</div>" +
          '<div class="fr-line">' +
            "<div>" + esc(f.duration_text) + "</div>" +
            '<div class="fr-track"></div>' +
            '<div class="' + stopsClass + '">' + stopsText + "</div>" +
          "</div>" +
          '<div class="fr-point">' +
            '<div class="fr-time">' + esc(f.arrival.time) +
              (offset > 0 ? "<sup>+" + offset + "</sup>" : "") + "</div>" +
            '<div class="fr-code">' + esc(f.arrival.airport) + " &middot; " + esc(f.arrival.city) + "</div>" +
          "</div>" +
        "</div>" +

        '<div class="fr-price-col">' +
          '<div class="fr-price">' + formatPrice(f.price.amount, f.price.currency) + "</div>" +
          '<div class="fr-price-note">Total price</div>' +
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
      showMessage("<strong>No flights found</strong><p>Try another date or a different route.</p>");
      return;
    }

    root.innerHTML =
      '<p class="fr-count">Showing the ' + data.flights.length + " cheapest of " + data.total_offers + " results</p>" +
      data.flights.map(renderCard).join("");
  }

  loadFlights();
})();