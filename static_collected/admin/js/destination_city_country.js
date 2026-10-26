(function () {
  var CITY_TO_COUNTRY = {
    "Istanbul": "Turkey",
    "Antalya": "Turkey",
    "Ankara": "Turkey",
    "Izmir": "Turkey",
    "Trabzon": "Turkey",
    "Bodrum": "Turkey",
    "Dubai": "United Arab Emirates",
    "Abu Dhabi": "United Arab Emirates",
    "Sharjah": "United Arab Emirates",
    "Doha": "Qatar",
    "Riyadh": "Saudi Arabia",
    "Jeddah": "Saudi Arabia",
    "Muscat": "Oman",
    "Kuwait City": "Kuwait",
    "Manama": "Bahrain",
    "Baghdad": "Iraq",
    "Tbilisi": "Georgia",
    "Batumi": "Georgia",
    "Yerevan": "Armenia",
    "Baku": "Azerbaijan",
    "Paris": "France",
    "Nice": "France",
    "London": "United Kingdom",
    "Manchester": "United Kingdom",
    "Rome": "Italy",
    "Milan": "Italy",
    "Venice": "Italy",
    "Barcelona": "Spain",
    "Madrid": "Spain",
    "Berlin": "Germany",
    "Munich": "Germany",
    "Frankfurt": "Germany",
    "Hamburg": "Germany",
    "Amsterdam": "Netherlands",
    "Vienna": "Austria",
    "Zurich": "Switzerland",
    "Geneva": "Switzerland",
    "Athens": "Greece",
    "Thessaloniki": "Greece",
    "Prague": "Czech Republic",
    "Budapest": "Hungary",
    "Warsaw": "Poland",
    "Lisbon": "Portugal",
    "Stockholm": "Sweden",
    "Copenhagen": "Denmark",
    "Brussels": "Belgium",
    "Dublin": "Ireland",
    "Larnaca": "Cyprus",
    "Moscow": "Russia",
    "Saint Petersburg": "Russia",
    "Beijing": "China",
    "Shanghai": "China",
    "Tokyo": "Japan",
    "Osaka": "Japan",
    "Bangkok": "Thailand",
    "Phuket": "Thailand",
    "Kuala Lumpur": "Malaysia",
    "Bali": "Indonesia",
    "Singapore": "Singapore",
    "Delhi": "India",
    "Mumbai": "India",
    "New York": "United States",
    "Los Angeles": "United States",
    "Toronto": "Canada",
    "Sydney": "Australia",
    "Melbourne": "Australia"
  };

  function bind() {
    var nameSelect = document.getElementById("id_name");
    var countryInput = document.getElementById("id_country");
    if (!nameSelect || !countryInput) return;

    function sync() {
      var city = nameSelect.value;
      countryInput.value = CITY_TO_COUNTRY[city] || "";
    }

    nameSelect.addEventListener("change", sync);
    sync(); // اگر از قبل شهری انتخاب شده
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
