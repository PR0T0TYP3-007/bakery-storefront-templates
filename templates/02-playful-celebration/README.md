# Template 02 — The Playful Celebration

**Many Happy Returns**, Margate. Celebration cakes, built by the customer.

A static storefront: plain HTML, CSS and native ES modules. No framework, no build
step, no backend. Open the files and they run.

The full concept, the research behind it and the art-direction reasoning are in
[`docs/02-playful-celebration.md`](../../docs/02-playful-celebration.md).

---

## The thing worth looking at

`build.html`. The cake is drawn live and redraws on every choice — tiers, sponge,
filling, colour, finish, topper — and the inscription appears on it as you type.
11,250 distinct drawings, pure SVG, no dependencies.

Research found no bakery storefront in the category with a live visual preview. The
real "build your own cake" pages are dropdown forms that show the customer nothing
until collection day.

---

## Running it

From the repository root:

```bash
python devserver.py 4330 .
```

Then open `http://localhost:4330/templates/02-playful-celebration/index.html`.

Any static server works, but `devserver.py` sends `Cache-Control: no-store`. This
project needed that after browser caching repeatedly served modules that no longer
existed on disk.

## Tests

```bash
npm test
```

19 tests under Node's built-in runner. No framework, no transpiler, nothing installed.
They cover the renderer's determinism, id uniqueness across cakes in one document,
escaping of the inscription, contrast flipping against the icing, and the mapping from
catalogue options to drawing modes.

---

## Layout

```
02-playful-celebration/
├── index.html            home
├── build.html            the builder, and the product page for every cake
├── shop.html             everything, filtered by occasion, kind and words
├── cart.html             the basket
├── checkout.html         collect or deliver, you, the gift branch, payment
├── confirmation.html     the receipt, printable
├── styleguide.html       every component against awkward content
├── 404.html
├── css/
│   ├── tokens.css        the only file holding a raw value
│   ├── base.css  layout.css
│   ├── components/       chrome, controls, card, cake, overlay
│   └── pages/checkout.css
├── js/
│   ├── services/
│   │   ├── api.js        the one module that touches data — the swap seam
│   │   └── session.js    four lines; the logic is in shared/session.js
│   ├── components/       cake, cards, chrome, datepicker, toast, icons
│   └── pages/            one entry module per page
├── data/                 merchant and catalogue JSON
├── assets/fonts/         Fredoka and Nunito, latin subsets, 69KB total
└── tests/cake.test.js
```

The commerce rules are not in here. They live in [`shared/core/`](../../shared/core/)
— pure and DOM-free — and the stateful layer in
[`shared/session.js`](../../shared/session.js), both shared with Template 05. See
decision D9.

---

## Swapping in a real backend

Everything that touches data is in `js/services/api.js`. Every function there is
already `async` and returns plain JSON. Replacing each body with a `fetch()` is the
whole job; no UI module changes. Request and response shapes are documented on each
function and in [`docs/api-contract.md`](../../docs/api-contract.md).

Three things must move server-side in production, because a client cannot be trusted
with them: availability, daily capacity, and order placement.

## Adding a second shop

1. Add `data/merchant.<id>.json` and `data/products.<id>.json`.
2. Add the id to `MERCHANTS` in `js/services/api.js`.
3. Visit any page with `?merchant=<id>`.

The query is carried across every link, and `localStorage` is namespaced per merchant,
so two shops never share a basket.

## Payment

Simulated, and labelled as such on the page. No money moves and nothing leaves the
browser.

| Card | What happens |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined by the bank |
| `4000 0000 0000 0119` | Processor unreachable |

A failure keeps every field and the whole basket. See decision D6.

---

## Known gaps

- One merchant config, not two. The seam supports more; the brief does not require it.
- No analytics instrumentation. Unmet across the whole project, not just here.
- No axe or Lighthouse run, and no screen-reader testing. Contrast, target sizes and
  horizontal overflow were measured during the build; everything else is built to
  WCAG 2.2 AA but not independently audited.
