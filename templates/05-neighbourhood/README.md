# Template 05 — The Modern Neighbourhood Bakery

The brief's fifth direction. Our concept for it is **The Counter**: a static storefront
built as a board you read and a ticket that builds.

Plain HTML, CSS and ES modules. No framework, no build step, no backend.

---

## Run it

The pages need HTTP, not `file://` — ES modules and `fetch` of local JSON will not load
from the file system, and `localStorage` is blocked on file origins.

```bash
python devserver.py 4321
```

from the **project root**, then open
<http://localhost:4321/templates/05-neighbourhood/>.

`devserver.py` is `http.server` plus `Cache-Control: no-store`. That matters: without it
the browser serves edited CSS and modules from its heuristic cache and you end up
debugging a page that no longer exists on disk.

Any static host works too — Netlify, Vercel static, GitHub Pages, S3 — or `npx serve .`.

### Tests

```bash
cd templates/05-neighbourhood && npm test
```

37 unit tests over `js/core/`: pricing and float safety, lead times, option
incompatibility, inscription validation, allergen merging, cutoffs and DST, capacity,
delivery zones, and cart behaviour. No install step — Node's built-in runner. The
`package.json` exists only so Node treats the core as ES modules; nothing is installed and
nothing ships.

### Switching merchant

Append `?merchant=corner-crumb` to any page.

| | Hazel & Rye (default) | Corner Crumb |
|---|---|---|
| Region | UK, GBP, `en-GB` | US, USD, `en-US` |
| Fulfilment | Collection + bike delivery by postcode | **Collection only**, 2 shops |
| Made-to-order cakes | Yes | **No** |
| Gifting / inscriptions | Yes | **No** |
| Catalogue | 12 items, 4 categories | 7 items, 3 categories |
| Tax | Zero-rated (VAT note) | No sales tax (Oregon) |
| Accent | Green | Teal |

The second config is not decoration: it exercises the paths the first one never touches —
capability flags removing whole sections, a thin catalogue, multiple locations, and a
different currency and locale.

---

## Structure

```
index.html        The board + the ticket
shop.html         Full board, category filter, forgiving search
product.html      Options, incompatibility rules, inscription, allergens
cart.html         The ticket full size, with stale-price detection
checkout.html     Fulfilment → details → payment, simulated
confirmation.html The receipt
visit.html  faq.html  404.html  styleguide.html

css/
  tokens.css              Every colour, type step, space, radius, duration
  base.css layout.css
  components/*.css        controls, board, ticket, chrome, overlay
  pages/*.css             product, checkout

js/
  core/                   PURE, DOM-free — dates, format, rules, fulfilment,
                          pricing, cart, storage
  services/api.js         The only module that touches data
  services/session.js     The only stateful module
  components/             board, ticket, datepicker, chrome, toast, icons
  pages/                  one entry module per page

data/
  merchant.*.json         What this bakery offers
  products.*.json         Catalogue, option groups, add-ons

assets/fonts/             Fraunces + Public Sans, variable WOFF2, latin subset
tests/core.test.js
```

`js/core/` imports nothing from `components/`, `pages/` or the DOM. That is what makes it
reusable by templates 01–04 and testable in Node.

---

## The concept

**The Counter.** The site behaves like the best thirty seconds at a good local bakery: you
walk up, read what is there today, someone helps you choose, and you leave holding a clear
ticket.

- **The Board** — ruled, dense, scannable rows. The primary language, used on the
  homepage, the shop, the basket and the checkout review.
- **The Ticket** — a persistent order summary that builds as you choose. Sticky rail on
  desktop, a bar that opens a `<dialog>` sheet on mobile.

Full reasoning, including what was wrong with the previous version, is in
[`docs/02-concept.md`](../../docs/02-concept.md).

### Photography is earned, not automatic

| Product | Treatment | Why |
|---|---|---|
| Everyday (bread, pastry, cookies) | Ruled row, 64px thumb | You buy these from memory. Density beats decoration. |
| Made-to-order cakes | Large photo tile | You buy these with your eyes. |

A uniform card grid for both was the single biggest reason the previous version read as
machine-generated, and it was also poor merchandising.

### Design rules, enforced

1. **Rules, not shadows.** Separation is 1px lines and ground-tone shifts. Shadow is
   reserved for three genuinely floating things: the mobile sheet, the dialog, the toast.
2. **Two radii.** `4px` for rectangles, `999px` for filter chips and the basket badge.
3. **Asymmetric layout** — `1.55fr / 0.75fr`, and sections alternate width.
4. **No decorative chips.** If a fact matters it goes in a row or a sentence.
5. **Motion under 250ms**, CSS-first, never between a tap and its result.

### Type and colour

Display is **Fraunces** (variable, `SOFT 40 / WONK 1`), interface is **Public Sans** —
both self-hosted, 148KB total, no third-party connection. Body never below 16px, numerals
tabular throughout.

Warm oat ground, near-black warm ink, and three status hues: green available, honey low,
clay sold out. Status is never carried by colour alone — every state has a word beside it,
and the sold-out marker is a square where the others are circles.

---

## Honest availability

The board shows a **live falling count for today** and **batch sizes for any day still to
come**, with the heading and footnote changing to match.

A shop cannot know how many baguettes will be left next Tuesday. Printing "15 left" for a
future date is invented precision, and the board stops being worth reading the moment a
customer notices. This is `shelf()` in `js/core/fulfilment.js`.

---

## Rebranding

1. Edit `css/tokens.css` — colours, type, spacing, radii, motion.
2. Edit `data/merchant.*.json` — name, region, hours, capabilities, lead times, cutoff,
   zones, `voice` (the masthead copy).
3. Edit `data/products.*.json` — catalogue, option groups, add-ons.
4. Swap the wordmark in `js/components/icons.js`.

No component CSS or page module should need touching. The two shipped configs are the
proof.

---

## What is real and what is simulated

**Real:** option selection with incompatibility rules, live pricing with an itemised
breakdown, product-specific lead times that move the calendar, capacity-aware date
picking, collection slots, inscription validation, allergen merging, basket persistence
with an in-memory fallback, stale-price detection, delivery-zone lookup, form validation
with an error summary, and the full keyboard path.

**Simulated:**

- **Payment.** `placeOrder()` resolves after a real pause. `4000 0000 0000 0002` declines,
  `4000 0000 0000 0119` fails as unreachable; everything else succeeds. The basket is kept
  on failure and the page says so.
- **Stock, capacity and slots.** Deterministic hashes of the date, so nothing reshuffles
  on reload. Replace `capacityFor()`, `shelf()` and `slotsFor()` with the production
  schedule — and move them server-side; see [`docs/api-contract.md`](../../docs/api-contract.md).
- **"Your usual."** Read from this device's last order, not a customer profile.
- **Photography.** Unsplash stock in `../../shared/img/`.
- **Content.** Both bakeries, their staff and their copy are invented.

---

## Known gaps

- **No Lighthouse or axe run has been performed.** The template was built to the targets —
  self-hosted fonts, no render-blocking third parties, reserved image dimensions, skeletons
  that prevent layout shift, 44px targets, visible focus, semantic landmarks, labelled
  fields, `prefers-reduced-motion` — but **no numbers have been measured, so none are
  claimed.**
- **No Playwright end-to-end tests.** The journeys were verified manually in the browser,
  including the decline-and-retry path, not by an automated suite.
- **No real usability testing**, as none is possible here. The commercial reasoning in
  `docs/02-concept.md` §5 is written as hypotheses with a test plan, not as claims.
- **Header and footer are injected by JavaScript.** SEO-critical content and the page's own
  copy are in the HTML, but the chrome is not. In production these become partials.
- **Template 01 still uses the older global-script `shared/js/`,** so the commerce rules are
  encoded twice until it migrates to this `js/core/`. See `docs/decisions.md` D3.
