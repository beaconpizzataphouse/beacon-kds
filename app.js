/* Beacon KDS — display logic.
   All order data comes from orders.js (KDS_DATA.fetchOrders).
   This file only renders, times, bumps, recalls, and adds
   test orders. No network, no login, no settings. */

(function () {
  "use strict";

  var MIN = 60 * 1000;
  // v3: demo data is now the real Beacon menu from the Square
  // catalog export (real sizes 12"/16"/18"/GF 10", real prices),
  // so saved v2 state with the old guessed items is discarded
  // and the demo reseeds fresh.
  var STORAGE_KEY = "beacon-kds-v3";
  var STALE_AFTER = 3 * 60 * MIN; // saved demo older than 3h -> reseed

  // Age thresholds (minutes): green under 10, amber 10-15, red over 15.
  var WARN_AT = 10;
  var LATE_AT = 15;

  // Quick-pick menu for the "add test order" form — the REAL Beacon
  // menu from the Square catalog export (square-catalog-2026-11-21.csv,
  // 351 active items), with real Square prices.
  // Each group carries one category — that is what the station
  // filter uses (see orders.js). Pizzas carry one price per size
  // (12"/16"/18" plus GF 10" cauliflower crust); everything else
  // carries a single price. Prices are stored on each added item
  // (the future order screen will need them) and shown on the
  // form; kitchen tickets themselves don't show prices.
  var MENU = [
    { group: "Pizzas", category: "pizza", sized: true, items: [
      { n: "Mexican", p: { '12"': 21.95, '16"': 25.95, '18"': 28.95, 'GF 10"': 21.95 } },
      { n: "BBQ Chicken", p: { '12"': 22.95, '16"': 26.95, '18"': 29.95, 'GF 10"': 20.95 } },
      { n: "Beacon Supreme", p: { '12"': 25.95, '16"': 29.95, '18"': 32.95, 'GF 10"': 24.95 } },
      { n: "Bernie", p: { '12"': 21.95, '16"': 25.95, '18"': 28.95, 'GF 10"': 20.95 } },
      { n: "Build Your Own", p: { '12"': 16.95, '16"': 20.95, '18"': 23.95, 'GF 10"': 15.95 } },
      { n: "Classic Pepperoni", p: { '12"': 18.95, '16"': 22.95, '18"': 25.95, 'GF 10"': 17.95 } },
      { n: "Hawaiian", p: { '12"': 20.95, '16"': 24.95, '18"': 27.95, 'GF 10"': 19.95 } },
      { n: "Jibe", p: { '12"': 21.95, '16"': 25.95, '18"': 29.95, 'GF 10"': 20.95 } },
      { n: "Mediterranean", p: { '12"': 22.95, '16"': 26.95, '18"': 29.95, 'GF 10"': 21.95 } },
      { n: "Spicy Luau", p: { '12"': 21.95, '16"': 25.95, '18"': 28.95, 'GF 10"': 20.95 } },
      { n: "Tree Hugger", p: { '12"': 20.95, '16"': 24.95, '18"': 27.95, 'GF 10"': 19.95 } },
      { n: "Ultimate Cheese", p: { '12"': 16.95, '16"': 20.95, '18"': 23.95, 'GF 10"': 16.95 } },
      { n: "Buffalo Chicken", p: { '12"': 22.95, '16"': 26.95, '18"': 29.95, 'GF 10"': 20.95 } },
      { n: "Chicken Bacon Ranch", p: { '12"': 22.95, '16"': 26.95, '18"': 29.95, 'GF 10"': 22.95 } }
    ]},
    { group: "Wings", category: "wings", sized: false, items: [
      { n: "Bone-in Wings", p: 18.99 },
      { n: "Boneless Wings 5", p: 7.99 },
      { n: "Boneless Wings 10", p: 13.99 },
      { n: "Boneless Wings 15", p: 18.99 }
    ]},
    { group: "Sandwiches", category: "sandwich", sized: false, items: [
      { n: "BLT", p: 11.99 },
      { n: "Beacon Club", p: 13.99 },
      { n: "Beacon Prime Dip", p: 16.99 },
      { n: "Build Your Own Sandwich", p: 10.99 },
      { n: "Grilled Chicken Breast", p: 13.99 },
      { n: "Hawaiian Sandwich", p: 14.99 },
      { n: "Italian Sub", p: 13.99 },
      { n: "Meatball Sub", p: 14.99 },
      { n: "PB&J", p: 4.99 }
    ]},
    { group: "Pasta", category: "pasta", sized: false, items: [
      { n: "Bernie Pasta", p: 18.99 },
      { n: "Build Your Own Pasta", p: 12.99 },
      { n: "Spaghetti", p: 14.99 },
      { n: "Spaghetti & Meatballs", p: 16.99 },
      { n: "Spaghetti & Italian Sausage", p: 16.99 },
      { n: "Spaghetti Alfredo", p: 15.99 },
      { n: "Spaghetti Alfredo Chicken Broccoli", p: 18.99 }
    ]},
    { group: "Salads", category: "salad", sized: false, items: [
      { n: "Salad Bar — All You Can Eat", p: 15.99 },
      { n: "Salad Bar — Single Serve", p: 9.99 },
      { n: "Salad — To Go", p: 13.99 }
    ]},
    { group: "Apps & Sides", category: "side", sized: false, items: [
      { n: "Garlic Cheesy Bread", p: 12.99 },
      { n: "Potato Skins", p: 12.99 },
      { n: "Parmesan Garlic Bites", p: 7.99 },
      { n: "Chips", p: 1.49 },
      { n: "Ranch", p: 0.50 },
      { n: "Marinara", p: 0.25 }
    ]},
    { group: "Soups", category: "soup", sized: false, items: [
      { n: "Clam Chowder", p: 7.99 },
      { n: "Smoked Brisket Chili", p: 9.99 }
    ]},
    { group: "Dessert", category: "dessert", sized: false, items: [
      { n: "BIG Cookies", p: 2.50 },
      { n: "Cinnamon Sugar Bites", p: 8.99 }
    ]},
    { group: "Drinks", category: "drink", sized: false, items: [
      { n: "20 oz Fountain Drink", p: 2.75 },
      { n: "16 oz Fountain Drink", p: 2.50 },
      { n: "20 oz Bottled Soda", p: 2.95 },
      { n: "Water", p: 1.50 },
      { n: "Coffee", p: 3.00 },
      { n: "Pure Leaf", p: 2.95 }
    ]}
  ];
  // Real pizza sizes (chips live in index.html): 12"/16"/18"
  // regular crust, GF 10" cauliflower crust. There is no 10"
  // regular pizza in Square — 10" is gluten-free only.
  var SIZES = ['12"', '16"', '18"', 'GF 10"'];

  var state = {
    orders: [],       // active, newest first
    bumped: [],       // bumped stack, most recent last (for recall)
    bumpedTotal: 0,   // bumped this session (shown in the header)
    nextNumber: 215
  };

  var draft = { items: [], size: '16"', type: "takeout" };

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

  /* ---------- stations (two kitchen monitors) ---------- */

  var STATION_KEY = "beacon-kds-station";
  var station = "all"; // "all" | "nopizza"

  // Main monitor shows everything; second monitor shows everything
  // except pizzas. The URL parameter wins on load (?station=all or
  // ?station=nopizza); otherwise the saved choice on this device.
  function resolveStation() {
    var param = null;
    try {
      param = new URLSearchParams(window.location.search).get("station");
    } catch (e) { param = null; }
    if (param === "all" || param === "nopizza") return param;
    try {
      var saved = localStorage.getItem(STATION_KEY);
      if (saved === "all" || saved === "nopizza") return saved;
    } catch (e) { /* no storage — default station */ }
    return "all";
  }

  // Save the choice on this device and keep the URL honest so a
  // copied link opens the same station. (No sync between monitors
  // yet — each screen keeps its own copy; see README.)
  function persistStation() {
    try { localStorage.setItem(STATION_KEY, station); } catch (e) {}
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("station", station);
      history.replaceState(null, "", url.toString());
    } catch (e) { /* file:// or old browser — station still works */ }
  }

  function setStation(next) {
    if (next !== "all" && next !== "nopizza") return;
    station = next;
    persistStation();
    updateStationUI();
    render();
  }

  function updateStationUI() {
    var label = $("station-label");
    if (station === "nopizza") {
      label.textContent = "NO PIZZA — WINGS / SANDWICHES";
      label.classList.add("nopizza");
      document.title = "Beacon Kitchen — No Pizza";
    } else {
      label.textContent = "ALL ORDERS";
      label.classList.remove("nopizza");
      document.title = "Beacon Kitchen — All Orders";
    }
    document.querySelectorAll("[data-station-btn]").forEach(function (btn) {
      btn.classList.toggle("selected", btn.dataset.stationBtn === station);
    });
  }

  // The tickets this station shows. "all" shows every open order;
  // "nopizza" shows only tickets with at least one non-pizza item.
  function visibleOrders() {
    if (station === "all") return state.orders;
    return state.orders.filter(function (o) { return KDS_DATA.stationHasItems(o, station); });
  }

  /* ---------- rendering ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function ticketHTML(order) {
    var status = statusOf(order.placedAt);
    // On the no-pizza station a mixed ticket shows only its
    // non-pizza items (pizza + wings shows just the wings).
    var shown = KDS_DATA.stationItems(order, station);
    var items = shown.map(function (it) {
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
    var visible = visibleOrders();
    $("open-count").textContent = visible.length;
    $("bumped-count").textContent = state.bumpedTotal;
    var recallBtn = $("recall-btn");
    recallBtn.disabled = state.bumped.length === 0;
    recallBtn.textContent = state.bumped.length
      ? "↩ Recall last (" + state.bumped.length + ")"
      : "↩ Recall last";

    if (!visible.length) {
      var sub = station === "nopizza"
        ? "No wings, sandwiches, salads or sides on the board right now."
        : "No open orders. Tap “+ New order” to try one.";
      gridEl.innerHTML =
        '<div class="empty"><div class="big">All caught up ✓</div>' +
        '<div class="sub">' + sub + "</div></div>";
      return;
    }
    gridEl.innerHTML = visible.map(ticketHTML).join("");
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

  function money(n) { return "$" + n.toFixed(2); }

  // The Square price for a menu item: pizzas price by size,
  // everything else has one price. Returns 0 when not found
  // (never blocks adding the item).
  function menuPrice(name, category, size) {
    for (var gi = 0; gi < MENU.length; gi++) {
      var g = MENU[gi];
      if (g.category !== category) continue;
      for (var ii = 0; ii < g.items.length; ii++) {
        if (g.items[ii].n === name) {
          var p = g.items[ii].p;
          return (typeof p === "object") ? (p[size] || 0) : p;
        }
      }
    }
    return 0;
  }

  function renderDraft() {
    var wrap = $("draft-items");
    if (!draft.items.length) {
      wrap.innerHTML = '<div class="draft-empty">Tap items above to add them here.</div>';
    } else {
      var total = 0;
      wrap.innerHTML = draft.items.map(function (it, i) {
        total += it.qty * (it.price || 0);
        var label = (it.size ? it.size + " " : "") + it.name;
        return '<div class="draft-line"><span class="qty">' + it.qty + "×</span>" +
          '<span class="nm">' + esc(label) + "</span>" +
          '<span class="draft-price">' + money(it.qty * (it.price || 0)) + "</span>" +
          '<button class="mini-btn" data-draft-minus="' + i + '" aria-label="Remove one">−</button>' +
          '<button class="mini-btn" data-draft-del="' + i + '" aria-label="Remove item">✕</button></div>';
      }).join("") +
      '<div class="draft-total">Total <b>' + money(total) + "</b></div>";
    }
    $("add-order-btn").disabled = draft.items.length === 0;
  }

  function addDraftItem(name, sized, category) {
    var size = sized ? draft.size : "";
    var price = menuPrice(name, category, size);
    var found = null;
    draft.items.forEach(function (it) {
      if (it.name === name && it.size === size) found = it;
    });
    if (found) { found.qty += 1; } else {
      draft.items.push({ qty: 1, size: size, name: name, category: category, price: price, mods: [] });
    }
    renderDraft();
  }

  function openModal() {
    draft = { items: [], size: '16"', type: "takeout" };
    $("name-input").value = "";
    document.querySelectorAll(".size-chip").forEach(function (chip) {
      chip.classList.toggle("selected", chip.dataset.size === '16"');
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
    if (KDS_DATA.stationHasItems(order, station)) {
      showToast("Order #" + order.number + " added to the board");
    } else {
      showToast("Order #" + order.number + " added — pizza-only, so it won't show on this screen");
    }
  }

  function buildPickButtons() {
    var host = $("pick-groups");
    host.innerHTML = MENU.map(function (g) {
      var btns = g.items.map(function (item) {
        var price = (typeof item.p === "object") ? item.p[draft.size] : item.p;
        var label = esc(item.n) +
          ((price || price === 0) ? ' <span class="pick-price">' + money(price) + "</span>" : "");
        return '<button class="pick-btn" data-item="' + esc(item.n) +
          '" data-sized="' + (g.sized ? "1" : "0") +
          '" data-category="' + esc(g.category) + '">' + label + "</button>";
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

    // Station: URL parameter wins, then the saved choice on this device.
    station = resolveStation();
    persistStation();
    updateStationUI();

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

    document.querySelectorAll("[data-station-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () { setStation(btn.dataset.stationBtn); });
    });

    document.querySelectorAll(".size-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        draft.size = chip.dataset.size;
        document.querySelectorAll(".size-chip").forEach(function (c) {
          c.classList.toggle("selected", c === chip);
        });
        // Pizza prices on the pick buttons follow the size.
        buildPickButtons();
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
      if (btn) addDraftItem(btn.dataset.item, btn.dataset.sized === "1", btn.dataset.category);
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
