# Beacon Kitchen Display (KDS) — prototype

First piece of a homegrown POS for Beacon Pizza & Tap House, to replace
Square's KDS (Beacon pays ~$230/mo total for Square POS + handsets +
kitchen displays). Public, no login, no build step, no dependencies.
Designed for the Android tablets and the two kitchen monitors.

## Files

- `index.html` — page shell, header, ticket grid, add-order form
- `style.css` — dark kitchen theme, huge type
- `orders.js` — **the one and only data source** (demo orders now;
  this is where Square's Orders API gets wired in later — see the
  comment block at the top of the file)
- `app.js` — rendering, timers, bump/recall, add-order form

## How to open it

No server needed — just open `index.html` in Chrome on any tablet,
phone, or computer:

- On this machine: `open ~/workspace/beacon-kds/index.html`
  (or double-click the file in a file manager)
- Or serve it: `cd ~/workspace/beacon-kds && python3 -m http.server 8000`
  then visit http://localhost:8000

## Two stations (two kitchen monitors)

- **Main monitor — everything:** `index.html` or `?station=all`
  (the default). Shows every open ticket, all items.
- **Second monitor — no pizza:** `?station=nopizza`. Shows only
  tickets with at least one non-pizza item, and on those tickets
  shows ONLY the non-pizza items — so a pizza + wings ticket
  appears there showing just the wings. A pizza-only ticket
  doesn't appear on that screen at all.
- The header says which station the screen is at a glance:
  **ALL ORDERS** (red pill) vs **NO PIZZA — WINGS / SANDWICHES**
  (light pill). The page title says it too.
- The **ALL ORDERS / NO PIZZA** buttons in the header switch a
  monitor without retyping the URL. The choice is saved on that
  device (localStorage), so a refresh keeps it. The URL parameter
  wins on load if one is present.
- Every item carries a `category` (`pizza`, `wings`, `sandwich`,
  `pasta`, `salad`, `side`, `soup`, `dessert`, `drink`) — that is
  what the filter uses, not the item name. An item with no
  category shows on both screens.

## Menu source (real data)

The demo orders and the quick-pick form use the REAL Beacon menu
from the Square catalog export `square-catalog-2026-11-21.csv`
(351 active items), with real Square prices. Pizzas come in
12"/16"/18" plus GF 10" cauliflower crust — there is no 10"
regular pizza in Square. The 14 specialty pizzas are Mexican,
BBQ Chicken, Beacon Supreme, Bernie, Build Your Own, Classic
Pepperoni, Hawaiian, Jibe, Mediterranean, Spicy Luau, Tree
Hugger, Ultimate Cheese, Buffalo Chicken, and Chicken Bacon
Ranch. Sandwiches, wings (Bone-in + Boneless 5/10/15), pastas,
the salad bar, apps/sides, soups, desserts and drinks are all
from the same export.

Known gaps in the export (need the Square API / OAuth later):
wing flavor choices and extra-topping options are named only as
modifier sets — the actual options and their prices aren't in
the CSV, so demo mods like "BBQ" or "Extra cheese" are
placeholders. Square also holds each gluten-free pizza twice
(a "Regular" row and a "Gluten Free" row, $1 apart); the demo
uses the "Gluten Free" row's price. Salad names in Square are
just "All you can eat" / "Single Serve" / "To Go Salad" (it's a
salad bar); the demo labels them "Salad Bar — …" so a ticket
reads clearly.

## What it does

- **Tickets in a grid, newest first.** Each ticket shows the order
  number, customer name (or table), DINE-IN / TAKEOUT, items with
  sizes and modifiers, and time on the board.
- **Color-coded by age:** green under 10 min, amber 10–15 min,
  red over 15 min. The timer and the ticket border both change.
- **Tap a ticket to bump it** (mark done, remove from the grid).
- **Recall:** the header's "Recall last" button puts the most
  recently bumped ticket back on the board (works repeatedly —
  it keeps a stack). "BUMPED" in the header counts tickets
  bumped this session.
- **Demo mode:** loads with 6 realistic sample orders at staggered
  ages so all three colors show. "Reset demo" restores them.
- **Add test order:** "+ New order" opens a quick-pick form — pick
  a pizza size (12"/16"/18"/GF 10"), tap items (pizzas, wings,
  sandwiches, pastas, salads, apps & sides, soups, dessert,
  drinks, all with real Square prices), type a name or table,
  choose dine-in/takeout, add it to the board. The draft shows a
  running total. Kitchen tickets themselves don't show prices.
- State (open orders, bumped count) survives a page refresh via
  localStorage. A saved demo older than 3 hours is treated as
  stale and reseeded on the next load.

## What it does NOT do yet (by design)

- No Square connection — no credentials exist yet. When the owner
  authorizes a Square developer app, only `orders.js` changes.
- No ticket printer, no sounds, no multi-screen sync. Each screen
  runs its own copy for now: **bumping a ticket on one monitor
  does NOT remove it from the other** — state lives in each
  device's localStorage, so the two monitors don't talk to each
  other yet. Live sync comes later with the Square integration.

## Questions for Vince (things that would change the design)

1. **How are the two back monitors split? — ANSWERED Nov 21.**
   Main monitor shows EVERYTHING (so nothing gets missed);
   second monitor shows everything EXCEPT pizzas (wings,
   sandwiches, salads, sides). Built as the two stations above.
2. **Ticket printer too?** Does the kitchen also print paper
   tickets today, or is the screen the only ticket?
3. **Order numbers:** do Square order numbers reset daily, and
   should the board show the Square number, the customer name,
   or both?
4. **Dine-in:** table numbers, customer names, or server names on
   tickets? (Demo uses "Table 4" style names.)
5. **Menu check — ANSWERED Nov 21 from the Square export.**
   Sizes are 12"/16"/18" + GF 10" cauliflower crust (no 10"
   regular); 14 specialty pizzas (the 12 expected plus Buffalo
   Chicken and Chicken Bacon Ranch). Demo data now uses the real
   menu. Still open: wing flavors and extra-topping options
   aren't in the export — those need the Square API.
6. **Bump behavior:** is one tap to bump right, or should bumping
   need a confirm (to avoid pocket-bumps)? And who bumps — the
   cook, the expo, or whoever's free?
7. **Sounds:** should a new order beep or flash, or is silent fine?
