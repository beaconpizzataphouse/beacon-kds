/* Beacon KDS — display logic.
   All order data comes from orders.js (KDS_DATA.fetchOrders).
   This file only renders, times, bumps, recalls, and adds
   test orders. No network, no login, no settings. */

(function () {
  "use strict";

  var MIN = 60 * 1000;
  var STORAGE_KEY = "beacon-kds-v1";
  var STALE_AFTER = 3 * 60 * MIN; // saved demo older than 3h -> reseed

  // Age thresholds (minutes): green under 10, amber 10-15, red over 15.
  var WARN_AT = 10;
  var LATE_AT = 15;

  // Quick-pick menu for the "add test order" form.
  var MENU = [
    { group: "Pizzas", sized: true, items: [
      "Pepperoni", "Cheese", "Supreme", "Meat Lovers", "Hawaiian",
      "Veggie", "BBQ Chicken", "Buffalo Chicken", "Margherita", "The Beacon"
    ]},
    { group: "Wings", sized: false, items: [
      "Bone-In Wings 6 — Buffalo", "Bone-In Wings 12 — Buffalo",
      "Boneless Wings 6 — BBQ", "Boneless Wings 12 — BBQ",
      "Boneless Wings 12 — Garlic Parm"
    ]},
    { group: "Salads & Sides", sized: false, items: [
      "House Salad", "Caesar Salad", "Breadsticks",
      "Mozzarella Sticks", "Garlic Knots"
    ]}
  ];
  var SIZES = ["S", "M", "L", "XL"];

  var state = {
    orders: [],       // active, newest first
    bumped: [],       // bumped stack, most recent last (for recall)
    bumpedTotal: 0,   // bumped this session (shown in the header)
    nextNumber: 215
  };

  var draft = { items: [], size: "L", type: "takeout" };

  var gridEl, toastEl, toastTimer;

  /* ---------- helpers ---------- */

  function $(id) { return document.getElementById(id); }

  function statusOf(placedAt) {
    var mins = (Date.now() - placedAt) / MIN;
    if (mins >= LATE_AT) return "late";
    if (mins >= WARN_AT) return "warn";
    return "fresh";
  }

  function elapsedText(placedAt) {
    var mins = Math.floor((Date.now() - placedAt) / MIN);
    if (mins < 60) return mins + " MIN";
    var h = Math.floor(mins / 60);
    return h + " HR " + (mins % 60) + " MIN";
  }

  function sortNewestFirst() {
    state.orders.sort(function (a, b) { return b.placedAt - a.placedAt; });
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* private mode — demo still works, just won't persist */ }
  }

  function loadSaved() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var saved = JSON.parse(raw);
      if (!saved || !Array.isArray(saved.orders)) return false;
      // Stale demo (e.g. opened the next day) -> reseed fresh.
      var newest = 0;
      saved.orders.forEach(function (o) { if (o.placedAt > newest) newest = o.placedAt; });
      if (newest && Date.now() - newest > STALE_AFTER) return false;
      state = saved;
      return true;
    } catch (e) { return false; }
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 4000);
  }

  /* ---------- rendering ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function ticketHTML(order) {
    var status = statusOf(order.placedAt);
    var items = order.items.map(function (it) {
      var size = it.size ? '<span class="size">' + esc(it.size) + "</span> " : "";
      var mods = (it.mods && it.mods.length)
        ? '<div class="item-mods">' + it.mods.map(esc).join(" · ") + "</div>" : "";
      return '<li><div class="item-line"><span class="qty">' + it.qty + "×</span> " +
        size + esc(it.name) + "</div>" + mods + "</li>";
    }).join("");

    var typeLabel = order.type === "dine-in" ? "DINE-IN" : "TAKEOUT";
    var typeClass = order.type === "dine-in" ? "" : " takeout";

    return '<article class="ticket status-' + status + '" data-id="' + esc(order.id) + '">' +
      '<div class="ticket-head"><div>' +
        '<div class="order-no">#' + order.number + "</div>" +
        '<div class="order-name">' + esc(order.name) + "</div>" +
        '<span class="type-badge' + typeClass + '">' + typeLabel + "</span>" +
      "</div>" +
      '<div class="elapsed"><div class="mins" data-elapsed-for="' + esc(order.id) + '">' +
        elapsedText(order.placedAt) +
      "</div><div class=\"label\">ON THE BOARD</div></div></div>" +
      '<ul class="ticket-items">' + items + "</ul>" +
      '<div class="ticket-foot">TAP TICKET TO BUMP ✓</div>' +
    "</article>";
  }

  function render() {
    sortNewestFirst();
    $("open-count").textContent = state.orders.length;
    $("bumped-count").textContent = state.bumpedTotal;
    var recallBtn = $("recall-btn");
    recallBtn.disabled = state.bumped.length === 0;
    recallBtn.textContent = state.bumped.length
      ? "↩ Recall last (" + state.bumped.length + ")"
      : "↩ Recall last";

    if (!state.orders.length) {
      gridEl.innerHTML =
        '<div class="empty"><div class="big">All caught up ✓</div>' +
        '<div class="sub">No open orders. Tap “+ New order” to try one.</div></div>';
      return;
    }
    gridEl.innerHTML = state.orders.map(ticketHTML).join("");
  }

  // Lightweight refresh: update clocks/colors without rebuilding tickets.
  function tick() {
    var now = new Date();
    var h = now.getHours(), m = now.getMinutes();
    var ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    $("clock").textContent = h + ":" + (m < 10 ? "0" : "") + m + " " + ap;

    state.orders.forEach(function (order) {
      var el = gridEl.querySelector('[data-elapsed-for="' + order.id + '"]');
      if (el) el.textContent = elapsedText(order.placedAt);
      var ticket = gridEl.querySelector('.ticket[data-id="' + order.id + '"]');
      if (ticket) {
        ticket.classList.remove("status-fresh", "status-warn", "status-late");
        ticket.classList.add("status-" + statusOf(order.placedAt));
      }
    });
  }

  /* ---------- bump / recall ---------- */

  function bump(id) {
    var idx = -1, order = null;
    state.orders.forEach(function (o, i) { if (o.id === id) { idx = i; order = o; } });
    if (!order) return;
    var ticket = gridEl.querySelector('.ticket[data-id="' + id + '"]');
    if (ticket) ticket.classList.add("bumping");
    setTimeout(function () {
      state.orders.splice(idx, 1);
      state.bumped.push(order);
      state.bumpedTotal += 1;
      save();
      render();
      showToast("Order #" + order.number + " bumped — tap Recall to undo");
    }, 180);
  }

  function recall() {
    var order = state.bumped.pop();
    if (!order) return;
    state.orders.push(order);
    save();
    render();
    showToast("Order #" + order.number + " is back on the board");
    var ticket = gridEl.querySelector('.ticket[data-id="' + order.id + '"]');
    if (ticket) ticket.classList.add("fresh-flash");
  }

  function resetDemo() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    KDS_DATA.fetchOrders().then(function (orders) {
      state = { orders: orders, bumped: [], bumpedTotal: 0,
                nextNumber: Math.max.apply(null, orders.map(function (o) { return o.number; })) + 1 };
      save();
      render();
      showToast("Demo orders reloaded");
    });
  }

  /* ---------- add test order ---------- */

  function renderDraft() {
    var wrap = $("draft-items");
    if (!draft.items.length) {
      wrap.innerHTML = '<div class="draft-empty">Tap items above to add them here.</div>';
    } else {
      wrap.innerHTML = draft.items.map(function (it, i) {
        var label = (it.size ? it.size + " " : "") + it.name;
        return '<div class="draft-line"><span class="qty">' + it.qty + "×</span>" +
          '<span class="nm">' + esc(label) + "</span>" +
          '<button class="mini-btn" data-draft-minus="' + i + '" aria-label="Remove one">−</button>' +
          '<button class="mini-btn" data-draft-del="' + i + '" aria-label="Remove item">✕</button></div>';
      }).join("");
    }
    $("add-order-btn").disabled = draft.items.length === 0;
  }

  function addDraftItem(name, sized) {
    var size = sized ? draft.size : "";
    var found = null;
    draft.items.forEach(function (it) {
      if (it.name === name && it.size === size) found = it;
    });
    if (found) { found.qty += 1; } else {
      draft.items.push({ qty: 1, size: size, name: name, mods: [] });
    }
    renderDraft();
  }

  function openModal() {
    draft = { items: [], size: "L", type: "takeout" };
    $("name-input").value = "";
    document.querySelectorAll(".size-chip").forEach(function (chip) {
      chip.classList.toggle("selected", chip.dataset.size === "L");
    });
    document.querySelectorAll(".type-btn").forEach(function (btn) {
      btn.classList.toggle("selected", btn.dataset.type === "takeout");
    });
    renderDraft();
    $("modal").classList.add("open");
  }

  function closeModal() { $("modal").classList.remove("open"); }

  function submitOrder() {
    if (!draft.items.length) return;
    var name = $("name-input").value.trim() ||
      (draft.type === "dine-in" ? "Dine-in" : "Takeout");
    var order = {
      id: "ord-local-" + Date.now(),
      number: state.nextNumber++,
      name: name,
      type: draft.type,
      placedAt: Date.now(),
      items: draft.items
    };
    state.orders.push(order);
    save();
    closeModal();
    render();
    var ticket = gridEl.querySelector('.ticket[data-id="' + order.id + '"]');
    if (ticket) ticket.classList.add("fresh-flash");
    showToast("Order #" + order.number + " added to the board");
  }

  function buildPickButtons() {
    var host = $("pick-groups");
    host.innerHTML = MENU.map(function (g) {
      var btns = g.items.map(function (item) {
        return '<button class="pick-btn" data-item="' + esc(item) +
          '" data-sized="' + (g.sized ? "1" : "0") + '">' + esc(item) + "</button>";
      }).join("");
      return '<div class="pick-group"><h3>' + esc(g.group) + "</h3>" +
        '<div class="pick-grid">' + btns + "</div></div>";
    }).join("");
  }

  /* ---------- wire up ---------- */

  function init() {
    gridEl = $("grid");
    toastEl = $("toast");

    buildPickButtons();

    gridEl.addEventListener("click", function (e) {
      var ticket = e.target.closest(".ticket");
      if (ticket) bump(ticket.dataset.id);
    });

    $("new-order-btn").addEventListener("click", openModal);
    $("cancel-btn").addEventListener("click", closeModal);
    $("modal").addEventListener("click", function (e) {
      if (e.target === $("modal")) closeModal();
    });
    $("add-order-btn").addEventListener("click", submitOrder);
    $("recall-btn").addEventListener("click", recall);
    $("reset-btn").addEventListener("click", resetDemo);

    document.querySelectorAll(".size-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        draft.size = chip.dataset.size;
        document.querySelectorAll(".size-chip").forEach(function (c) {
          c.classList.toggle("selected", c === chip);
        });
      });
    });

    document.querySelectorAll(".type-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        draft.type = btn.dataset.type;
        document.querySelectorAll(".type-btn").forEach(function (b) {
          b.classList.toggle("selected", b === btn);
        });
      });
    });

    $("pick-groups").addEventListener("click", function (e) {
      var btn = e.target.closest(".pick-btn");
      if (btn) addDraftItem(btn.dataset.item, btn.dataset.sized === "1");
    });

    $("draft-items").addEventListener("click", function (e) {
      var minus = e.target.closest("[data-draft-minus]");
      var del = e.target.closest("[data-draft-del]");
      if (minus) {
        var i = +minus.dataset.draftMinus;
        draft.items[i].qty -= 1;
        if (draft.items[i].qty <= 0) draft.items.splice(i, 1);
        renderDraft();
      } else if (del) {
        draft.items.splice(+del.dataset.draftDel, 1);
        renderDraft();
      }
    });

    // First paint: saved state if fresh, else demo orders.
    if (loadSaved()) {
      render();
    } else {
      KDS_DATA.fetchOrders().then(function (orders) {
        state.orders = orders;
        state.nextNumber = Math.max.apply(null,
          orders.map(function (o) { return o.number; })) + 1;
        save();
        render();
      });
    }

    tick();
    setInterval(tick, 15000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
