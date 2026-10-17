# Template 02 — The Playful Celebration

Concept and art direction. The brief names this direction; **"Make a Fuss"** is our
concept for it, the way "every cake, catalogued" is Template 01's and "The Counter" is
Template 05's.

The brief's words for this direction:

> A joyful, expressive, imaginative storefront with memorable interactions and an
> energetic visual personality. Emphasis: emotional delight, celebration, discovery,
> and gifting.

Merchant: **Many Happy Returns**, Northdown Road, Margate. Celebration cakes only —
no bread, no coffee, no everyday counter. That focus is what earns the builder its
place on the home page.

---

## 1. The problem this template had to solve first

The higher-up's note on Template 05 was that it "looks good in style but it seems
similar to the spirit of the first one." That was right, and the evidence was in the
tokens: Template 01's ground was `#F5F1EA` and Template 05's `#FBF6EC` — about 2%
apart. Both used a serif display face, both separated things with 1px rules, both
avoided shadows, both used a muted earth accent.

The cause was not laziness about Template 05. It was that I differentiated on
**structure** — cards versus ruled rows, no ticket versus a ticket — while keeping my
own aesthetic defaults, and those defaults *are* the identity. The brief's §11 lists
"Five designs that share essentially the same creative identity" as a rejection
criterion, so this is a project risk and not a matter of taste.

So before any of Template 02 was designed, four axes were fixed and checked against
both shipped templates. The check is in the commit history and reproducible:

| | Template 01 | Template 05 | Template 02 |
|---|---|---|---|
| Ground | `#f5f1ea` cream | `#faf9f6` near-white | **`#ffd84d` sun yellow** |
| Display face | Instrument Serif | Bricolage Grotesque | **Fredoka** |
| Type class | serif | grotesque | **rounded geometric** |
| Accent | `#8a3e2c` clay | `#0e7a4e` green | **`#6b2fd4` grape** |
| Separation | 1px hairline rules | ruled rows + fixed ticket | **3px ink outline + solid offset shadow** |

Channel distance of the ground from 01 and 05: **192** and **207**. Of the accent:
**214** and **302**. Different type class from both. Different separation method from
both.

The ground is the decision that carries the rest. A pale anything is numerically close
to a pale anything else, so the only honest way to be far from two off-whites was to
stop using one. A saturated ground is also on-brief: "energetic visual personality" is
hard to do on cream.

---

## 2. The signature mechanic: a cake you can watch being built

Research for this direction looked for a bakery storefront with a live visual preview
of a custom cake. There is not one.

- [West Town Bakery](https://www.westtownbakery.com/product-category/build-your-own/)
  and [Birthday Cake Shop](https://www.birthdaycakeshop.com.au/product/cake-builder/)
  both call it a "cake builder". Both are plain dropdown forms. You make six decisions
  and see nothing.
- The only visual cake builders found anywhere were a DEV tutorial, a Dribbble mockup
  and a professional iPad app for cake decorators. Nothing a customer can buy from.

That is a real gap, and it maps onto the brief's emphasis for this direction exactly:
"memorable interactions", "emotional delight", "discovery".

So `js/components/cake.js` draws the cake as inline SVG and redraws it on every
choice. Six option groups — tiers, sponge, filling, colour, finish, topper — plus the
inscription, which appears on the cake as you type. 3 × 5 × 5 × 6 × 5 × 5 = **11,250
distinct drawings**, and a wedge is cut out of the bottom tier so the sponge and
filling are visible rather than theoretical.

It is pure SVG and CSS. No canvas, no 3D, no library, no build step.

**Why it is drawn from data, not hard-coded.** Each option in `products.json` carries a
`swatch` hex and, where it matters, a `draw` mode. The renderer never mentions an
option id; `specFrom()` is the single join between the two vocabularies. A merchant
adding a buttercream colour gets it in the drawing without anyone touching JavaScript.

**Why it is deterministic.** Sprinkle scatter and drip lobes are seeded with an FNV-1a
hash of the configuration. Random placement would make the cake shimmer on every
keystroke of the inscription. There is a test for this.

**Why it has an accessible label.** The drawing carries the entire configuration, so
`aria-label` is generated from it — "Two-tier cake, funfetti sponge, raspberry jam &
cream filling, strawberry pink icing, drip finish, candles on top, iced with 'Happy
Birthday'". Treating it as decorative would hide the product from anyone using a
screen reader.

---

## 3. What the research changed, beyond the builder

**Discovery by occasion, not by category.** People shopping for a celebration cake
arrive knowing the event, not the flavour. So the occasion strip is above the category
filter on the shop page and the occasions grid is high on the home page, each tile
carrying a real count from the catalogue.

**Gifting is a branch of the checkout, not a checkbox at the end.** Baymard's gifting
work found that 46% of benchmarked sites offer no gift flow at all, that hiding prices
and including a personal message were the top priorities for gift buyers, and that
some test participants abandoned orders when they could not mark one as a gift. So:

- The recipient is a different person from the buyer and gets their own fields.
- The card message previews itself in the shape of the card it will be written on,
  because "will my message fit" is the actual question.
- Prices-off-the-box is on by default once "it is a present" is ticked.

**A declined card keeps everything.** The order is rebuilt from state on retry, so
there is nothing to lose. The failure message says plainly that nothing was charged
and nothing typed was lost, and the page scrolls to it — on a form this long the
message would otherwise appear off-screen above the button that was pressed.

**One ready-by date for the whole basket.** A basket holding a four-day cake and a
one-day brownie is ready in four days. The basket says so, and names the item that
is holding the rest up.

---

## 4. Art direction

**One rule for everything pressable.** An ink outline and a solid offset shadow.
Pressing it moves the element onto its own shadow. **There is no blur anywhere in the
template** — not one `box-shadow` with a blur radius. Template 01 and Template 05 avoid
shadows; this one has shadows that are plainly drawn shapes.

**Three colours do the work.** Sun, ink, grape. Berry, lemon, mint and tangerine are
confined to the cake itself, to illustration and to status. Six bright colours used
freely would be a circus, which is the failure mode of "playful" as a direction.

**Two radii, and they mean different things.** `--r` is a panel, `--r-pill` is a
control you press. Template 05's post-mortem found uniform rounding to be the absence
of a decision; there are only two here and they do not overlap.

**Things are tilted.** The wordmark sits at −1.5°, the price card at +2°, the hero
frame at +1.2°, the corner flag at −4°. Small, consistent, and it is what stops a
grid of outlined boxes reading as a dashboard.

**Illustration where it is honest, photography where it is honest.** The hero cake,
the occasion tiles, the 404 and the builder are drawn. The nine cakes the shop
actually makes are photographed, because a drawing of a Rainbow cake as plain vanilla
sponge would misrepresent what arrives. On a photographed product the builder shows
the photograph *and* a small drawing of the parts that really are being chosen.

---

## 5. Accessibility

Target is WCAG 2.2 AA. What is actually done:

- Every text pairing in the token set is measured on `styleguide.html`, computed live
  from the tokens rather than written down. All seven pass AA; five pass AAA.
- Target sizes were measured at 375px, not assumed. Every control a customer
  presses to make a choice — buttons, chips, swatches, tiers, slots, calendar cells,
  steppers, the menu button — is at least 44 × 44, which is SC 2.5.5 (AAA). Links in
  the footer and breadcrumb clear the 24 × 24 of SC 2.5.8 (AA) on padding. Three
  classes of control are smaller than their own box and are fine anyway because the
  real hit area is the wrapper: an add-on checkbox inside a 74px label, a swatch
  radio filling its face, and a card title whose stretched pseudo-element covers the
  whole card.
- The date picker is a native `<dialog>`, so focus trapping, Escape, the backdrop and
  making the background inert are the platform's job. Arrow keys move day to day
  across month boundaries.
- Swatches are real radio inputs, so arrow keys move within a group and the browser
  handles the roving tabindex. A chosen swatch gets a drawn tick, so selection is not
  carried by border weight alone.
- Blocked days in the calendar state their reason on the cell — "Closed", "Full",
  "Too soon" — rather than being greyed out silently.
- No colour-only signalling: every status note pairs its hue with an icon and wording.
- `prefers-reduced-motion` stops the candle flicker, the confetti burst, the dialog
  entrance and the tier animation.
- Errors name the field and say what to do, fire on blur rather than per keystroke,
  and clear as soon as the value becomes valid.

**Measured, during the build:** contrast for all seven text pairings, target sizes at
375px, and horizontal overflow at 375px — the last of which caught a header 86px wider
than the screen, since fixed.

**Not done, and it should be said:** no axe or Lighthouse run has been performed on
this or any other template in the project. Nothing has been tested with a real screen
reader. The figures above are measured; everything else is built to the rules but not
independently audited, and no accessibility or performance numbers should be quoted
to the client yet.

---

## 6. What is not in this template

- **One merchant config**, not two. Template 05 has two because the prompt for it
  asked for two; the brief does not require it. The seam is the same shape —
  everything reads `currentMerchantId()` — so a second shop is a pair of JSON files
  and one entry in an array.
- **No FAQ or visit page.** Template 05 has them; this merchant's opening hours and
  delivery areas are in the footer on every page, which is where people look for them.
- **No analytics instrumentation.** This is a brief deliverable and it is unmet across
  the whole project, not just here.

---

## 7. Pages

| Page | What it is for |
|---|---|
| `index.html` | The claim, the builder pitch, occasions, the nine cakes, boxes |
| `build.html` | The builder, and the product page for every configurable cake |
| `shop.html` | Everything, filtered by occasion, kind and words |
| `cart.html` | The basket, with one ready-by date and honest price changes |
| `checkout.html` | Collect or deliver, you, the gift branch, simulated payment |
| `confirmation.html` | The receipt, printable, with the cakes as drawn |
| `styleguide.html` | Every component against deliberately awkward content |
| `404.html` | An empty cake stand |

## 8. Running it

```bash
python devserver.py 4330 .
```

Then `http://localhost:4330/templates/02-playful-celebration/index.html`.

A plain static server works too, but `devserver.py` sends `Cache-Control: no-store`,
which this project needed after browser caching repeatedly served modules that no
longer existed on disk.

Tests:

```bash
cd templates/02-playful-celebration && npm test
```

19 tests, no framework, covering the renderer's determinism, id uniqueness, escaping
of the inscription, contrast flipping and the catalogue mapping.
