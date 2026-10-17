# Cake Themes — Storefront Templates

Static storefront templates for independent cake and bakery brands, built against the
*Cake Themes Templates* brief. Two of the five are done.

Plain HTML, CSS and JavaScript. No build step, no framework, no dependencies.

---

## Running it

The pages need to be served over HTTP, not opened from the file system — browsers
block `localStorage` on `file://` origins, so the basket would not survive navigation.

```bash
python devserver.py 4321
```

Then open <http://localhost:4321> for the template chooser. `devserver.py` is
`http.server` plus `Cache-Control: no-store` — without it the browser serves edited CSS
and ES modules from its heuristic cache, which costs more debugging time than it saves.
A `.claude/launch.json` is included so the preview pane can start it by name
(`bakery-templates`).

---

## Hosting

Everything here is static — no build step, no server, no environment variables. Any
static host works.

**Deploy the whole repository, not one template folder.** Template 01 loads its
photography and commerce layer from `shared/` via `../../shared/`, so it cannot be
uploaded on its own. The repo is ~11MB tracked (the walkthrough video is gitignored).

Once deployed, the URLs are:

| | |
|---|---|
| Template chooser | `/` |
| **Template 01 — Editorial Atelier** | `/templates/01-editorial-atelier/` |
| Template 05 — The Counter | `/templates/05-neighbourhood/` |
| Template 05, second merchant | `/templates/05-neighbourhood/?merchant=corner-crumb` |

All internal paths are relative, so the site works unchanged at a domain root or under a
sub-path like `user.github.io/repo-name/`.

### GitHub Pages

```bash
gh repo create bakery-storefront-templates --private --source=. --remote=origin --push
```

Then in the repository: **Settings → Pages → Source: Deploy from a branch → `main` / `/`
(root)**. The site appears at `https://<user>.github.io/bakery-storefront-templates/`
within a minute or two.

**`.nojekyll` must stay at the repository root.** GitHub Pages runs Jekyll by default, and
Jekyll silently skips every path beginning with an underscore. Without that file,
`templates/05-neighbourhood/js/pages/_page.js` is never published and every Template 05
page breaks with a module error. It is committed — just do not delete it.

Private repositories need a paid GitHub plan to publish Pages. If the account is on the
free plan, create the repo `--public` instead, or use Netlify below.

### Netlify or Vercel

Connect the repository and leave the build settings empty:

- **Build command:** *(blank)*
- **Publish directory:** `.`

Or, with no git at all, drag the project folder onto <https://app.netlify.com/drop>.

### Pointing a domain straight at Template 01

If the live site should open on Template 01 rather than the chooser, the cleanest option
is a host-level redirect rather than moving files, so nothing else breaks.

Netlify — create `_redirects` at the repository root:

```
/   /templates/01-editorial-atelier/   302
```

Vercel — create `vercel.json`:

```json
{ "redirects": [{ "source": "/", "destination": "/templates/01-editorial-atelier/" }] }
```

GitHub Pages has no redirect support, so there the chooser stays at `/` and Template 01
is linked from it. For a client demo the chooser is arguably the better landing page
anyway — it shows the range.

### Before anyone outside the team sees it

- The photography is Unsplash stock standing in for merchant photography.
- Both bakeries, their staff, press quotes and copy are invented.
- Payment is simulated; no provider is connected and no money can move.
- Add `<meta name="robots" content="noindex">` to the template pages, or password-protect
  the deploy, if it should not be indexed while it is a demo.

---

## Structure

```
index.html                     Template chooser

shared/
  js/store.js                  Dates, lead times, capacity, pricing, cart. No markup.
  js/commerce-ui.js            Date picker, modal, toasts, cart badge, countdown, reveal.
  img/                         Photography, three widths each (-sm 240, -md 800, -lg 1600)

templates/
  01-editorial-atelier/        Crumb Atelier — premium, art-directed, made-to-order
  05-neighbourhood/            Hazel & Rye — "The Counter", everyday shop

_archive/05-neighbourhood-v1/  The first attempt at 05, kept for reference
docs/                          Brief, concept, decisions, API contract
devserver.py                   Static server with caching turned off
```

**The split is the point.** The brief asks for *creative diversity at the presentation
layer, consistency and reliability at the commerce layer.* In both templates the commerce
logic holds no markup and the brand data holds no logic, so the same rules — dates,
product-specific lead times, capacity, pricing, cart — run underneath two designs that
share not one line of styling.

**Two architectures, stated plainly.** Template 01 uses global scripts in `shared/js/`.
Template 05 was rebuilt on native ES modules with a pure, DOM-free
`templates/05-neighbourhood/js/core/` and a single swappable `api.js` seam. The second is
the better version and Template 01 should migrate to it; until it does, the commerce rules
are encoded twice. That is real duplication and it should not survive into template 02 —
see [docs/decisions.md](docs/decisions.md) D3.

---

## Template 01 — The Editorial Atelier

**Crumb Atelier**, Brooklyn. A cake studio presented as a catalogue raisonné: every
cake is a numbered plate with a maker, a year and a provenance.

| | |
|---|---|
| Display | Instrument Serif, set oversized on full-bleed photography |
| Interface | Inter · metadata in IBM Plex Mono |
| Surface | `#F5F1EA` warm off-white with a fixed SVG grain layer |
| Accent | `#8A3E2C` burnt sienna — price changes, warnings, the inscription preview |

Pages: `index` · `collection` · `product` · `cart` · `checkout`

Made-to-order only. Multi-day lead times (1–7 days), full configuration on every cake,
gifting with recipient details, delivery zones, NYC sales tax.

## Template 05 — The Counter

**Hazel & Rye**, London. The Modern Neighbourhood Bakery: a shop you use weekly, built as
a board you read and a ticket that builds.

| | |
|---|---|
| Display | Fraunces (variable, `SOFT 40 / WONK 1`) |
| Interface | Public Sans — both self-hosted, 148KB, no third-party connection |
| Surface | `#FBF6EC` warm oat; rules and ground shifts, not shadows |
| Accent | `#1B5E41` green available · honey low · clay sold out |

Pages: `index` · `shop` · `product` · `cart` · `checkout` · `confirmation` · `visit` ·
`faq` · `404` · `styleguide`

Rewritten from the ground up after the first attempt read as a generic card grid. Ruled
rows for everyday stock and photo tiles only for made-to-order cakes; a persistent order
ticket; honest stock (live counts today, batch sizes for future days); ES modules with a
pure, DOM-free `js/core/` and a single swappable `api.js` seam; two merchant configs
switched with `?merchant=corner-crumb`; 37 unit tests; simulated payment with working
decline and recovery.

Its own [README](templates/05-neighbourhood/README.md) has the detail, and
[docs/02-concept.md](docs/02-concept.md) has the reasoning — including a frank account of
what was wrong with v1.

---|---|
| Display | Bricolage Grotesque |
| Interface | Plus Jakarta Sans — no monospace, that is Template 01's signature |
| Surface | `#FDF8F0` warm oat, white cards, 14–20px radii, soft shadows |
| Accent | `#1F6B4A` green for fresh/available, honey for low, tomato for sold out |

Pages: `index` · `shop` · `product` · `cart` · `checkout`

Larger base type, 48px minimum hit targets, nothing hover-dependent. Mostly same-day
stock with an 11am cutoff, one-tap adding, collection time slots with capacity,
"your usual" re-ordering, **gifting switched off**, and **no sales tax** — both of
which exercise paths Template 01 never touches.

---

## What the research changed

Decisions common to both templates that came out of the research pass rather than taste:

**Date first, not at checkout.** Lead times are product-specific, and the date
constrains what is purchasable at all. A persistent control sits in the header and the
catalogue re-evaluates against it, rather than letting someone fall in love with a
sculpted cake and discovering at checkout that it needs ten days.

**Lead time is a property of the configuration.** Hand-piped florals add two days; a
two-tier size adds four. The earliest selectable date moves the moment an option
changes, and a chosen date that becomes impossible is moved forward rather than failing
later.

**Availability lives inside the calendar.** Baymard's finding is that when a picker does
not communicate availability, shoppers leave the flow to verify it. Every blocked day
states its reason on the cell; booked-out days are struck through, not merely greyed.

**The cutoff is a countdown, not a time.** Past it, it rolls to tomorrow's rather than
disappearing.

**Two buy paths.** Template 01 pairs *Quick add* with full configuration. Template 05
splits it by product kind: a loaf is one tap, a cake gets a sheet.

**Nothing unavailable is hidden,** in either template — it is shown with the first date
it could be ready, or the day it comes back.

**The interface only claims what the shop can know.** Template 05's board shows a live
falling count for *today* and batch sizes for any day still to come, because "15 left
next Tuesday" is invented precision and the board stops being worth reading the moment
a customer catches it out.

---

## Merchant configuration

Everything a shop can switch off lives in `MERCHANT.capabilities` in its `catalogue.js`:

```js
delivery, pickup, inscriptions, gifting, giftPackaging, scheduledDelivery, guestCheckout
```

Turning off `delivery` removes the method and its totals row. Turning off `gifting`
removes the section entirely — Bluebird does this. A product's `options` array decides
which configuration groups it shows, so a shop selling fixed items ships none. Lead
times, cutoff hour, closed weekdays, delivery zones, pickup windows and tax rate live
in the same object. A zero tax rate removes the row rather than printing `$0.00`.

Basket storage is namespaced per merchant, so two templates served from one origin
never share a basket.

---

## What is real and what is stubbed

**Real:** the full purchase journey in both templates. Option selection, live pricing,
product-specific lead times, capacity-aware calendar, inscription previews, add-ons,
quantity, basket persistence, order-level ready-by resolution, fulfilment method and
zone pricing, collection slots with capacity, tax, free-delivery thresholds, form
validation and confirmation.

**Stubbed:**

- **Payment** — fields are disabled and inert. Nothing is sent anywhere.
- **Photography** — Unsplash stock in `shared/img/`. Replace with merchant photography;
  `img()` in `store.js` is the only place that builds a path.
- **Capacity and stock** — generated deterministically from product and date so nothing
  reshuffles on reload. Replace `capacityFor()` and `shelf()` with the real production
  schedule.
- **"Your usual"** — a fixed example in `catalogue.js`; a real shop reads order history.
- **Content** — both bakeries, their staff, the press quotes and the journal are invented.

---

## Known gaps

- **Neither template has been tested against bad merchant photography.** The brief is
  explicit that concepts which only work with perfect demonstration content are not
  acceptable, and Template 01 is the most exposed. Both need a deliberately hostile
  fixture set: phone photos, wrong aspect ratios, a 3-item and a 200-item catalogue,
  60-character product names, and a merchant with no delivery and no customization.
- **No accessibility audit has been run.** Focus states, reduced-motion, landmarks,
  labelled calendar cells and skip links are in place; that is not the same as tested.
  Template 05 was designed to AA contrast but has not been measured.
- **No performance budget has been measured.**
- **Headers and footers are injected by JavaScript** rather than duplicated across five
  files per template. In production these become template partials; the markup is
  unchanged.
- **`walkthrough.mp4`** is a 2:45 screen recording of Template 01 made before the
  restructure, so its URLs show the old flat paths. Worth gitignoring either way.
