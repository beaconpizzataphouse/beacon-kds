/* ================================================================
   BEACON KDS — ORDER DATA SOURCE
   ----------------------------------------------------------------
   THIS IS THE ONE FILE that talks to the outside world.

   Right now it returns built-in DEMO orders so the kitchen
   display can be tried out with no setup and no accounts.

   TO WIRE UP SQUARE LATER: replace the body of fetchOrders()
   below with a call to Square's Orders API (list the open
   orders for the Beacon location, then map each Square order
   into the shape below). Nothing else in the app needs to
   change — app.js only ever calls KDS_DATA.fetchOrders() and
   works with orders shaped like this:

     {
       id: "ord-214",            // unique id (Square order id later)
       number: 214,              // order number shown on the ticket
       name: "Mike R.",          // customer name, or "Table 4"
       type: "takeout",          // "takeout" | "dine-in"
       placedAt: 1732312345678,  // epoch ms the order was placed
       items: [
         { qty: 1, size: "L", name: "Pepperoni Pizza",
           category: "pizza", mods: ["Extra cheese", "Well done"] },
         { qty: 1, size: "",  name: "Boneless Wings 12 — BBQ",
           category: "wings", mods: [] }
       ]
     }

   CATEGORIES — every item carries one of:
     "pizza" | "wings" | "sandwich" | "salad" | "side" | "drink"
   The category drives the two kitchen stations: the main monitor
   shows everything, the second monitor shows everything EXCEPT
   pizzas. When Square is wired in, map each Square line item to
   a category here. An item with no category (or an unknown one)
   is treated as NOT a pizza, so it shows on both screens —
   nothing is ever hidden by a missing category.

   No Square credentials exist yet — do NOT attempt a live
   Square connection from this file until the owner authorizes
   a Square developer app (OAuth) for Beacon.
   ================================================================ */

window.KDS_DATA = (function () {
  "use strict";

  var MIN = 60 * 1000;

  /* Demo orders. placedAt is relative to page load so the demo
     always shows a realistic mix: fresh, getting old, and late. */
  function buildDemoOrders() {
    var now = Date.now();
    return [
      {
        id: "ord-214", number: 214, name: "Mike R.", type: "takeout",
        placedAt: now - 2 * MIN,
        items: [
          { qty: 1, size: "L", name: "Pepperoni Pizza", category: "pizza", mods: [] },
          { qty: 1, size: "", name: "Boneless Wings 12 — BBQ", category: "wings", mods: ["Extra ranch"] }
        ]
      },
      {
        id: "ord-213", number: 213, name: "Table 4", type: "dine-in",
        placedAt: now - 6 * MIN,
        items: [
          { qty: 1, size: "M", name: "Supreme Pizza", category: "pizza", mods: [] },
          { qty: 1, size: "", name: "House Salad", category: "salad", mods: ["Ranch on side"] }
        ]
      },
      {
        id: "ord-212", number: 212, name: "Sarah K.", type: "takeout",
        placedAt: now - 11 * MIN,
        items: [
          { qty: 1, size: "XL", name: "Meat Lovers Pizza", category: "pizza", mods: ["Well done"] },
          { qty: 1, size: "", name: "Breadsticks", category: "side", mods: [] }
        ]
      },
      {
        id: "ord-211", number: 211, name: "Table 7", type: "dine-in",
        placedAt: now - 14 * MIN,
        items: [
          { qty: 1, size: "M", name: "Hawaiian Pizza", category: "pizza", mods: [] },
          { qty: 1, size: "M", name: "Veggie Pizza", category: "pizza", mods: ["No onions"] },
          { qty: 1, size: "", name: "Caesar Salad", category: "salad", mods: [] }
        ]
      },
      {
        id: "ord-210", number: 210, name: "Dave P.", type: "takeout",
        placedAt: now - 19 * MIN,
        items: [
          { qty: 1, size: "L", name: "BBQ Chicken Pizza", category: "pizza", mods: [] },
          { qty: 1, size: "", name: "Bone-In Wings 6 — Buffalo", category: "wings", mods: ["Extra hot"] }
        ]
      },
      {
        id: "ord-209", number: 209, name: "Table 2", type: "dine-in",
        placedAt: now - 26 * MIN,
        items: [
          { qty: 1, size: "M", name: "Margherita Pizza", category: "pizza", mods: ["Extra cheese"] },
          { qty: 1, size: "", name: "Mozzarella Sticks", category: "side", mods: [] }
        ]
      }
    ];
  }

  /* ---------- stations (two kitchen monitors) ---------- */

  // Only an explicit "pizza" category hides an item from the
  // no-pizza screen. Missing/unknown category -> shows everywhere.
  function isPizzaItem(item) {
    return !!(item && item.category === "pizza");
  }

  // The items of one order that belong on a station's screen.
  // "all" shows everything; "nopizza" shows only non-pizza items,
  // so a pizza + wings ticket shows just the wings there.
  function stationItems(order, station) {
    if (!order || !Array.isArray(order.items)) return [];
    if (station !== "nopizza") return order.items;
    return order.items.filter(function (it) { return !isPizzaItem(it); });
  }

  // Whether a ticket has anything to show on a station at all.
  // A pizza-only ticket has nothing on the no-pizza screen.
  function stationHasItems(order, station) {
    return stationItems(order, station).length > 0;
  }

  /* The app's only entry point for order data. Returns a Promise
     that resolves to an array of orders (newest first). Later
     this will await the Square Orders API instead. */
  function fetchOrders() {
    return Promise.resolve(buildDemoOrders());
  }

  return {
    fetchOrders: fetchOrders,
    buildDemoOrders: buildDemoOrders,
    isPizzaItem: isPizzaItem,
    stationItems: stationItems,
    stationHasItems: stationHasItems
  };
})();
