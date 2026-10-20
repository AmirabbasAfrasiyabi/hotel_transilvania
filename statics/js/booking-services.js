(function () {
  "use strict";

  const booking = window.BOOKING;
  if (!booking) return;

  const offer = window.BOOKING_OFFER || {};
  const passengers = Array.isArray(window.BOOKING_PASSENGERS)
    ? window.BOOKING_PASSENGERS
    : [];

  const BAG_PRICES = { carry_on: 25, checked_23: 45, checked_32: 70 };
  const MAX_CHECKED = 3;
  const MAX_CARRY = 1;
  const PRIORITY_PRICE = 15;

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
  }

  function money(n) {
    const v = Number(n) || 0;
    return v.toFixed(2) + " " + (booking.currency || "USD");
  }

  function buildSegments() {
    const slices = offer.slices || [];
    if (slices.length) {
      return slices.map(function (sl, i) {
        const dep = sl.departure || {};
        const arr = sl.arrival || {};
        const origin = dep.airport || dep.city || booking.origin || "—";
        const dest = arr.airport || arr.city || booking.destination || "—";
        return {
          id: "slice_" + i,
          direction: i === 0 ? "Depart" : "Return",
          label: origin + " → " + dest,
        };
      });
    }
    return [
      {
        id: "slice_0",
        direction: "Depart",
        label: (booking.origin || "—") + " → " + (booking.destination || "—"),
      },
    ];
  }

  function buildPassengerList() {
    if (passengers.length) {
      return passengers.map(function (p, i) {
        return {
          id: p.id || i + 1,
          order: p.order || i + 1,
          name:
            ((p.first_name || "") + " " + (p.last_name || "")).trim() ||
            "Passenger " + (i + 1),
          type: p.passenger_type || "adult",
        };
      });
    }
    const list = [];
    let n = 1;
    for (let i = 0; i < (booking.adults || 1); i++) {
      list.push({ id: n, order: n, name: "Passenger " + n, type: "adult" });
      n++;
    }
    for (let i = 0; i < (booking.children || 0); i++) {
      list.push({ id: n, order: n, name: "Passenger " + n, type: "child" });
      n++;
    }
    for (let i = 0; i < (booking.infants || 0); i++) {
      list.push({ id: n, order: n, name: "Passenger " + n, type: "infant" });
      n++;
    }
    return list;
  }

  const segments = buildSegments();
  const paxList = buildPassengerList();

  const bagState = {};
  segments.forEach(function (seg) {
    bagState[seg.id] = {};
    paxList.forEach(function (p) {
      bagState[seg.id][p.order] = { carry_on: 0, checked: 0 };
    });
  });

  const seatState = {};
  paxList.forEach(function (p) {
    seatState[p.order] = "none";
  });

  const ffState = {};
  paxList.forEach(function (p) {
    ffState[p.order] = { program: "", number: "" };
  });

  function bagExtrasTotal() {
    let total = 0;
    segments.forEach(function (seg) {
      paxList.forEach(function (p) {
        if (p.type === "infant") return;
        const s = bagState[seg.id][p.order];
        total += (s.carry_on || 0) * BAG_PRICES.carry_on;
        total += (s.checked || 0) * BAG_PRICES.checked_23;
      });
    });
    const priority = document.getElementById("extraPriority");
    if (priority && priority.checked) total += PRIORITY_PRICE;
    return total;
  }

  function updateTotals() {
    const extras = bagExtrasTotal();
    const base = Number(booking.basePrice) || 0;
    const taxes = Number(booking.taxes) || 0;
    const total = base + taxes + extras;
    const elExtras = document.getElementById("svcExtrasPrice");
    const elTotal = document.getElementById("svcTotal");
    const elSticky = document.getElementById("svcStickyPrice");
    if (elExtras) elExtras.textContent = money(extras);
    if (elTotal) elTotal.textContent = money(total);
    if (elSticky) elSticky.textContent = money(total);
  }

  function bagCell(kind, segId, paxOrder, count) {
    if (count === 0) {
      return (
        '<button type="button" class="svc-add-btn" data-kind="' +
        kind +
        '" data-segment="' +
        segId +
        '" data-pax="' +
        paxOrder +
        '">Add</button>' +
        '<div class="svc-price-tag">' +
        money(kind === "carry_on" ? BAG_PRICES.carry_on : BAG_PRICES.checked_23) +
        " each</div>"
      );
    }
    return (
      '<div class="svc-stepper" data-kind="' +
      kind +
      '" data-segment="' +
      segId +
      '" data-pax="' +
      paxOrder +
      '">' +
      '<button type="button" data-act="dec" aria-label="Decrease">−</button>' +
      "<span data-count>" +
      count +
      "</span>" +
      '<button type="button" data-act="inc" aria-label="Increase">+</button>' +
      "</div>" +
      '<div class="svc-price-tag">' +
      money(kind === "carry_on" ? BAG_PRICES.carry_on : BAG_PRICES.checked_23) +
      " each</div>"
    );
  }

  function renderBaggage() {
    const root = document.getElementById("svcBaggage");
    if (!root) return;
    let html = "";
    segments.forEach(function (seg) {
      html +=
        '<div class="svc-segment" data-segment="' +
        seg.id +
        '">' +
        '<div class="svc-segment-head">' +
        '<span class="svc-dir">' +
        seg.direction +
        "</span> " +
        seg.label +
        "</div>";
      paxList.forEach(function (p) {
        if (p.type === "infant") {
          html +=
            '<div class="svc-pax-row">' +
            '<div class="svc-pax-name">' +
            p.name +
            "<small>Infant · no hold bag</small></div>" +
            "<div><div class=\"svc-col-label\">Personal</div><span class=\"svc-included\">1 × 7 kg</span></div>" +
            "<div><div class=\"svc-col-label\">Carry-on</div><span class=\"svc-not-included\">N/A</span></div>" +
            "<div><div class=\"svc-col-label\">Checked</div><span class=\"svc-not-included\">N/A</span></div>" +
            "</div>";
          return;
        }
        const st = bagState[seg.id][p.order];
        html +=
          '<div class="svc-pax-row" data-pax="' +
          p.order +
          '">' +
          '<div class="svc-pax-name">' +
          p.name +
          "<small>" +
          p.type +
          "</small></div>" +
          "<div><div class=\"svc-col-label\">Personal item</div><span class=\"svc-included\">1 × 7 kg</span></div>" +
          "<div><div class=\"svc-col-label\">Carry-on</div>" +
          bagCell("carry_on", seg.id, p.order, st.carry_on) +
          "</div>" +
          "<div><div class=\"svc-col-label\">Checked (23 kg)</div>" +
          bagCell("checked", seg.id, p.order, st.checked) +
          "</div></div>";
      });
      html += "</div>";
    });
    root.innerHTML = html;
  }

  function renderSeats() {
    const root = document.getElementById("svcSeats");
    if (!root) return;
    let html = '<div class="svc-seat-grid">';
    paxList.forEach(function (p) {
      if (p.type === "infant") return;
      const cur = seatState[p.order];
      const opts = [
        ["none", "No preference", "fa-minus"],
        ["window", "Window", "fa-window-maximize"],
        ["aisle", "Aisle", "fa-arrows-alt-h"],
        ["exit", "Exit row", "fa-door-open"],
        ["extra_legroom", "Extra legroom", "fa-arrows-alt-v"],
      ];
      html +=
        '<div class="svc-seat-card">' +
        '<div class="svc-pax-name">' +
        p.name +
        "<small>" +
        p.type +
        "</small></div><div class=\"svc-seat-opts\">";
      opts.forEach(function (o) {
        html +=
          '<label class="svc-seat-opt">' +
          '<input type="radio" name="seat_' +
          p.order +
          '" value="' +
          o[0] +
          '" ' +
          (cur === o[0] ? "checked" : "") +
          ">" +
          '<span class="svc-seat-icon"><i class="fa-solid ' +
          o[2] +
          '"></i></span> ' +
          o[1] +
          "</label>";
      });
      html += "</div></div>";
    });
    html += "</div>";
    root.innerHTML = html;
    root.querySelectorAll('input[type="radio"]').forEach(function (inp) {
      inp.addEventListener("change", function () {
        const order = Number(this.name.replace("seat_", ""));
        seatState[order] = this.value;
      });
    });
  }

  function renderFrequentFlyer() {
    const root = document.getElementById("svcFrequentFlyer");
    if (!root) return;
    let html = '<div class="svc-ff-grid">';
    paxList.forEach(function (p) {
      if (p.type === "infant") return;
      const st = ffState[p.order];
      html +=
        '<div class="svc-ff-card">' +
        '<div class="svc-pax-name">' +
        p.name +
        "</div>" +
        '<div class="svc-ff-fields">' +
        '<div class="bp-field"><label>Airline / program</label>' +
        '<input type="text" data-ff="program" data-pax="' +
        p.order +
        '" value="' +
        (st.program || "") +
        '" maxlength="40" placeholder="e.g. British Airways"></div>' +
        '<div class="bp-field"><label>Membership number</label>' +
        '<input type="text" data-ff="number" data-pax="' +
        p.order +
        '" value="' +
        (st.number || "") +
        '" maxlength="40" placeholder="Optional"></div>' +
        "</div></div>";
    });
    html += "</div>";
    root.innerHTML = html;
    root.querySelectorAll("[data-ff]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        const order = Number(this.getAttribute("data-pax"));
        const key = this.getAttribute("data-ff");
        ffState[order][key] = this.value.trim();
      });
    });
  }

  document.getElementById("svcBaggage")?.addEventListener("click", function (e) {
    const addBtn = e.target.closest(".svc-add-btn");
    if (addBtn) {
      const kind = addBtn.getAttribute("data-kind");
      const seg = addBtn.getAttribute("data-segment");
      const pax = Number(addBtn.getAttribute("data-pax"));
      bagState[seg][pax][kind] = 1;
      renderBaggage();
      updateTotals();
      return;
    }
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const stepper = btn.closest(".svc-stepper");
    if (!stepper) return;
    const kind = stepper.getAttribute("data-kind");
    const seg = stepper.getAttribute("data-segment");
    const pax = Number(stepper.getAttribute("data-pax"));
    const st = bagState[seg][pax];
    const max = kind === "carry_on" ? MAX_CARRY : MAX_CHECKED;
    if (btn.getAttribute("data-act") === "inc") {
      if (st[kind] < max) st[kind] += 1;
    } else {
      if (st[kind] > 0) st[kind] -= 1;
    }
    renderBaggage();
    updateTotals();
  });

  const mealCb = document.getElementById("extraMeal");
  const mealWrap = document.getElementById("mealTypeWrap");
  if (mealCb && mealWrap) {
    mealCb.addEventListener("change", function () {
      mealWrap.hidden = !this.checked;
    });
  }
  const assistCb = document.getElementById("extraAssist");
  const assistWrap = document.getElementById("assistNoteWrap");
  if (assistCb && assistWrap) {
    assistCb.addEventListener("change", function () {
      assistWrap.hidden = !this.checked;
    });
  }
  document.getElementById("extraPriority")?.addEventListener("change", updateTotals);

  function collectPayload() {
    const baggage = [];
    segments.forEach(function (seg) {
      paxList.forEach(function (p) {
        if (p.type === "infant") return;
        const st = bagState[seg.id][p.order];
        baggage.push({
          segment_id: seg.id,
          segment_label: seg.label,
          direction: seg.direction,
          passenger_order: p.order,
          passenger_name: p.name,
          personal_item: 1,
          carry_on: st.carry_on,
          checked: st.checked,
        });
      });
    });
    const seats = paxList
      .filter(function (p) {
        return p.type !== "infant";
      })
      .map(function (p) {
        return {
          passenger_order: p.order,
          passenger_name: p.name,
          preference: seatState[p.order] || "none",
        };
      });
    const frequent_flyer = paxList
      .filter(function (p) {
        return p.type !== "infant";
      })
      .map(function (p) {
        return {
          passenger_order: p.order,
          passenger_name: p.name,
          program: (ffState[p.order] && ffState[p.order].program) || "",
          number: (ffState[p.order] && ffState[p.order].number) || "",
        };
      });
    const extras = {
      special_meal: !!(mealCb && mealCb.checked),
      meal_type: (document.getElementById("mealType") || {}).value || "",
      special_assistance: !!(assistCb && assistCb.checked),
      assistance_note: (document.getElementById("assistNote") || {}).value || "",
      priority_boarding: !!(document.getElementById("extraPriority") || {}).checked,
      travel_insurance: !!(document.getElementById("extraInsurance") || {}).checked,
    };
    return {
      baggage: baggage,
      seats: seats,
      frequent_flyer: frequent_flyer,
      extras: extras,
      service_amount: bagExtrasTotal(),
      currency: booking.currency,
    };
  }

  function showError(msg) {
    const el = document.getElementById("svcFormError");
    if (!el) {
      alert(msg);
      return;
    }
    el.textContent = msg;
    el.hidden = false;
    el.style.display = "block";
  }

  async function submitServices(skip) {
    const payload = skip
      ? {
          baggage: [],
          seats: paxList
            .filter(function (p) {
              return p.type !== "infant";
            })
            .map(function (p) {
              return {
                passenger_order: p.order,
                passenger_name: p.name,
                preference: "none",
              };
            }),
          frequent_flyer: [],
          extras: {},
          service_amount: 0,
          currency: booking.currency,
          skipped: true,
        }
      : collectPayload();

    const btn = document.getElementById("svcContinueBtn");
    const sticky = document.getElementById("svcStickyContinue");
    const skipBtn = document.getElementById("svcSkipBtn");
    if (btn) btn.disabled = true;
    if (sticky) sticky.disabled = true;
    if (skipBtn) skipBtn.disabled = true;

    try {
      const res = await fetch("/booking/services/" + booking.id + "/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showError(data.error || "Could not save services.");
        return;
      }
      window.location.href = data.next_url || "/booking/review/" + booking.id + "/";
    } catch (e) {
      showError("Network error. Please try again.");
    } finally {
      if (btn) btn.disabled = false;
      if (sticky) sticky.disabled = false;
      if (skipBtn) skipBtn.disabled = false;
    }
  }

  renderBaggage();
  renderSeats();
  renderFrequentFlyer();
  updateTotals();

  document.getElementById("svcContinueBtn")?.addEventListener("click", function () {
    submitServices(false);
  });
  document.getElementById("svcStickyContinue")?.addEventListener("click", function () {
    submitServices(false);
  });
  document.getElementById("svcSkipBtn")?.addEventListener("click", function () {
    submitServices(true);
  });
})();
