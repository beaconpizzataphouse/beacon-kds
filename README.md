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
  a pizza size, tap items (pizzas, wings, salads/sides), type a
  name or table, choose dine-in/takeout, add it to the board.
- State (open orders, bumped count) survives a page refresh via
  localStorage. A saved demo older than 3 hours is treated as
  stale and reseeded on the next load.

## What it does NOT do yet (by design)

- No Square connection — no credentials exist yet. When the owner
  authorizes a Square developer app, only `orders.js` changes.
- No ticket printer, no sounds, no multi-screen sync. Each screen
  runs its own copy for now.

## Questions for Vince (things that would change the design)

1. **How are the two back monitors split?** Same orders on both,
   or one screen for pizzas and one for everything else (wings,
   salads, apps)? If split, what goes where?
2. **Ticket printer too?** Does the kitchen also print paper
   tickets today, or is the screen the only ticket?
3. **Order numbers:** do Square order numbers reset daily, and
   should the board show the Square number, the customer name,
   or both?
4. **Dine-in:** table numbers, customer names, or server names on
   tickets? (Demo uses "Table 4" style names.)
5. **Menu check:** are the demo sizes (S/M/L/XL) and the specialty
   pizzas right? Anything missing that the kitchen makes a lot?
6. **Bump behavior:** is one tap to bump right, or should bumping
   need a confirm (to avoid pocket-bumps)? And who bumps — the
   cook, the expo, or whoever's free?
7. **Sounds:** should a new order beep or flash, or is silent fine?
