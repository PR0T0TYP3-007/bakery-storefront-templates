# Decisions

Significant choices, the alternatives, and why. Newest last.

---

### D1 — Skill output overridden on style and typography

**Decision.** Used `ui-ux-pro-max` for the design-system pass, then overrode two of its
recommendations.

**What it returned.** At `--variance 8` it proposed **Brutalism** with a three-step
conversion-funnel page pattern. At `--variance 5`, **Minimalism**. For type, both passes
recommended **Playfair Display SC + Karla** ("Restaurant Menu").

**Why overridden.** Brutalism — "raw, unpolished, stark, anti-design" — is the wrong
posture for a shop whose entire proposition is warmth and local trust, and the funnel
pattern is for a landing page, not a shop people use weekly. Playfair Display SC is the
wedding-menu cliché; small-caps Playfair is what every stock bakery template already uses.

**Kept from it.** The warm amber/cream colour direction, the anti-patterns list ("poor
food photos", "hidden hours"), the structural ideas behind brutalism (sharp corners,
visible grid, bold type, large blocks) applied selectively, and the pre-delivery
checklist. The skill's own guidance says to verify fit before applying, which is what
this is.

**Chosen instead.** Fraunces (variable, with the `SOFT` and `WONK` axes active) for
display and Public Sans for interface. Warm and legible without being twee, and distinct
from Template 01's Instrument Serif.

---

### D2 — Self-hosted variable fonts rather than Google Fonts

**Decision.** Downloaded the latin subsets of both families as variable WOFF2 into
`assets/fonts/` and declared them with `font-display: swap` and explicit `unicode-range`.

**Cost.** 148KB total (Fraunces 121KB, Public Sans 27KB).

**Why.** Removes a third-party connection from the critical path, which matters for the
LCP target, and means the template works offline and on a static host with no external
dependency. The first download attempt grabbed the wrong subset (a 4.8KB vietnamese
block) — the latin block has to be selected explicitly from the CSS response.

---

### D3 — ES modules here, global scripts in Template 01

**Decision.** Template 05 uses native ES modules with a pure, DOM-free `js/core/` and a
single `js/services/api.js` seam. Template 01 still uses the older global-script
`shared/js/` approach.

**Alternatives.** (a) Migrate Template 01 too, for one architecture. (b) Keep Template 05
on the global scripts.

**Why this.** (b) would have meant giving up the DOM-free core and the swappable API seam,
which are the two things that make the commerce logic genuinely reusable by templates
02–04 and replaceable by a real backend. (a) is the right end state but means re-verifying
a template that currently works, in the same change as a redesign.

**Debt, stated plainly.** The project now has two module systems. `js/core/` is the better
version and Template 01 should migrate to it; until then, `shared/js/store.js` and
`templates/05-neighbourhood/js/core/` encode the same rules twice. That is a real
duplication risk and it should not survive into template 02.

---

### D4 — Board rows for everyday stock, photo tiles for cakes

**Decision.** Two product presentations, selected by `product.kind`.

**Why.** The uniform rounded-card grid was the single biggest reason v1 read as
machine-generated, and it was also wrong on the merits: a £2.60 baguette does not need a
hero photograph and a £42 celebration cake is not sold by a 250px thumbnail. Rows are
denser, scan faster for regulars, and survive bad merchant photography — a missing image
becomes a designed monogram rather than a broken tile.

---

### D5 — Honest availability: live counts today, batch sizes later

**Decision.** `shelf()` returns a live falling count only for today. For any future day it
returns the batch size and whether the day is mostly pre-ordered.

**Why.** A shop cannot know how many baguettes will be left next Tuesday. Printing
"15 left" for a future date is invented precision, and the board stops being worth reading
the moment a customer notices. The board's heading and footnote change to match what the
numbers mean.

**Consequence.** The low-stock and sold-out states are only visible when browsing today,
which is correct but means they are easy to miss in a demo. `styleguide.html` shows all
four states side by side.

---

### D6 — Payment is simulated, with deliberate failure paths

**Decision.** `placeOrder()` rejects on two test card numbers:
`4000 0000 0000 0002` → declined, `4000 0000 0000 0119` → provider unreachable.

**Why.** The brief requires a demonstrated recovery path. A happy path that always
succeeds proves nothing about whether the basket survives a decline.

---

### D7 — Documentation scope reduced against the prompt

**Decision.** Produced the concept, art direction, decisions, API contract and README.
Did **not** produce the full 14-document set (separate research, journeys, design-system,
motion-guidelines, usability-test-plan, merchant-guide, analytics-and-experiments,
accessibility and performance report files).

**Why.** The feedback driving this work was about visual quality and consistency, so the
effort went into the design and the working build. Writing fourteen markdown files while
the design stayed mediocre would have satisfied the letter of the prompt and missed its
point.

**What this means.** Those documents are not written. The commercial hypotheses live in
`02-concept.md` §5 rather than a separate analytics file, and no Lighthouse or axe run has
been performed yet — so no performance or accessibility numbers should be quoted.

---

### D8 — An explicit distance check before any template is designed

**Decision.** Before a new template gets a single line of CSS, four axes are fixed and
compared against every template already shipped: the ground colour, the display type
*class*, the accent chroma, and the method used to separate one thing from another. All
four must differ. The numbers go in that template's concept document.

**Why.** The higher-up's note on Template 05 — "looks good in style but it seems similar
to the spirit of the first one" — was correct, and the evidence was measurable. Template
01's ground was `#F5F1EA`, Template 05's `#FBF6EC`: about 2% apart. Both had a serif
display face, 1px rules, no shadows and a muted earth accent.

The cause was that I differentiated on **structure** — cards versus ruled rows, ticket
versus no ticket — while keeping my own aesthetic defaults, and those defaults *are* the
identity. The brief's §11 names "five designs that share essentially the same creative
identity" as a rejection criterion, so this is a project risk, not a question of taste.

**What this means in practice.** It forced Template 02 off an off-white ground entirely,
because any pale colour is numerically close to any other pale colour. Template 02's
ground is 192 and 207 channels from the other two; its accent is 214 and 302 away.

---

### D9 — Shared commerce layer, per-template everything else

**Decision.** Three layers, with a hard rule about what may go in each:

- `shared/core/` — pure, DOM-free commerce rules. Dates, money, pricing, cart, option
  rules, fulfilment, storage. Imported by every template.
- `shared/session.js` — the stateful layer: merchant, catalogue, basket, chosen day,
  events. It touches the DOM (it sets `lang` and `data-brand`), so it is not in `core/`.
  It is a factory that takes the template's own `api.js`.
- Everything in `templates/<name>/js/` — components, pages and the `api.js` data seam.
  Shared by nothing.

**Why.** D3 said the duplicated commerce rules "should not survive into template 02". When
Template 02 started, the choice was to copy them a third time or promote them. Promoting
them took a `git mv`, thirteen import rewrites and a build-script change; copying would
have been free today and a three-way merge every time a rule changed.

`session.js` went the same way one step later, for the same reason: it was 180 lines and
the only template-specific line in it was the relative import of `api.js`.

**What this means.** UI components are deliberately *not* shared. Template 02's date picker
and Template 05's do the same job and look nothing alike, which is the point — a shared
component across five templates with five identities would pull them back together, which
is exactly what D8 exists to prevent.

---

### D10 — The cake builder is drawn from data, and it is deterministic

**Decision.** Template 02's live cake preview is inline SVG built by one pure function
that returns a string. Option colours and drawing modes live in `products.json`; the
renderer never mentions an option id. Sprinkle scatter and drip lobes are seeded from an
FNV-1a hash of the configuration.

**Why determinism matters.** The inscription repaints the cake on every keystroke. With
random placement the sprinkles would re-scatter on each letter typed, which reads as a
glitch rather than a feature. There is a test asserting that typing does not re-pour the
drip.

**Why from data.** A merchant adding a buttercream colour should not need a developer. The
only join between the two vocabularies — option ids and drawing modes — is `specFrom()`.

**Why a string and not DOM nodes.** It makes the thing testable under `node --test` with
no DOM, no jsdom and no transpiler. One `innerHTML` of a three-tier sprinkle-coated cake
measures around 1.1ms, well under a frame, so diffing would be more code for no gain the
customer could feel.
