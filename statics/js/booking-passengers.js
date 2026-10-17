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

  function createPassengerCard(index, type) {
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const isInfant = type === "infant";

    return `
      <div class="bp-card" data-passenger="${index}" data-type="${type}">
        <h2 class="bp-card-title">
          Passenger ${index} — ${typeLabel}
          <span class="bp-card-badge">${typeLabel}</span>
        </h2>

        <h3 style="font-size:0.95rem;margin:0 0 14px;color:#64748b;">Personal Information</h3>

        <div class="bp-grid-3">
          <div class="bp-field">
            <label>Title</label>
            <select name="title_${index}">
              <option value="">Select</option>
              <option value="MR">Mr</option>
              <option value="MRS">Mrs</option>
              <option value="MS">Ms</option>
              <option value="MISS">Miss</option>
            </select>
          </div>
          <div class="bp-field">
            <label>First Name</label>
            <input type="text" name="first_name_${index}" required placeholder="As on passport">
          </div>
          <div class="bp-field">
            <label>Last Name</label>
            <input type="text" name="last_name_${index}" required placeholder="As on passport">
          </div>
        </div>

        <div class="bp-grid-3">
          <div class="bp-field">
            <label>Gender</label>
            <select name="gender_${index}" required>
              <option value="">Select</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
          <div class="bp-field">
            <label>Date of Birth</label>
            <input type="date" name="dob_${index}" required>
          </div>
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
            </select>
          </div>
        </div>

        ${!isInfant ? `
        <h3 style="font-size:0.95rem;margin:20px 0 14px;color:#64748b;">Passport Information</h3>
        <div class="bp-grid-2">
          <div class="bp-field">
            <label>Passport Number</label>
            <input type="text" name="passport_number_${index}" required placeholder="A12345678">
          </div>
          <div class="bp-field">
            <label>Issuing Country</label>
            <select name="passport_country_${index}" required>
              <option value="">Select</option>
              <option value="IR">Iran</option>
              <option value="TR">Turkey</option>
              <option value="AE">United Arab Emirates</option>
              <option value="GB">United Kingdom</option>
              <option value="US">United States</option>
            </select>
          </div>
          <div class="bp-field">
            <label>Passport Expiry Date</label>
            <input type="date" name="passport_expiry_${index}" required>
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

      list.push({
        order: Number(index),
        passenger_type: type,
        title: val("title"),
        first_name: val("first_name"),
        last_name: val("last_name"),
        gender: val("gender"),
        date_of_birth: val("dob") || null,
        nationality: val("nationality"),
        passport_number: val("passport_number"),
        passport_issuing_country: val("passport_country"),
        passport_expiry: val("passport_expiry") || null,
      });
    });

    return list;
  }

  function validatePassengers(passengers) {
    for (const p of passengers) {
      if (!p.first_name || !p.last_name) {
        return "First name and last name are required for all passengers.";
      }
      if (!p.date_of_birth) {
        return "Date of birth is required for all passengers.";
      }
      if (p.passenger_type !== "infant") {
        if (!p.passport_number || !p.passport_expiry) {
          return "Passport details are required for adults and children.";
        }
      }
    }
    return null;
  }

  function showError(msg) {
    const box = document.getElementById("bpFormError");
    if (box) {
      box.style.display = "block";
      box.textContent = msg;
    } else {
      alert(msg);
    }
  }

  function clearError() {
    const box = document.getElementById("bpFormError");
    if (box) {
      box.style.display = "none";
      box.textContent = "";
    }
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

  // Fill summary from offer if available
  (function fillOfferSummary() {
    const offer = window.BOOKING_OFFER || {};
    const airline = offer.airline || {};
    const logoEl = document.getElementById("bpFcLogo");
    if (logoEl && airline.logo) {
      logoEl.src = airline.logo;
      logoEl.hidden = false;
    }
    if (airline.name) {
      const el = document.getElementById("bpFcAirline");
      if (el) el.textContent = airline.name;
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

      window.location.href = data.next_url || `/booking/review/${booking.id}/`;
    } catch (err) {
      showError("Network error. Please try again.");
    } finally {
      if (btn) btn.disabled = false;
      if (stickyBtn) stickyBtn.disabled = false;
    }
  }

  document.getElementById("bpContinueBtn")?.addEventListener("click", submitPassengers);
  document.getElementById("bpStickyContinue")?.addEventListener("click", submitPassengers);

  renderPassengers();
})();