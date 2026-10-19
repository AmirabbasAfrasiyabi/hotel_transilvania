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

  const COUNTRY_OPTIONS = `
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
    <option value="NL">Netherlands</option>
    <option value="IT">Italy</option>
    <option value="ES">Spain</option>
    <option value="CN">China</option>
    <option value="IN">India</option>
    <option value="RU">Russia</option>
    <option value="JP">Japan</option>
    <option value="KR">South Korea</option>
    <option value="TH">Thailand</option>
    <option value="MY">Malaysia</option>
    <option value="SG">Singapore</option>
  `;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const LATIN_NAME_RE = /^[A-Za-z][A-Za-z\s\-'.]{0,98}[A-Za-z]?$/;
  const PASSPORT_RE = /^[A-Za-z0-9]{6,12}$/;
  const IR_NATIONAL_ID_RE = /^\d{10}$/;
  const GENERIC_ID_RE = /^[A-Za-z0-9\-]{5,20}$/;

  function digitsOnly(s) {
    return String(s || "").replace(/\D/g, "");
  }

  function isValidEmail(email) {
    return EMAIL_RE.test(String(email || "").trim());
  }

  function isValidPhone(phone) {
    const d = digitsOnly(phone);
    return d.length >= 7 && d.length <= 15;
  }

  function isValidLatinName(name) {
    const n = String(name || "").trim();
    if (n.length < 2 || n.length > 100) return false;
    return LATIN_NAME_RE.test(n);
  }

  function isValidPassport(num) {
    return PASSPORT_RE.test(String(num || "").trim());
  }

  function isValidNationalId(id, nationality) {
    const v = String(id || "").trim();
    if (!v) return true;
    if ((nationality || "").toUpperCase() === "IR") {
      return IR_NATIONAL_ID_RE.test(v);
    }
    return GENERIC_ID_RE.test(v);
  }

  function buildDate(day, month, year) {
    if (!day || !month || !year) return null;
    const iso = year + "-" + month + "-" + day;
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return null;
    if (
      d.getFullYear() !== Number(year) ||
      d.getMonth() + 1 !== Number(month) ||
      d.getDate() !== Number(day)
    ) {
      return null;
    }
    return iso;
  }

  function isPastDate(iso) {
    if (!iso) return false;
    const d = new Date(iso + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  }

  function isFutureDate(iso) {
    if (!iso) return false;
    const d = new Date(iso + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d > today;
  }

  function passportExpiryTooSoon(iso) {
    if (!iso) return false;
    const d = new Date(iso + "T00:00:00");
    const min = new Date();
    min.setMonth(min.getMonth() + 6);
    return d < min;
  }

  function ageFromDob(iso) {
    if (!iso) return null;
    const dob = new Date(iso + "T00:00:00");
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  function clearFieldErrors(root) {
    (root || document).querySelectorAll(".bp-field-error").forEach(function (el) {
      el.remove();
    });
    (root || document).querySelectorAll(".bp-invalid").forEach(function (el) {
      el.classList.remove("bp-invalid");
    });
  }

  function markInvalid(input, message) {
    if (!input) return;
    input.classList.add("bp-invalid");
    const field = input.closest(".bp-field") || input.parentElement;
    if (!field) return;
    let err = field.querySelector(".bp-field-error");
    if (!err) {
      err = document.createElement("div");
      err.className = "bp-field-error";
      field.appendChild(err);
    }
    err.textContent = message;
  }

  function createPassengerCard(index, type) {
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const isInfant = type === "infant";
    const ageHint =
      type === "adult"
        ? "Adult ticket · 12+ years"
        : type === "child"
          ? "Child ticket · 2–11 years"
          : "Infant · under 2 years";

    return `
      <div class="bp-card" data-passenger="${index}" data-type="${type}">
        <div class="bp-card-header">
          <h2 class="bp-card-title">
            Passenger ${index}: ${typeLabel}
            <span class="bp-card-badge">${ageHint}</span>
          </h2>
          <span class="bp-status bp-status--pending" data-status>Not completed</span>
        </div>

        <div class="bp-card-helpers">
          <button type="button" class="bp-helper-btn" data-action="from-previous" title="Coming soon">
            <i class="fa-solid fa-users"></i> From previous passengers
          </button>
          <button type="button" class="bp-helper-btn" data-action="from-passport" title="Coming soon">
            <i class="fa-solid fa-id-card"></i> Fill from passport photo
          </button>
        </div>

        <div class="bp-grid-2">
          <div class="bp-field">
            <label>Given names (Latin) <span class="bp-req">*</span></label>
            <input type="text" name="first_name_${index}" required
                   placeholder="As on passport" autocomplete="given-name"
                   maxlength="100" inputmode="text">
          </div>
          <div class="bp-field">
            <label>Last name / surname (Latin) <span class="bp-req">*</span></label>
            <input type="text" name="last_name_${index}" required
                   placeholder="As on passport" autocomplete="family-name"
                   maxlength="100" inputmode="text">
          </div>
        </div>

        <div class="bp-grid-3">
          <div class="bp-field">
            <label>Gender on ID <span class="bp-req">*</span></label>
            <select name="gender_${index}" required>
              <option value="">Select</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div class="bp-field">
            <label>Date of birth <span class="bp-req">*</span></label>
            <div class="bp-date-row">
              <select name="dob_day_${index}" required aria-label="Day">${dayOptions()}</select>
              <select name="dob_month_${index}" required aria-label="Month">${monthOptions()}</select>
              <select name="dob_year_${index}" required aria-label="Year">${yearOptions(currentYear - 100, currentYear)}</select>
            </div>
          </div>
          <div class="bp-field">
            <label>Nationality <span class="bp-req">*</span></label>
            <select name="nationality_${index}" required>
              ${COUNTRY_OPTIONS}
            </select>
          </div>
        </div>

        <div class="bp-grid-2">
          <div class="bp-field">
            <label>National ID <span class="bp-optional">(optional)</span></label>
            <input type="text" name="national_id_${index}"
                   placeholder="e.g. 10-digit code for Iran" autocomplete="off"
                   maxlength="20">
          </div>
          <div class="bp-field">
            <label>Frequent flyer program <span class="bp-optional">(optional)</span></label>
            <input type="text" name="frequent_flyer_${index}"
                   placeholder="Airline / membership number" maxlength="40">
          </div>
        </div>

        ${
          !isInfant
            ? `
        <h3 class="bp-section-title">Travel document (passport)</h3>
        <div class="bp-grid-3">
          <div class="bp-field">
            <label>Passport number <span class="bp-req">*</span></label>
            <input type="text" name="passport_number_${index}" required
                   placeholder="A12345678" autocomplete="off"
                   maxlength="12" style="text-transform:uppercase">
          </div>
          <div class="bp-field">
            <label>Issuing country <span class="bp-req">*</span></label>
            <select name="passport_country_${index}" required>
              ${COUNTRY_OPTIONS}
            </select>
          </div>
          <div class="bp-field">
            <label>Passport expiry <span class="bp-req">*</span></label>
            <div class="bp-date-row">
              <select name="passport_expiry_day_${index}" required aria-label="Day">${dayOptions()}</select>
              <select name="passport_expiry_month_${index}" required aria-label="Month">${monthOptions()}</select>
              <select name="passport_expiry_year_${index}" required aria-label="Year">${yearOptions(currentYear, currentYear + 15)}</select>
            </div>
          </div>
        </div>
        <p class="bp-hint">Passport should remain valid for at least 6 months after your trip ends.</p>
        `
            : ""
        }
      </div>
    `;
  }

  function renderPassengers() {
    let html = "";
    let index = 1;
    for (let i = 0; i < config.adults; i++) html += createPassengerCard(index++, "adult");
    for (let i = 0; i < config.children; i++) html += createPassengerCard(index++, "child");
    for (let i = 0; i < config.infants; i++) html += createPassengerCard(index++, "infant");
    container.innerHTML = html;
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
        frequent_flyer: val("frequent_flyer") || null,
        passport_number: (val("passport_number") || "").toUpperCase(),
        passport_issuing_country: val("passport_country"),
        passport_expiry: passportExpiry,
        _card: card,
        _index: index,
      });
    });

    return list;
  }

  function validatePassengers(passengers) {
    clearFieldErrors(container);

    for (const p of passengers) {
      const card = p._card;
      const idx = p._index;
      const q = function (name) {
        return card.querySelector(`[name="${name}_${idx}"]`);
      };

      if (!isValidLatinName(p.first_name)) {
        markInvalid(
          q("first_name"),
          "Enter given names in Latin letters only (as on passport), min 2 characters."
        );
        return "Passenger " + idx + ": invalid given names.";
      }
      if (!isValidLatinName(p.last_name)) {
        markInvalid(
          q("last_name"),
          "Enter last name in Latin letters only (as on passport), min 2 characters."
        );
        return "Passenger " + idx + ": invalid last name.";
      }
      if (!p.gender) {
        markInvalid(q("gender"), "Gender is required.");
        return "Passenger " + idx + ": gender is required.";
      }
      if (!p.date_of_birth) {
        markInvalid(q("dob_day"), "Enter a valid date of birth.");
        return "Passenger " + idx + ": invalid date of birth.";
      }
      if (isFutureDate(p.date_of_birth)) {
        markInvalid(q("dob_day"), "Date of birth cannot be in the future.");
        return "Passenger " + idx + ": date of birth cannot be in the future.";
      }

      const age = ageFromDob(p.date_of_birth);
      if (p.passenger_type === "adult" && age !== null && age < 12) {
        markInvalid(q("dob_day"), "Adult passengers must be 12 years or older.");
        return "Passenger " + idx + ": adult must be 12+ years.";
      }
      if (p.passenger_type === "child" && age !== null && (age < 2 || age >= 12)) {
        markInvalid(q("dob_day"), "Child passengers must be between 2 and 11 years.");
        return "Passenger " + idx + ": child age must be 2–11.";
      }
      if (p.passenger_type === "infant" && age !== null && age >= 2) {
        markInvalid(q("dob_day"), "Infants must be under 2 years.");
        return "Passenger " + idx + ": infant must be under 2 years.";
      }

      if (!p.nationality) {
        markInvalid(q("nationality"), "Nationality is required.");
        return "Passenger " + idx + ": nationality is required.";
      }

      if (!isValidNationalId(p.national_id, p.nationality)) {
        markInvalid(
          q("national_id"),
          p.nationality === "IR"
            ? "Iranian national ID must be exactly 10 digits."
            : "National ID format is invalid (5–20 letters/numbers)."
        );
        return "Passenger " + idx + ": invalid national ID.";
      }

      if (p.passenger_type !== "infant") {
        if (!isValidPassport(p.passport_number)) {
          markInvalid(
            q("passport_number"),
            "Passport number must be 6–12 letters or digits (no spaces)."
          );
          return "Passenger " + idx + ": invalid passport number.";
        }
        if (!p.passport_issuing_country) {
          markInvalid(q("passport_country"), "Passport issuing country is required.");
          return "Passenger " + idx + ": passport issuing country is required.";
        }
        if (!p.passport_expiry) {
          markInvalid(q("passport_expiry_day"), "Enter a valid passport expiry date.");
          return "Passenger " + idx + ": invalid passport expiry.";
        }
        if (isPastDate(p.passport_expiry)) {
          markInvalid(q("passport_expiry_day"), "Passport has already expired.");
          return "Passenger " + idx + ": passport has expired.";
        }
        if (passportExpiryTooSoon(p.passport_expiry)) {
          markInvalid(
            q("passport_expiry_day"),
            "Passport should be valid for at least 6 months from today."
          );
          return (
            "Passenger " +
            idx +
            ": passport must remain valid for at least 6 months."
          );
        }
      }

      const statusEl = card.querySelector("[data-status]");
      if (statusEl) {
        statusEl.textContent = "Completed";
        statusEl.className = "bp-status bp-status--ok";
      }
    }
    return null;
  }

  function validateContact() {
    clearFieldErrors(document.getElementById("bpContactCard") || document);

    const nameEl = document.getElementById("contactName");
    const emailEl = document.getElementById("contactEmail");
    const phoneEl = document.getElementById("contactPhone");
    const codeEl = document.getElementById("countryCode");

    const name = ((nameEl && nameEl.value) || "").trim();
    const email = ((emailEl && emailEl.value) || "").trim();
    const phone = ((phoneEl && phoneEl.value) || "").trim();
    const code = ((codeEl && codeEl.value) || "").trim();

    if (!name || name.length < 2) {
      markInvalid(nameEl, "Contact name is required (min 2 characters).");
      return "Contact name is required.";
    }
    if (!isValidEmail(email)) {
      markInvalid(emailEl, "Enter a valid email address (e.g. name@example.com).");
      return "Invalid email format.";
    }
    if (!isValidPhone(phone)) {
      markInvalid(
        phoneEl,
        "Mobile number must contain 7 to 15 digits (without country code)."
      );
      return "Invalid mobile number (7–15 digits required).";
    }

    return {
      contact_full_name: name,
      contact_email: email.toLowerCase(),
      contact_phone: (code + " " + digitsOnly(phone)).trim(),
    };
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

  container.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    e.preventDefault();
    showError("This helper is not available yet. Please enter details manually.");
    setTimeout(clearError, 3500);
  });

  document.addEventListener("input", function (e) {
    const t = e.target;
    if (t && t.classList && t.classList.contains("bp-invalid")) {
      t.classList.remove("bp-invalid");
      const field = t.closest(".bp-field");
      if (field) {
        const err = field.querySelector(".bp-field-error");
        if (err) err.remove();
      }
    }
  });

  (function fillOfferSummary() {
    const offer = window.BOOKING_OFFER || {};
    const airline = offer.airline || {};
    const slices = offer.slices || [];
    const slice = slices[0] || {};
    const dep = slice.departure || {};
    const arr = slice.arrival || {};

    function setText(id, value) {
      const el = document.getElementById(id);
      if (!el || value == null || value === "") return;
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

    const logoEl = document.getElementById("bpFcLogo");
    const fallback = document.getElementById("bpFcLogoFallback");
    if (logoEl && airline.logo) {
      logoEl.src = airline.logo;
      logoEl.alt = airline.name || "";
      logoEl.hidden = false;
      if (fallback) fallback.hidden = true;
    }

    const originLabel = dep.city || dep.airport || booking.origin || "—";
    const destLabel = arr.city || arr.airport || booking.destination || "—";
    const titleEl = document.getElementById("bpFcTitle");
    if (titleEl) {
      titleEl.innerHTML =
        originLabel + ' <span class="bp-fc-arrow">→</span> ' + destLabel;
    }

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

    const contactOrError = validateContact();
    if (typeof contactOrError === "string") {
      showError(contactOrError);
      return;
    }
    const contact = contactOrError;

    const payloadPassengers = passengers.map(function (p) {
      return {
        order: p.order,
        passenger_type: p.passenger_type,
        first_name: p.first_name,
        last_name: p.last_name,
        gender: p.gender,
        date_of_birth: p.date_of_birth,
        nationality: p.nationality,
        national_id: p.national_id,
        frequent_flyer: p.frequent_flyer,
        passport_number: p.passport_number,
        passport_issuing_country: p.passport_issuing_country,
        passport_expiry: p.passport_expiry,
      };
    });

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
        body: JSON.stringify({ passengers: payloadPassengers, contact }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        showError(data.error || "Could not save passenger details.");
        return;
      }

      if (data.redirect) {
        window.location.href = data.redirect;
      } else if (data.next_url) {
        window.location.href = data.next_url;
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
