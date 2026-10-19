(function () {
  "use strict";

  const container = document.getElementById("bpPassengers");
  const booking = window.BOOKING;
  if (!booking || !container) return;

  const config = {
    adults: Number(booking.adults || 1),
    children: Number(booking.children || 0),
    infants: Number(booking.infants || 0),
  };

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
  }

  function dayOptions() {
    let opts = '<option value="">Day</option>';
    for (let d = 1; d <= 31; d++) {
      opts += `<option value="${String(d).padStart(2, "0")}">${d}</option>`;
    }
    return opts;
  }

  function monthOptions() {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    let opts = '<option value="">Month</option>';
    months.forEach(function (m, i) {
      opts += `<option value="${String(i + 1).padStart(2, "0")}">${m}</option>`;
    });
    return opts;
  }

  function yearOptions(from, to) {
    let opts = '<option value="">Year</option>';
    for (let y = to; y >= from; y--) {
      opts += `<option value="${y}">${y}</option>`;
    }
    return opts;
  }

  const currentYear = new Date().getFullYear();

  function createPassengerCard(index, type) {
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const isInfant = type === "infant";

    return `
      <div class="bp-card" data-passenger="${index}" data-type="${type}">
        <div class="bp-card-header">
          <h2 class="bp-card-title">
            ${index}. ${typeLabel}
            <span class="bp-card-badge">${typeLabel}</span>
          </h2>
          <div class="bp-card-helpers">
            <button type="button" class="bp-helper-btn" data-action="from-previous" title="Coming soon">
              <i class="fa-solid fa-users"></i> From previous passengers
            </button>
            <button type="button" class="bp-helper-btn" data-action="from-passport" title="Coming soon">
              <i class="fa-solid fa-id-card"></i> Fill from passport photo
            </button>
          </div>
        </div>

        <div class="bp-grid-3">
          <div class="bp-field">
            <label>Latin first name</label>
            <input type="text" name="first_name_${index}" required
                   placeholder="As on passport" autocomplete="given-name">
          </div>
          <div class="bp-field">
            <label>Latin last name</label>
            <input type="text" name="last_name_${index}" required
                   placeholder="As on passport" autocomplete="family-name">
          </div>
          <div class="bp-field">
            <label>Gender</label>
            <select name="gender_${index}" required>
              <option value="">Select</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
        </div>

        <div class="bp-grid-3">
          <div class="bp-field">
            <label>Nationality</label>
            <select name="nationality_${index}" required>
              <option value="">Select</option>
              <option value="IR">Iran</option>
              <option value="TR">Turkey</option>
              <option value="AE">United Arab Emirates</option>
              <option value="GB">United Kingdom</option>
              <option value="US">United States</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
            </select>
          </div>
          <div class="bp-field">
            <label>National ID <span class="bp-optional">(optional)</span></label>
            <input type="text" name="national_id_${index}"
                   placeholder="National ID / code" autocomplete="off">
          </div>
          <div class="bp-field">
            <label>Date of birth (Gregorian)</label>
            <div class="bp-date-row">
              <select name="dob_day_${index}" required aria-label="Day">${dayOptions()}</select>
              <select name="dob_month_${index}" required aria-label="Month">${monthOptions()}</select>
              <select name="dob_year_${index}" required aria-label="Year">${yearOptions(currentYear - 100, currentYear)}</select>
            </div>
          </div>
        </div>

        ${!isInfant ? `
        <div class="bp-grid-2">
          <div class="bp-field">
            <label>Passport number</label>
            <input type="text" name="passport_number_${index}" required
                   placeholder="A12345678" autocomplete="off">
          </div>
          <div class="bp-field">
            <label>Passport expiry date</label>
            <div class="bp-date-row">
              <select name="passport_expiry_day_${index}" required aria-label="Day">${dayOptions()}</select>
              <select name="passport_expiry_month_${index}" required aria-label="Month">${monthOptions()}</select>
              <select name="passport_expiry_year_${index}" required aria-label="Year">${yearOptions(currentYear, currentYear + 15)}</select>
            </div>
          </div>
        </div>
        ` : ""}
      </div>
    `;
  }

  function renderPassengers() {
    let html = "";
    let index = 1;

    for (let i = 0; i < config.adults; i++) {
      html += createPassengerCard(index++, "adult");
    }
    for (let i = 0; i < config.children; i++) {
      html += createPassengerCard(index++, "child");
    }
    for (let i = 0; i < config.infants; i++) {
      html += createPassengerCard(index++, "infant");
    }

    container.innerHTML = html;
  }

  function buildDate(day, month, year) {
    if (!day || !month || !year) return null;
    return year + "-" + month + "-" + day;
  }

  function collectPassengers() {
    const cards = container.querySelectorAll("[data-passenger]");
    const list = [];

    cards.forEach(function (card) {
      const index = card.getAttribute("data-passenger");
      const type = card.getAttribute("data-type") || "adult";

      const val = function (name) {
        const el = card.querySelector(`[name="${name}_${index}"]`);
        return el ? String(el.value || "").trim() : "";
      };

      const dob = buildDate(val("dob_day"), val("dob_month"), val("dob_year"));
      const passportExpiry = buildDate(
        val("passport_expiry_day"),
        val("passport_expiry_month"),
        val("passport_expiry_year")
      );

      list.push({
        order: Number(index),
        passenger_type: type,
        first_name: val("first_name"),
        last_name: val("last_name"),
        gender: val("gender"),
        date_of_birth: dob,
        nationality: val("nationality"),
        national_id: val("national_id") || null,
        passport_number: val("passport_number"),
        passport_expiry: passportExpiry,
      });
    });

    return list;
  }

  function validatePassengers(passengers) {
    for (const p of passengers) {
      if (!p.first_name || !p.last_name) {
        return "Latin first name and last name are required for all passengers.";
      }
      if (!p.gender) {
        return "Gender is required for all passengers.";
      }
      if (!p.date_of_birth) {
        return "Date of birth is required for all passengers.";
      }
      if (!p.nationality) {
        return "Nationality is required for all passengers.";
      }
      if (p.passenger_type !== "infant") {
        if (!p.passport_number || !p.passport_expiry) {
          return "Passport number and expiry date are required for adults and children.";
        }
      }
    }
    return null;
  }

  function showError(msg) {
    const el = document.getElementById("bpFormError");
    if (!el) {
      alert(msg);
      return;
    }
    el.textContent = msg;
    el.hidden = false;
    el.style.display = "block";
  }

  function clearError() {
    const el = document.getElementById("bpFormError");
    if (!el) return;
    el.textContent = "";
    el.hidden = true;
    el.style.display = "none";
  }

  // Same as first passenger
  const sameAsFirst = document.getElementById("sameAsFirst");
  if (sameAsFirst) {
    sameAsFirst.addEventListener("change", function () {
      if (!this.checked) return;
      const firstName = document.querySelector('[name="first_name_1"]');
      const lastName = document.querySelector('[name="last_name_1"]');
      if (firstName && lastName) {
        document.getElementById("contactName").value =
          (firstName.value + " " + lastName.value).trim();
      }
    });
  }

  // Helper buttons (UI only for now — no backend yet)
  container.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    e.preventDefault();
    // Placeholder: feature not implemented yet
    showError("This helper is not available yet. Please enter details manually.");
    setTimeout(clearError, 3500);
  });

  // Fill flight summary card + sidebar from offer data
  (function fillOfferSummary() {
    const offer = window.BOOKING_OFFER || {};
    const airline = offer.airline || {};
    const slices = offer.slices || [];
    const slice = slices[0] || {};
    const dep = slice.departure || {};
    const arr = slice.arrival || {};

    function setText(id, value) {
      const el = document.getElementById(id);
      if (!el) return;
      if (value == null || value === "") return;
      el.textContent = value;
    }

    function formatDate(iso) {
      if (!iso) return "";
      const d = new Date(String(iso).slice(0, 10) + "T00:00:00");
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    // Logo
    const logoEl = document.getElementById("bpFcLogo");
    const fallback = document.getElementById("bpFcLogoFallback");
    if (logoEl && airline.logo) {
      logoEl.src = airline.logo;
      logoEl.alt = airline.name || "";
      logoEl.hidden = false;
      if (fallback) fallback.hidden = true;
    }

    // Title: City to City when available, else IATA
    const originLabel = dep.city || dep.airport || booking.origin || "—";
    const destLabel = arr.city || arr.airport || booking.destination || "—";
    const titleEl = document.getElementById("bpFcTitle");
    if (titleEl) {
      titleEl.innerHTML =
        originLabel +
        ' <span class="bp-fc-arrow">→</span> ' +
        destLabel;
    }

    // Subtitle: date + time
    const datePart = formatDate(dep.date);
    const timePart = dep.time || "";
    let subtitle = "";
    if (datePart && timePart) subtitle = datePart + " — " + timePart;
    else if (datePart) subtitle = datePart;
    else if (timePart) subtitle = timePart;
    if (subtitle) setText("bpFcSubtitle", subtitle);

    if (airline.name) setText("bpFcAirline", airline.name);

    const duration = slice.duration_text || "";
    if (duration) setText("bpFcDuration", " · " + duration);

    const stops = Number(slice.stops || 0);
    const stopsText =
      stops === 0 ? "Direct" : stops + (stops === 1 ? " stop" : " stops");
    setText("bpFcStops", " · " + stopsText);

    // Sidebar
    const side = document.getElementById("bpSidebarFlight");
    if (side) {
      side.textContent =
        (dep.airport || booking.origin || "—") +
        " → " +
        (arr.airport || booking.destination || "—");
    }
    const sideMeta = document.getElementById("bpSidebarMeta");
    if (sideMeta) {
      const bits = [];
      if (datePart) bits.push(datePart);
      if (timePart) bits.push(timePart);
      if (duration) bits.push(duration);
      bits.push(stopsText);
      sideMeta.textContent = bits.join(" · ");
    }

    const card = document.getElementById("bpFlightCard");
    if (card) {
      card.style.display = "flex";
      card.hidden = false;
    }
  })();

  async function submitPassengers() {
    clearError();

    const passengers = collectPassengers();
    const validationError = validatePassengers(passengers);
    if (validationError) {
      showError(validationError);
      return;
    }

    const countryCode = document.getElementById("countryCode")?.value || "";
    const phoneRaw = document.getElementById("contactPhone")?.value || "";
    const contact = {
      contact_full_name: (document.getElementById("contactName")?.value || "").trim(),
      contact_email: (document.getElementById("contactEmail")?.value || "").trim(),
      contact_phone: (countryCode + " " + phoneRaw).trim(),
    };

    if (!contact.contact_email || !contact.contact_phone || !contact.contact_full_name) {
      showError("Contact name, email and phone are required.");
      return;
    }

    const btn = document.getElementById("bpContinueBtn");
    const stickyBtn = document.getElementById("bpStickyContinue");
    if (btn) btn.disabled = true;
    if (stickyBtn) stickyBtn.disabled = true;

    try {
      const res = await fetch(`/booking/passengers/${booking.id}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        credentials: "same-origin",
        body: JSON.stringify({ passengers, contact }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        showError(data.error || "Could not save passenger details.");
        return;
      }

      if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        window.location.href = `/booking/review/${booking.id}/`;
      }
    } catch (err) {
      showError("Network error. Please try again.");
    } finally {
      if (btn) btn.disabled = false;
      if (stickyBtn) stickyBtn.disabled = false;
    }
  }

  renderPassengers();

  const continueBtn = document.getElementById("bpContinueBtn");
  const stickyContinue = document.getElementById("bpStickyContinue");
  if (continueBtn) continueBtn.addEventListener("click", submitPassengers);
  if (stickyContinue) stickyContinue.addEventListener("click", submitPassengers);
})();
