(function () {
  "use strict";

  const modal = document.getElementById("flightDetailsModal");
  const overlay = document.getElementById("fdOverlay");
  const closeBtn = document.getElementById("fdCloseBtn");
  const shareBtn = document.getElementById("fdShareBtn");
  const shareMenu = document.getElementById("fdShareMenu");
  const selectBtn = document.getElementById("fdSelectBtn");
  const toast = document.getElementById("fdToast");

  let currentOffer = null;

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
  }

  function getSearchParamsFromUrl() {
    const q = new URLSearchParams(window.location.search);
    return {
      origin: q.get("origin") || "",
      destination: q.get("destination") || "",
      travel_date: q.get("travel_date") || "",
      return_date: q.get("return_date") || "",
      trip_type: q.get("trip_type") || "oneway",
      adults: Number(q.get("adults") || 1),
      children: Number(q.get("children") || 0),
      infants: Number(q.get("infants") || 0),
    };
  }

  function openModal(offer) {
    currentOffer = offer;
    renderSummary(offer);
    renderTabs(offer);
    updatePrice(offer);
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (shareMenu) shareMenu.hidden = true;
  }

  function renderSummary(offer) {
    const slice = offer.slices[0];
    const dep = slice.departure;
    const arr = slice.arrival;
    const stopsText =
      slice.stops === 0
        ? "Direct flight"
        : `${slice.stops} stop${slice.stops > 1 ? "s" : ""}`;

    document.getElementById("fdSummary").innerHTML = `
      <div class="fd-airline-row">
        ${
          offer.airline.logo
            ? `<img src="${offer.airline.logo}" alt="" class="fd-airline-logo">`
            : `<div class="fd-airline-logo" style="display:flex;align-items:center;justify-content:center;font-weight:700;color:#64748b">${
                offer.airline.code || ""
              }</div>`
        }
        <div>
          <div class="fd-airline-name">${offer.airline.name || "—"}</div>
          <div class="fd-flight-meta">${slice.flight_number || ""} · ${
      offer.cabin || "Economy"
    }</div>
        </div>
      </div>

      <div class="fd-route">
        <div class="fd-city-block">
          <div class="fd-city-code">${dep.airport || "—"}</div>
          <div class="fd-city-name">${dep.city || ""}</div>
          <div class="fd-time">${dep.time || "—"}</div>
          <div class="fd-date">${formatDate(dep.date)}</div>
        </div>

        <div class="fd-plane-line">
          <span>${slice.duration_text || ""}</span>
          <div class="line"><i class="fa-solid fa-plane"></i></div>
          <span>${stopsText}</span>
        </div>

        <div class="fd-city-block">
          <div class="fd-city-code">${arr.airport || "—"}</div>
          <div class="fd-city-name">${arr.city || ""}</div>
          <div class="fd-time">${arr.time || "—"}</div>
          <div class="fd-date">${formatDate(arr.date)}</div>
        </div>
      </div>
    `;
  }

  function renderTabs(offer) {
    const slice = offer.slices[0];
    const dep = slice.departure;
    const arr = slice.arrival;

    document.getElementById("fdTab-info").innerHTML = `
      <div class="fd-info-grid">
        ${infoCard("Departure time", `${dep.time || "—"}<br><small>${formatDate(dep.date)}</small>`)}
        ${infoCard("Arrival time", `${arr.time || "—"}<br><small>${formatDate(arr.date)}</small>`)}
        ${infoCard("Duration", slice.duration_text || "—")}
        ${infoCard("Airline", offer.airline.name || "—")}
        ${infoCard("Flight number", slice.flight_number || "—")}
        ${infoCard("Origin airport", `${dep.city || ""} (${dep.airport || ""})`)}
        ${infoCard("Destination airport", `${arr.city || ""} (${arr.airport || ""})`)}
        ${infoCard("Cabin class", offer.cabin || "Economy")}
        ${slice.aircraft ? infoCard("Aircraft", slice.aircraft) : ""}
        ${infoCard("Stops", slice.stops === 0 ? "Direct" : slice.stops)}
      </div>
    `;

    const bag = offer.baggage || {};
    document.getElementById("fdTab-baggage").innerHTML = `
      <div class="fd-baggage-list">
        <div class="fd-baggage-item">
          <div class="fd-baggage-icon"><i class="fa-solid fa-suitcase-rolling"></i></div>
          <div>
            <div class="fd-baggage-title">Checked baggage</div>
            <div class="fd-baggage-value">${bag.checked || 0} × 23 kg</div>
          </div>
        </div>
        <div class="fd-baggage-item">
          <div class="fd-baggage-icon"><i class="fa-solid fa-briefcase"></i></div>
          <div>
            <div class="fd-baggage-title">Carry-on baggage</div>
            <div class="fd-baggage-value">${bag.carry_on || 0} piece (max 7 kg)</div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("fdTab-refund").innerHTML = `
      <div class="fd-refund-list">
        <div class="fd-refund-item">
          <span class="fd-refund-time">Up to 7 days before departure</span>
          <span class="fd-refund-penalty">30% penalty</span>
        </div>
        <div class="fd-refund-item">
          <span class="fd-refund-time">7 days to 72 hours before</span>
          <span class="fd-refund-penalty">50% penalty</span>
        </div>
        <div class="fd-refund-item">
          <span class="fd-refund-time">72 to 24 hours before</span>
          <span class="fd-refund-penalty">70% penalty</span>
        </div>
        <div class="fd-refund-item">
          <span class="fd-refund-time">24 to 8 hours before</span>
          <span class="fd-refund-penalty">85% penalty</span>
        </div>
        <div class="fd-refund-item">
          <span class="fd-refund-time">Less than 8 hours</span>
          <span class="fd-refund-penalty">100% penalty</span>
        </div>
      </div>
      <div class="fd-notice">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>The final refund amount is calculated according to the ticket rules and airline conditions.</p>
      </div>
    `;
  }

  function infoCard(label, value) {
    return `
      <div class="fd-info-card">
        <div class="fd-info-label">${label}</div>
        <div class="fd-info-value">${value}</div>
      </div>
    `;
  }

  function updatePrice(offer) {
    const amount = offer.price?.amount || "—";
    const currency = offer.price?.currency || "";
    const el = document.getElementById("fdPriceAmount");
    if (el) el.textContent = `${amount} ${currency}`;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  document.querySelectorAll(".fd-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".fd-tab").forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".fd-tab-content").forEach((c) => {
        c.hidden = true;
        c.classList.remove("is-active");
      });

      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      const panel = document.getElementById("fdTab-" + tab.dataset.tab);
      if (panel) {
        panel.hidden = false;
        panel.classList.add("is-active");
      }
    });
  });

  if (shareBtn && shareMenu) {
    shareBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      shareMenu.hidden = !shareMenu.hidden;
    });

    document.addEventListener("click", (e) => {
      if (!shareMenu.contains(e.target) && e.target !== shareBtn) {
        shareMenu.hidden = true;
      }
    });

    shareMenu.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-share]");
      if (!btn || !currentOffer) return;

      const type = btn.dataset.share;
      const url = `${window.location.origin}/flights/details/${currentOffer.id}/`;

      if (type === "copy") {
        navigator.clipboard.writeText(url).then(() => {
          if (toast) {
            toast.hidden = false;
            setTimeout(() => (toast.hidden = true), 2500);
          }
        });
      } else if (type === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank");
      } else if (type === "telegram") {
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(url)}`,
          "_blank"
        );
      } else if (type === "email") {
        window.location.href = `mailto:?subject=Flight Details&body=${encodeURIComponent(
          url
        )}`;
      }
      shareMenu.hidden = true;
    });
  }

  // ---------- Select: create draft booking then go to passengers ----------
  if (selectBtn) {
    selectBtn.addEventListener("click", async () => {
      if (!currentOffer) return;

      selectBtn.disabled = true;
      const oldText = selectBtn.textContent;
      selectBtn.textContent = "Please wait…";

      try {
        const res = await fetch("/booking/select-offer/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
          },
          credentials: "same-origin",
          body: JSON.stringify({
            offer: currentOffer,
            search_params: getSearchParamsFromUrl(),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          alert(data.error || "Could not start booking.");
          return;
        }

        window.location.href = data.redirect_url;
      } catch (err) {
        alert("Network error. Please try again.");
      } finally {
        selectBtn.disabled = false;
        selectBtn.textContent = oldText || "Select";
      }
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (overlay) overlay.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) closeModal();
  });

  window.openFlightDetails = openModal;
})();