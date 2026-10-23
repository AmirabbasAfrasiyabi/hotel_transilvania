(function () {
  function bindCityCountry() {
    var nameSelect = document.getElementById("id_name");
    var countrySelect = document.getElementById("id_country");
    if (!nameSelect || !countrySelect) return;

    var map = window.CITY_TO_COUNTRY || {};

    function syncCountry() {
      var city = nameSelect.value;
      var country = map[city];
      if (!country) return;

      // اگر گزینه کشور وجود داشت انتخابش کن
      var found = false;
      for (var i = 0; i < countrySelect.options.length; i++) {
        if (countrySelect.options[i].value === country) {
          countrySelect.selectedIndex = i;
          found = true;
          break;
        }
      }
      // اگر نبود، موقتاً اضافه کن
      if (!found) {
        var opt = document.createElement("option");
        opt.value = country;
        opt.textContent = country;
        countrySelect.appendChild(opt);
        countrySelect.value = country;
      }
    }

    nameSelect.addEventListener("change", syncCountry);
    // اگر از قبل شهری انتخاب شده
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
