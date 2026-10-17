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

**Live: <https://pr0t0typ3-007.github.io/bakery-storefront-templates/>**

The deployed site is a **Listed Templates** page with an entry for each template —
a screenshot, the template name and the company it is built for — linking through to
the working storefront.

| | | |
|---|---|---|
| Template 01 | The Editorial Atelier | Crumb Atelier, Brooklyn |
| Template 02 | The Playful Celebration | Many Happy Returns, Margate |
| Template 05 | The Modern Neighbourhood Bakery | Hazel & Rye, London |

### How it deploys

Push to `main`. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs
`build.mjs` and publishes the result. No install step: it uses only the Node standard
library.

`build.mjs` assembles `dist/`, leaving development files behind, and has two modes:

```bash
node build.mjs                                  # listing page + every template
node build.mjs --template 01-editorial-atelier  # one template, flattened to the root
node build.mjs --base /repo-name/               # for a project Pages sub-path
```

The workflow passes `--base` from `GITHUB_REPOSITORY`. It also fails the build if a
template is missing, a preview is missing, `_page.js` did not ship, or a `package.json`
or `tests` directory leaked into the public output.

Preview screenshots live in `assets/previews/`. Regenerate them after a visual change —
they are real captures, so a stale one misrepresents the template.

### Three things a project Pages site needs

Worth knowing before changing any of this, because each fails quietly:

1. **It is served from `/<repo>/`, not a domain root.** Any `href="/"` navigates off the
   site entirely. The workflow fails the build if one reappears.
2. **Pages cannot send response headers.** `X-Robots-Tag` in `_headers` does nothing
   there, so `noindex` is injected into every page's markup instead.
3. **Jekyll silently drops paths starting with an underscore.** `.nojekyll` prevents it.

`_headers` and `_redirects` are kept in the repo. They are inert on GitHub Pages and
correct again if this moves to Cloudflare or Netlify —
[docs/deploy-cloudflare.md](docs/deploy-cloudflare.md) has those steps, and
`functions/_middleware.js` is a Cloudflare Pages password gate that is unused here.

### Running it locally

```bash
python devserver.py 4321           # the whole repo, both templates
node build.mjs
python devserver.py 4322 dist      # exactly what gets deployed
```

`devserver.py` is `http.server` plus `Cache-Control: no-store` and a custom 404, so local
behaviour matches the host instead of serving stale modules from cache.

### Before anyone outside the team sees it

- The repository is **public** and the site has no access control — anyone with the link
  can open it. It sends `noindex`, which keeps it out of search results but is not
  protection.
- Photography is Unsplash stock standing in for merchant photography.
- The bakery, its staff, press quotes and copy are invented.
- Checkout is simulated. No provider is connected and no money can move.

---

## Structure

```
index.html                     Listed Templates — one entry per template

shared/
  core/                        Pure, DOM-free commerce rules. No markup, no globals.
    dates · format · pricing · cart · rules · fulfilment · storage
  session.js                   Merchant, catalogue, basket, chosen day, events.
                               A factory taking the template's own api.js.
  js/store.js                  Template 01's older global-script commerce layer.
  js/commerce-ui.js            Template 01's date picker, modal, toasts, countdown.
  img/                         Photography, three widths each (-sm 240, -md 800, -lg 1600)

templates/
  01-editorial-atelier/        Crumb Atelier — premium, art-directed, made-to-order
  02-playful-celebration/      Many Happy Returns — "Make a Fuss", live cake builder
  05-neighbourhood/            Hazel & Rye — "The Counter", everyday shop

_archive/05-neighbourhood-v1/  The first attempt at 05, kept for reference
docs/                          Brief, concept, decisions, API contract
devserver.py                   Static server with caching turned off
```

**The split is the point.** The brief asks for *creative diversity at the presentation
layer, consistency and reliability at the commerce layer.* The commerce logic holds no
markup and the brand data holds no logic, so the same rules — dates, product-specific
lead times, capacity, pricing, cart — run underneath designs that share not one line of
styling.

**Three layers, and a rule about each.** `shared/core/` holds the pure, DOM-free
commerce rules — dates, money, pricing, cart, option rules, fulfilment, storage.
`shared/session.js` holds the stateful layer above it. Everything in a template's own
`js/` is shared with nothing, including its UI components: Template 02's date picker and
Template 05's do the same job and look nothing alike, which is the point.

That arrangement was earned rather than designed. D3 warned that Template 05's duplicated
commerce rules "should not survive into template 02"; when Template 02 started, they were
promoted instead of copied a third time — see [docs/decisions.md](docs/decisions.md) D9.

**Template 01 is still the odd one out.** It uses global scripts in `shared/js/` and has
not been migrated to the module layer, so its commerce rules are encoded separately. That
is real duplication and it is the oldest open item in the project.

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

Where the direction came from, and how to defend it:
[docs/01-editorial-atelier-rationale.md](docs/01-editorial-atelier-rationale.md).

Made-to-order only. Multi-day lead times (1–7 days), full configuration on every cake,
gifting with recipient details, delivery zones, NYC sales tax.

## Template 02 — The Playful Celebration

**Many Happy Returns**, Margate. Our concept for this direction is **Make a Fuss**: a
shop where configuring the cake is the reason to use the site rather than a form to get
through.

| | |
|---|---|
| Display | Fredoka (variable, rounded geometric) |
| Interface | Nunito — both self-hosted, 69KB, no third-party connection |
| Surface | `#FFD84D` sun yellow ground, white panels, 3px ink outlines |
| Accent | `#6B2FD4` grape · berry, mint and tangerine confined to the cake and status |

Pages: `index` · `build` · `shop` · `cart` · `checkout` · `confirmation` · `404` ·
`styleguide`

**The cake is drawn live.** Six option groups — tiers, sponge, filling, colour, finish,
topper — redraw an inline SVG on every choice, and the inscription appears on the cake as
you type. 11,250 distinct drawings, pure SVG and CSS, no canvas and no dependencies.
Research for this direction found no bakery storefront in the category with a live visual
preview: the real "build your own cake" pages are dropdown forms that show the customer
nothing until collection day.

It also carries the project's answer to the note that Template 05 "seems similar to the
spirit of the first one". Before any of it was designed, four axes were fixed and
measured against both shipped templates — ground, display type class, accent chroma and
separation method. Its ground sits 192 and 207 channels from the other two, its accent
214 and 302. See [docs/decisions.md](docs/decisions.md) D8.

19 unit tests on the renderer; gifting as a branch of the checkout rather than a
checkbox; simulated payment with working decline and recovery.

Its own [README](templates/02-playful-celebration/README.md) has the detail, and
[docs/02-playful-celebration.md](docs/02-playful-celebration.md) has the research and the
art direction.

---

## Template 05 — The Modern Neighbourhood Bakery

**Hazel & Rye**, London. Our concept for this direction is **The Counter**: a shop you
use weekly, built as a board you read and a ticket that builds.

| | |
|---|---|
| Display | Bricolage Grotesque (variable, `wdth 92 / opsz 48`) |
| Interface | Public Sans — both self-hosted, 164KB, no third-party connection |
| Surface | `#FAF9F6` near-white on white cards; rules, not shadows |
| Accent | `#0E7A4E` green available · honey low · clay sold out |

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

---

## What the research changed

Decisions common to the templates that came out of the research pass rather than taste:

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

- **No template has been tested against bad merchant photography.** The brief is
  explicit that concepts which only work with perfect demonstration content are not
  acceptable, and Template 01 is the most exposed. All three need a deliberately hostile
  fixture set: phone photos, wrong aspect ratios, a 3-item and a 200-item catalogue,
  60-character product names, and a merchant with no delivery and no customization.
  Templates 02 and 05 cover part of this on their style-guide pages; Template 01 does
  not have one.
- **No accessibility audit has been run.** Focus states, reduced-motion, landmarks,
  labelled calendar cells and skip links are in place; that is not the same as tested,
  and nothing has been through a screen reader. Template 02's contrast, target sizes and
  horizontal overflow were measured during the build and its style guide computes the
  contrast table live from the tokens. Templates 01 and 05 have not been measured.
- **Template 01 has not been migrated to the shared module layer.** Its commerce rules
  live in `shared/js/store.js` rather than `shared/core/`, so two implementations of the
  same rules exist in the repository.
- **No performance budget has been measured.**
- **Headers and footers are injected by JavaScript** rather than duplicated across five
  files per template. In production these become template partials; the markup is
  unchanged.
- **`walkthrough.mp4`** is a 2:45 screen recording of Template 01 made before the
  restructure, so its URLs show the old flat paths. Worth gitignoring either way.
