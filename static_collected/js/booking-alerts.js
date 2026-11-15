/**
 * Unified booking alerts (modal + toast). Replaces window.alert / confirm.
 * Usage:
 *   BookingAlert.toast("Saved", "success");
 *   BookingAlert.alert("Something went wrong", { type: "error", title: "Error" });
 *   const ok = await BookingAlert.confirm("Continue to payment?");
 */
(function (global) {
  "use strict";

  var ICONS = {
    success: "fa-solid fa-circle-check",
    error: "fa-solid fa-circle-exclamation",
    warn: "fa-solid fa-triangle-exclamation",
    info: "fa-solid fa-circle-info",
    confirm: "fa-solid fa-circle-question"
  };

  var TITLES = {
    success: "Success",
    error: "Error",
    warn: "Notice",
    info: "Info",
    confirm: "Please confirm"
  };

  function ensureToastStack() {
    var el = document.getElementById("ba-toast-stack");
    if (!el) {
      el = document.createElement("div");
      el.id = "ba-toast-stack";
      el.className = "ba-toast-stack";
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    return el;
  }

  function ensureOverlay() {
    var el = document.getElementById("ba-overlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "ba-overlay";
      el.className = "ba-overlay";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.innerHTML =
        '<div class="ba-modal" id="ba-modal">' +
        '  <div class="ba-modal__icon" id="ba-modal-icon"><i></i></div>' +
        '  <h3 class="ba-modal__title" id="ba-modal-title"></h3>' +
        '  <p class="ba-modal__body" id="ba-modal-body"></p>' +
        '  <div class="ba-modal__actions" id="ba-modal-actions"></div>' +
        "</div>";
      document.body.appendChild(el);
      el.addEventListener("click", function (e) {
        if (e.target === el && el._allowDismiss) {
          closeModal(false);
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && el.classList.contains("is-open") && el._allowDismiss) {
          closeModal(false);
        }
      });
    }
    return el;
  }

  var _resolve = null;

  function closeModal(result) {
    var overlay = document.getElementById("ba-overlay");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay._allowDismiss = false;
    if (_resolve) {
      var r = _resolve;
      _resolve = null;
      r(result);
    }
  }

  function openModal(options) {
    options = options || {};
    var type = options.type || "info";
    var overlay = ensureOverlay();
    var modal = document.getElementById("ba-modal");
    var iconWrap = document.getElementById("ba-modal-icon");
    var titleEl = document.getElementById("ba-modal-title");
    var bodyEl = document.getElementById("ba-modal-body");
    var actions = document.getElementById("ba-modal-actions");

    modal.className = "ba-modal ba-modal--" + type;
    iconWrap.innerHTML = '<i class="' + (ICONS[type] || ICONS.info) + '"></i>';
    titleEl.textContent = options.title || TITLES[type] || "Notice";
    bodyEl.textContent = options.message || "";

    actions.className = "ba-modal__actions" + (options.confirm ? " is-split" : "");
    actions.innerHTML = "";

    return new Promise(function (resolve) {
      _resolve = resolve;
      overlay._allowDismiss = !options.confirm;

      if (options.confirm) {
        var cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "ba-btn ba-btn--ghost";
        cancelBtn.textContent = options.cancelText || "Cancel";
        cancelBtn.addEventListener("click", function () {
          closeModal(false);
        });

        var okBtn = document.createElement("button");
        okBtn.type = "button";
        okBtn.className = "ba-btn ba-btn--primary";
        okBtn.textContent = options.okText || "OK";
        okBtn.addEventListener("click", function () {
          closeModal(true);
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(okBtn);
        setTimeout(function () {
          okBtn.focus();
        }, 50);
      } else {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ba-btn ba-btn--primary";
        btn.textContent = options.okText || "OK";
        btn.addEventListener("click", function () {
          closeModal(true);
        });
        actions.appendChild(btn);
        setTimeout(function () {
          btn.focus();
        }, 50);
      }

      overlay.classList.add("is-open");
    });
  }

  function toast(message, type, durationMs) {
    type = type || "info";
    durationMs = durationMs == null ? 4200 : durationMs;
    var stack = ensureToastStack();
    var el = document.createElement("div");
    el.className = "ba-toast ba-toast--" + type;
    el.innerHTML =
      '<div class="ba-toast__icon"><i class="' +
      (ICONS[type] || ICONS.info) +
      '"></i></div>' +
      '<div class="ba-toast__text"></div>' +
      '<button type="button" class="ba-toast__close" aria-label="Close">&times;</button>';
    el.querySelector(".ba-toast__text").textContent = message || "";
    var closer = el.querySelector(".ba-toast__close");
    function remove() {
      if (el._gone) return;
      el._gone = true;
      el.classList.add("is-leaving");
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 280);
    }
    closer.addEventListener("click", remove);
    stack.appendChild(el);
    if (durationMs > 0) {
      setTimeout(remove, durationMs);
    }
    return el;
  }

  function alert(message, opts) {
    opts = opts || {};
    if (typeof opts === "string") {
      opts = { type: opts };
    }
    return openModal({
      message: message,
      type: opts.type || "info",
      title: opts.title,
      okText: opts.okText
    });
  }

  function confirm(message, opts) {
    opts = opts || {};
    return openModal({
      message: message,
      type: "confirm",
      title: opts.title || "Please confirm",
      confirm: true,
      okText: opts.okText || "Confirm",
      cancelText: opts.cancelText || "Cancel"
    });
  }

  global.BookingAlert = {
    toast: toast,
    alert: alert,
    confirm: confirm
  };
})(typeof window !== "undefined" ? window : this);
