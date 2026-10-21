# Template 04 — The Contemporary Creative Studio

Concept and art direction. The brief names this direction; **"Priced on the page"** is
our concept for it, the way "every cake, catalogued" is Template 01's.

The brief's words:

> A bold, experimental design language with unusual compositions, expressive typography,
> and inventive interactions. Emphasis: originality, differentiation, and artistic
> identity.

Merchant: **FOLD**, Oranienstraße, Berlin. Four commissions a week and a handful of
repeated editions. One bench, one person per piece.

---

## 1. Why this direction and not Template 03

Three of the brief's nine rejection bullets point at this direction — *"beautiful
interfaces that are difficult to navigate"*, *"excessive animations that slow down
purchasing"*, and *"templates that look impressive in Figma but cannot be faithfully
implemented"*. It was still the right one to build, for three reasons.

**Template 03 fails the distance check in its own register.** Run D8 on a Romantic
Boutique built the way the brief's own words push it — intimate, affection, presentation,
which means blush, a high-contrast serif and generous whitespace:

| vs | ground | accent | type class |
|---|---|---|---|
| Template 01 | **17** | 160 | **same (serif)** |
| Template 05 | **10** | 232 | different |

A ground 10–17 channels from two shipped templates is the same colour. Template 02
cleared 192 and 207. To pass, Template 03 would have to abandon blush, abandon the serif
and move to a deep jewel ground — at which point it is no longer a romantic boutique.

**Template 03's functional territory is already taken.** Baymard's gifting work is the
strongest research in the category, and it was already applied in Template 02: gifting is
a first-class branch of that checkout, the recipient has their own fields, the card
message previews itself, prices come off the box by default. Template 03 would be
Template 02's best idea in Template 01's clothes.

**The "cannot be faithfully implemented" bullet cannot apply here.** There is no Figma.
The deliverable is the implementation, verified in a browser with tests behind it. The
other two bullets are controlled by one rule, held throughout: *experiment with
composition and typography, never with interaction.* Template 02 proved the discipline —
a wild builder and a completely plain checkout.

---

## 2. The distance check

| | Template 01 | Template 02 | Template 05 | **Template 04** |
|---|---|---|---|---|
| Ground | `#f5f1ea` cream | `#ffd84d` sun | `#faf9f6` near-white | **`#0e0e10` near-black** |
| Display | Instrument Serif | Fredoka | Bricolage Grotesque | **Syne** |
| Type class | serif | rounded geometric | grotesque | **expressive / quirky** |
| Accent | `#8a3e2c` clay | `#6b2fd4` grape | `#0e7a4e` green | **`#ccff00` acid** |
| Separation | 1px hairline rules | 3px outline + offset shadow | ruled rows + ticket | **overlap, bleed, visible grid** |

Closest ground distance **504**, closest accent **303**, unique type class, unique
separation method. It is also the first dark ground in the set — the one region none of
the other three occupied.

**Nothing in this template has a border radius, a shadow or a gradient.** Where one thing
ends and the next begins is told by position: the twelve-column grid is visible, sections
bleed past the measure, and elements overlap. That is the separation method, and it is
why removing the boxes does not make the page ambiguous.

The hero is built on all three: the piece runs off the right edge of the document, hangs
into the section below it, and the words hold the twelve-column measure while it does. For
a while it was not — the first screen was type on a flat field, which made the one view
that establishes the identity the one view that used none of it. See D21.

---

## 3. The signature: a commission that prices itself

Research for this direction looked at how bespoke cake work is actually sold. Two real
studios, opposite ends of the market, both checked directly:

- **[ECBG Studio, Chicago](https://www.ecbgstudio.com/custom-inquiry)** — an enquiry form.
  No payment. *"Custom cakes start at $300 and require a minimum of two weeks notice."* A
  named manager sends a quote later.
- **[Yevnig, London](https://yevnig.com/contact-yevnig/)** — an enquiry form and a
  consultation booking. You pick a **budget band**: below £1,500, £1,500–3,000, above
  £3,000. Ready-made cakes live on an entirely separate site.

**The artistic end of this market has no transactional storefront at all.** You declare a
budget and wait for a human. Yevnig's budget band is a frank admission that they cannot
price it on the page.

So the template's job is to produce a **firm number from a brief**, live, and show its
working. Scale, how far it is taken, the studio's techniques, a palette direction, a day,
and whether we set it up on site. The output is a **typeset spec sheet** — the brief as a
studio job sheet, the price at display scale with its arithmetic underneath, the lead
time, the deposit and the date the quote expires. It prints; the print stylesheet flips
the whole template to paper for exactly that.

That is a different mechanic from Template 02's cake builder, not a restyling of it.
Template 02 asks *"what should it look like?"* and draws it. This asks *"how ambitious is
this, and what does that cost?"* and prices it.

### The model

`js/commission.js` is pure and DOM-free, with 20 tests. It is **not** in `shared/core/`,
because one template uses it — D3 and D9 set the rule that a module is promoted when a
*second* template needs it, not in anticipation.

It is also not `shared/core/pricing.js`. That function is additive: a base plus the price
of each chosen option, which is right for a cake with a size and a sponge. It cannot
express how a studio quotes, which is a base for the **scale** multiplied by how far you
are taking it, and only then the techniques added on top. Taking a brief from Clean to
Editorial does not add a fixed sum; it changes what the whole job costs.

Four decisions in it are worth stating:

**Ambition caps techniques.** A Clean brief takes two, Composed four, Sculptural six,
Editorial nine. A Clean brief with six techniques on it is not a clean brief, and a studio
that accepted one would be agreeing to something it cannot deliver. Blocked techniques say
why and name the level that would allow them.

**Lead time adds up rather than overlapping.** One person builds the whole piece, so
drying sugar flowers and building an armature happen one after the other. It is why an
ambitious brief genuinely takes six weeks, and saying so up front is the point.

**The lines sum to the quoted total.** There is a test asserting it. A quote a customer
cannot check by adding up is just a different kind of guess.

**The deposit is a share of the order, not of a line.** A basket holding a commission is a
commission order: 30% is taken now, the balance on collection, and the checkout button
says *"Pay the deposit — €689.51"* rather than the €2,298 total. Showing the total as "to
pay" would be a lie the customer discovers on their statement.

---

## 4. Accessibility

Target is WCAG 2.2 AA. Measured, not assumed:

- **Contrast is computed live from the tokens** on `styleguide.html`. It caught a real
  failure during the build: `--rule-strong` at `#55565e` measured **2.64:1**, under the
  3:1 that SC 1.4.11 requires of a rule that separates content. Raised to `#6a6b73`,
  3.64:1. Measuring it is the only reason that was found.
- **The decorative column grid is deliberately below the threshold** and `aria-hidden`.
  It is atmosphere; nothing depends on seeing it, which is why structural rules use a
  separate, stronger token.
- **Target sizes measured at 375px.** Every control is at least 44 × 44. Footer and
  section-marker links clear the 24 × 24 of SC 2.5.8 on padding. Tile titles are smaller
  than 24px but their stretched pseudo-element covers the whole tile.
- **No horizontal scroll at 375px on any of the nine pages.** Checked per page, which
  caught two real bugs — see §5.
- Native `<dialog>` for the diary, so focus trapping, Escape, the backdrop and the inert
  background are the platform's job. Arrow keys move day to day across month boundaries.
- Blocked days state their reason on the cell — "Shut", "Taken", "Too soon".
- No colour-only signalling: every status pairs its colour with a word.
- `prefers-reduced-motion` stops the dialog entrance, the toast and the price flash.
- Errors name the field and say what to do, fire on blur rather than per keystroke, and
  clear as soon as the value becomes valid.

**Not done, and it should be said:** no axe or Lighthouse run, and nothing has been
through a screen reader. The figures above are measured; everything else is built to the
rules but not independently audited.

---

## 5. Bugs this template's own checks caught

**`.bleed` used `100vw`.** The classic break-out trick, and `100vw` includes the vertical
scrollbar — so every band overflowed the document by the scrollbar's width and gave the
whole page a sideways scroll. The bands are direct children of `<main>` and were already
full width, so the hack was removed rather than patched.

**The spec sheet used a viewport media query to lay out a 388px container.** At a 1000px
viewport the query matched and put two columns inside a narrow box, overflowing it.
Replaced with `auto-fit` + `minmax`, which asks the container how much room it has — the
question that actually matters.

**The reference was `F-9357`.** The shared `placeOrder` builds a prefix from the
merchant's initials, which turns a one-word studio name into a single letter. Now initials
for a multi-word name, the first four letters for a one-word one.

---

## 6. What an outside review found

A reviewer walked the template as a customer. Five findings were real and are fixed; two
were based on a misreading and are not.

**Fixed, and serious:**

- **VAT contradicted itself.** The config said "Includes 7% VAT" and the checkout added
  7% on top: €85 became €90.95. In the EU that is not a presentation choice, it is the
  law. See D14 — `taxMode` is now a property of the merchant and there are tests for
  both directions.
- **Gifting and inscriptions were absent, not switched off.** §7 requires the template to
  *support* them behind a config flag. See D15.
- **The size control did nothing.** Every option priced zero and labelled "included",
  above a separate quantity stepper. It is a real size now and the price moves.
- **Commission copy reached edition buyers.** An €85 cake off a shelf was told we would
  ring to talk their brief through and that the spec sheet was on its way. The copy now
  depends on what is in the basket.
- **Card was the only payment method.** §7 asks for relevant local ones; Berlin gets
  PayPal, Klarna and SEPA, with a wallet offered only where the device would have one.

**Also fixed:** `--ink-3` measured 3.55:1 and failed AA — it was not in the style guide's
table, which is why it survived, and it is now; the free-delivery nudge told an €85 order
it was €815 away; the basket count rendered "00", which in Syne reads as two letters; the
collection window was grey text that did not look required; the add-to-basket toast had
no route to the basket; and the editions could not have their date chosen before
checkout.

**Not changed, and why:**

- **"Only the title is clickable."** It is not — the title's stretched pseudo-element
  covers the whole tile, confirmed with `elementFromPoint` over the photograph.
- **"Start the commission builder empty."** An empty configurator gives the customer
  nothing to react to. Template 02's builder opens on a default for the same reason. The
  real concern — that a default could pass for the customer's own choice — is handled by
  saying so above the first step, and the line disappears on first interaction.

**Declined outright:** a proposal to add a live visual cake drawing to the commission
builder. That is Template 02's signature mechanic, and copying it into Template 04 is
precisely the failure D8 exists to prevent. This template's output is a document, not a
picture, and the difference is the point.

## 7. What is still not in this template

- **One merchant config.** The seam is the same shape as everywhere else — a second studio
  is a pair of JSON files and one entry in an array.
- **No analytics instrumentation.** A brief deliverable, unmet across the whole project.
- **Two editions, not three.** See D16: there were only two unused cake photographs, and
  a product showing a picture of something else is worse than a shorter range.

## 8. Pages

| Page | What it is for |
|---|---|
| `index.html` | The claim, the gap, recent work, the technique vocabulary |
| `commission.html` | The brief, and the spec sheet it produces |
| `work.html` | Commissions pitched, editions listed |
| `piece.html` | One edition — deliberately plain next to the commission page |
| `cart.html` | The basket, with one ready-by date and the deposit named |
| `checkout.html` | Collect or deliver, you, simulated payment |
| `confirmation.html` | The booking, printable, reference at display scale |
| `styleguide.html` | Every component against awkward content, contrast measured live |
| `404.html` | |

## 9. Running it

```bash
python devserver.py 4330 .
```

Then `http://localhost:4330/templates/04-creative-studio/index.html`.

```bash
cd templates/04-creative-studio && npm test
```

20 tests on the commission model: that the lines sum to the quote, that ambition
multiplies rather than adds, that lead time is additive, that the deposit accounts for the
whole total, and that an unknown option falls back rather than crashing a quote.
