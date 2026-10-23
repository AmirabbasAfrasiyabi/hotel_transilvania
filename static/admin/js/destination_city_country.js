(function () {
  function bindCityCountry() {
    var nameSelect = document.getElementById("id_name");
    if (!nameSelect) return;

    var map = window.CITY_TO_COUNTRY || {};

    // فیلد کشور در حالت readonly است؛ متن نمایشی‌اش را پیدا کن
    function getCountryDisplayEl() {
      // Django admin: .form-row.field-country .readonly
      var row = document.querySelector(".form-row.field-country");
      if (!row) return null;
      return row.querySelector(".readonly") || row.querySelector("div");
    }

    function syncCountry() {
      var city = nameSelect.value;
      var country = map[city] || "—";
      var el = getCountryDisplayEl();
      if (el) {
        el.textContent = country;
      }
    }

    nameSelect.addEventListener("change", syncCountry);
    if (nameSelect.value) {
      syncCountry();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindCityCountry);
  } else {
    bindCityCountry();
  }
})();
