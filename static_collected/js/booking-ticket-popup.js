/**
 * Ticket details popup — opens when user clicks ⋯ next to Change ticket
 * Depends on window.BOOKING and window.BOOKING_OFFER (set by passengers.html)
 */
(function () {
  "use strict";

  const booking = window.BOOKING || {};

  function formatTimeFromIso(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function formatDuration(mins) {
    if (mins == null || isNaN(Number(mins))) return "";
    const m = Number(mins);
    const h = Math.floor(m / 60);
    const r = m % 60;
    return (h ? h + "h " : "") + (r ? r + "m" : h ? "" : "0m");
  }

  function openTicketModal() {
    const modal = document.getElementById("bpTicketModal");
    const body = document.getElementById("bpTicketBody");
    if (!modal || !body) return;

    const offer = window.BOOKING_OFFER || {};
    const slice = (offer.slices && offer.slices[0]) || {};
    const dep = slice.departure || {};
    const arr = slice.arrival || {};
    const airline = offer.airline || {};
    const cabin = offer.cabin || "Economy";
    const flightType = offer.flight_type || "";
    const stops = slice.stops;
    const duration =
      slice.duration_text || formatDuration(slice.duration_minutes) || "";
    const stopsLabel =
      stops === 0 || stops === "0"
        ? "Direct"
        : stops != null
          ? stops + (Number(stops) === 1 ? " stop" : " stops")
          : "";

    const depTime =
      dep.time ||
      formatTimeFromIso(dep.at) ||
      formatTimeFromIso(booking.departureAt) ||
      "—";
    const arrTime =
      arr.time ||
      formatTimeFromIso(arr.at) ||
      formatTimeFromIso(booking.arrivalAt) ||
      "—";
    const depCity = dep.city || booking.origin || "—";
    const arrCity = arr.city || booking.destination || "—";
    const depCode = dep.airport || booking.origin || "";
    const arrCode = arr.airport || booking.destination || "";
    const airlineName = airline.name || booking.airline || "Airline";
    const logo = airline.logo || "";
    const flightNo = slice.flight_number || booking.flightNumber || "";

    const badges = [];
    if (flightType) badges.push(String(flightType));
    if (cabin) badges.push(String(cabin));

    function esc(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    body.innerHTML =
      '<div class="bp-ticket-badges">' +
      badges
        .map(function (b) {
          return '<span class="bp-ticket-badge">' + esc(b) + "</span>";
        })
        .join("") +
      "</div>" +
      '<div class="bp-ticket-route">' +
      '<div class="bp-ticket-point">' +
      '<div class="bp-ticket-time">' +
      esc(depTime) +
      "</div>" +
      '<div class="bp-ticket-city">' +
      esc(depCity) +
      (depCode ? " <span>(" + esc(depCode) + ")</span>" : "") +
      "</div>" +
      "</div>" +
      '<div class="bp-ticket-mid">' +
      (duration
        ? '<span class="bp-ticket-dur">' + esc(duration) + "</span>"
        : "") +
      '<div class="bp-ticket-line"><i class="fa-solid fa-plane"></i></div>' +
      (stopsLabel
        ? '<span class="bp-ticket-stops">' + esc(stopsLabel) + "</span>"
        : "") +
      "</div>" +
      '<div class="bp-ticket-point bp-ticket-point--arr">' +
      '<div class="bp-ticket-time">' +
      esc(arrTime) +
      "</div>" +
      '<div class="bp-ticket-city">' +
      esc(arrCity) +
      (arrCode ? " <span>(" + esc(arrCode) + ")</span>" : "") +
      "</div>" +
      "</div>" +
      '<div class="bp-ticket-airline">' +
      (logo
        ? '<img src="' +
          esc(logo) +
          '" alt="" class="bp-ticket-logo">'
        : '<div class="bp-ticket-logo-fallback">' +
          esc((airlineName.slice(0, 2) || "FL").toUpperCase()) +
          "</div>") +
      '<div class="bp-ticket-airline-name">' +
      esc(airlineName) +
      (flightNo ? "<small>" + esc(flightNo) + "</small>" : "") +
      "</div>" +
      "</div>" +
      "</div>";

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeTicketModal() {
    const modal = document.getElementById("bpTicketModal");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function wire() {
    const moreBtn = document.getElementById("bpFcMore");
    if (moreBtn) moreBtn.addEventListener("click", openTicketModal);
    const ticketClose = document.getElementById("bpTicketClose");
    const ticketOverlay = document.getElementById("bpTicketOverlay");
    if (ticketClose) ticketClose.addEventListener("click", closeTicketModal);
    if (ticketOverlay) ticketOverlay.addEventListener("click", closeTicketModal);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeTicketModal();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
