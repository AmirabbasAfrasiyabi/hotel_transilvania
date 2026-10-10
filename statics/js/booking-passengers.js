(function () {
  "use strict";

  const container = document.getElementById("bpPassengers");
  const config = window.BOOKING_PASSENGERS || { adults: 1, children: 0, infants: 0 };

  // ---------- Build passenger cards ----------
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
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Ms">Ms</option>
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
              <option value="male">Male</option>
              <option value="female">Female</option>
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

  // ---------- Same as first passenger ----------
  const sameAsFirst = document.getElementById("sameAsFirst");
  if (sameAsFirst) {
    sameAsFirst.addEventListener("change", function () {
      if (!this.checked) return;

      const firstName = document.querySelector('[name="first_name_1"]');
      const lastName  = document.querySelector('[name="last_name_1"]');

      if (firstName && lastName) {
        document.getElementById("contactName").value =
          (firstName.value + " " + lastName.value).trim();
      }
    });
  }

  // ---------- Continue button ----------
  function goNext() {
    // Later: validate form + save to session
    // For now just placeholder
    alert("Form validation + save will be added in next step.\nOffer ID: " + (config.offerId || "—"));
    // window.location.href = "/booking/services/?offer=" + config.offerId;
  }

  document.getElementById("bpContinueBtn")?.addEventListener("click", goNext);
  document.getElementById("bpStickyContinue")?.addEventListener("click", goNext);

  // ---------- Init ----------
  renderPassengers();
})();