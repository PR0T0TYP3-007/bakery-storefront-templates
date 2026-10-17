# Template 05 — The Modern Neighbourhood Bakery

Concept and art direction. The brief names this direction; **"The Counter"** is our
concept for it, the way "every cake, catalogued" is Template 01's.

---

## 1. What went wrong in v1

The feedback was "I liked the colours, but some parts weren't consistent and it looked like
AI slop." Both halves are accurate and they have the same root cause. Being specific about
it, because the diagnosis is what the redesign is built on:

**1. Uniform rounded cards in an even grid.** Every product — a $4.50 baguette and a $64
celebration cake — got the same white rounded box with a photo on top, a name, a price and
a green pill. This is the single most recognisable machine-generated storefront pattern.
It also happens to be *wrong on the merits*: a loaf does not need a hero photograph, and a
celebration cake is not well served by a 250px thumbnail.

**2. Everything floated.** `box-shadow` was applied to cards, panels, the board and the
ticket alike. When every element floats, none of them has hierarchy, and the page reads as
a pile of equally important tiles.

**3. Every corner was the same.** `border-radius: 999px` on primary buttons, ghost buttons,
small buttons, tabs, chips, quantity steppers and nav links. Uniform rounding is the
absence of a decision.

**4. Pill soup.** Three decorative chips under the hero — "Collection & local delivery",
"No sales tax in Oregon", "Closed Mondays" — are filler wearing the costume of content.

**5. No compositional rhythm.** Every section was the same: a `sec-head`, then a grid, then
the same vertical padding, at the same width. Nothing was ever wide, narrow, dense, or
quiet. The page had no shape.

**6. And the actual inconsistency:** the Daily Board used ruled rows with real information
density, and it was the best thing on the page — and then every other surface abandoned
that language for generic cards. The one good idea was an island. That is precisely what
"some parts weren't consistent" was pointing at.

**The fix is not more polish. It is committing to the idea that was already working.**

---

## 2. The concept

### The Counter

The site behaves like the best thirty seconds at a good local bakery: you walk up, you read
what's there today, someone helps you pick, and you leave holding a clear ticket.

Two structures carry the entire template:

**The Board.** Ruled, dense, scannable rows — what is available, how much is left, what it
costs, when you can have it. Not a grid of tiles. A board you *read*, the way you read a
real bakery's list above the counter. This is the primary language of the site and it is
used everywhere: the homepage, the shop, the cart, the checkout review.

**The Ticket.** A persistent order ticket that builds as you choose — item, size, flavour,
inscription, date, running total. Sticky rail on desktop, one tap away on mobile. It is the
reassurance mechanism and the thing that makes the express journey feel safe. Ruled,
tabular, receipt-like.

Everything else is subordinate to those two.

### Why this is the right concept for Template 05

The brief gives this template usability, accessibility, efficient purchasing and operational
clarity. A board and a ticket are *literally* those four things made visual. They are also
honest: a board states what is true today, and a ticket states what you are about to pay
for. Neither has anywhere to hide.

It is also the direction with the most distance from Template 01. Where the Editorial
Atelier is a catalogue to be leafed through — one object per spread, photography leading —
the Counter is a list to be scanned. Same commerce rules underneath, opposite posture.

---

## 3. Art direction

### Photography is earned, not automatic

The central discipline, and the direct answer to the card-grid problem:

| Product kind | Treatment | Why |
|---|---|---|
| Everyday (bread, pastry, cookies) | Ruled row, 64px square thumb, price and stock in columns | You buy these from memory. You need the name, the price and whether it's there. Density beats decoration. |
| Celebration cakes | Large, photo-led tiles with real scale | You buy these with your eyes. The photograph is doing the selling, so it gets room. |

Two presentations, chosen by what the product actually is. This is what kills the
uniformity *and* it is better merchandising.

### Type

Overriding the skill's suggestion of Playfair Display SC — that is the wedding-menu cliché
and it is the opposite of a working neighbourhood bakery.

- **Display — Fraunces.** A variable old-style serif with `SOFT` and `WONK` axes. Warm,
  slightly irregular, obviously drawn by someone. It reads as craft without reading as
  twee. Distinct from Template 01's high-contrast Instrument Serif.
- **Interface — Public Sans.** Open apertures, large x-height, designed for
  government-grade legibility. Chosen specifically for the "low tech confidence, on a
  phone, in a hurry" reader. Deliberately not Inter.
- **Numerals** are tabular throughout. Prices, counts, totals and times all align in
  columns — a board and a ticket only work if the numbers line up.

Body text never below 16px. Display is used at genuine scale (clamp up to ~4.5rem) so there
is real contrast between a headline and a row label, rather than everything sitting in a
narrow band of medium-large.

### Colour

Keeping the warm oat and green that worked, tightened:

| Token | Value | Job |
|---|---|---|
| `--paper` | `#FBF6EC` | Warm oat ground |
| `--ink` | `#1E1711` | Text, rules, the board |
| `--ink-2` / `--ink-3` | `#574C3F` / `#857767` | Secondary, tertiary |
| `--green` | `#1B5E41` | Available, confirm, primary action |
| `--honey` | `#9A6410` | Low stock, caution |
| `--clay` | `#A33F28` | Sold out, errors, destructive |
| `--rule` | `rgba(30,23,17,.16)` | The lines that do the structural work |

Status is never carried by colour alone — every state has a word next to it.

### Surface rules

Deliberate constraints, written down so they are enforceable:

1. **Rules, not shadows.** Separation comes from 1px lines and ground-tone shifts. Shadow is
   reserved for things genuinely floating above the page: the mobile ticket sheet, the
   modal, the toast. Three places. Nowhere else.
2. **Two radii only.** `4px` for inputs, buttons and tiles. `999px` for filter chips and the
   cart badge, which are genuinely pill-shaped objects. Nothing in between.
3. **Asymmetric layout.** The board column and the ticket rail are not equal. Desktop runs
   roughly `1.55fr / 0.75fr`. Sections alternate between full-bleed rules and the narrower
   reading measure.
4. **No decorative chips.** If a fact matters it goes in a row or a sentence. The hero
   pill-row is gone.
5. **Density is a feature.** Row height ~56px, not 120px of padding around a thumbnail. More
   of the shop is visible without scrolling, which is what a regular wants.

### Motion

Functional only, under 250ms, CSS-first, always honouring `prefers-reduced-motion`.
Permitted: button press feedback, ticket row insertion, sheet open, focus transitions.
Forbidden: entrance animations on product rows, scroll-triggered reveals on anything a
customer needs to read, anything that delays the add-to-cart response.

v1 used scroll reveals on the product grid. They are removed — a shop list that fades in is
a shop list you cannot scan.

---

## 4. Resilience to imperfect content

The brief rejects designs that only work with perfect demo content, and the ruled-row
language is substantially more robust than the card grid it replaces:

- **No photo** → designed monogram placeholder using the product's initial, in ground tone.
  The row still works; only a tile would have looked broken.
- **Wrong aspect ratio** → thumbs are fixed 64px squares with `object-fit: cover`. Nothing
  can break the row rhythm.
- **Long names** → rows wrap to two lines and the price column holds its position.
- **3 products or 300** → a list scales where a grid gets lonely at 3 and endless at 300.

---

## 5. Commercial reasoning — stated as hypotheses

The brief rejects unsubstantiated claims that a feature will increase sales, so these are
written as testable propositions, not promises. Each needs a real experiment before anyone
should believe it.

| # | Hypothesis | Metric | How to test |
|---|---|---|---|
| H1 | A persistent ticket reduces checkout abandonment by removing "what am I actually buying?" uncertainty | Cart → purchase rate | A/B persistent ticket vs. hidden cart |
| H2 | Ruled rows let regulars find a known item faster than a card grid | Time to add first item, returning visitors | Timed task test, 8 participants |
| H3 | "Order your usual again" raises repeat frequency | Orders per customer per quarter | Cohort comparison after launch |
| H4 | Stating collection slot capacity reduces no-shows and phone calls | Calls per 100 orders | Merchant-reported, pre/post |
| H5 | Showing a live count only for today (and batch size for later) increases trust in the board | Board → product click-through | A/B honest counts vs. fabricated counts everywhere |

None of these are validated. They are the experiment backlog.

---

## 6. What this is not

- Not a chalkboard pastiche. The board idea is structural, not decorative — no chalk
  textures, no handwriting fonts, no fake kraft paper.
- Not minimalism. It is dense on purpose.
- Not brutalism either, which is what the design-system search suggested at high variance.
  Raw, stark and anti-design is the wrong posture for a shop whose entire proposition is
  warmth and local trust. The structure is borrowed; the temperature is not.
