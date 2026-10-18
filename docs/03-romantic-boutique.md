# Template 03 — The Romantic Boutique

Concept and art direction. The brief names this direction; **"Written by hand"** is our
concept for it, the way "every cake, catalogued" is Template 01's and "priced on the
page" is Template 04's.

The brief's words:

> An intimate, thoughtful, highly personalized experience built around affection,
> meaningful occasions, and gifting. Emphasis: storytelling, personalization, emotional
> connection, and presentation.

Merchant: **Postscript**, Bartlett Street, Bath. A two-room shop that makes celebration
cakes and writes on them.

---

## 1. The problem this template was going to have

[`docs/04-creative-studio.md`](04-creative-studio.md) §1 argued, when Template 04 was
chosen over this one, that a Romantic Boutique built the way the brief's own words push
it — intimate, affection, presentation, therefore blush, a high-contrast serif and
generous whitespace — **fails the D8 distance check in its own register**:

| vs | ground | accent | type class |
|---|---|---|---|
| Template 01 | **17** | 160 | **same (serif)** |
| Template 05 | **10** | 232 | different |

That analysis was right about the obvious build and wrong about the direction. A ground
10–17 channels from two shipped templates is the same colour, and a fifth serif would
have been the client's original complaint handed back to them. But "blush, serif,
whitespace" is the *cliché* of romance, not romance itself, and the brief asked for a
creative concept, not a mood board.

So the first decision was to find out what the market actually gets wrong, and build the
identity around the answer rather than around the adjective.

---

## 2. Research: where the romantic end of this market fails

Three real shops, checked directly. All three sell cakes whose whole purpose is to carry
a message to somebody.

- **[Konditor, London](https://konditor.co.uk/collections/personalised-cakes)** —
  *"Add your message at checkout and we'll pipe it by hand, with care and a flourish."*
  The gift message card is capped at 120 characters and shown as `0/120`. **There is no
  preview of the message anywhere.**
- **[Cutter & Squidge, London](https://www.cutterandsquidge.com)** — the gift note is not
  part of the order at all. You buy the cake, then go to a *separate page*, enter your
  order number and postcode, and type the note — and you must do it **within one hour of
  purchase** or the cake is delivered with nothing. Maximum 300 characters, with the
  instruction *"remember to include in your note who the gift is from"*.
- **[Patisserie Valerie](https://www.patisserie-valerie.co.uk/collections/valentines-day)**
  — an inscription and an optional gift card at checkout, nominated-day delivery up to 90
  days ahead. The inscription is a text input.

The pattern is the same in all three, and it is the gap:

> **The words are the product, and every storefront treats them as a text input at the
> end of checkout.** Nobody shows you what the card will look like. Nobody tells you what
> will happen when your message is too long for the pen. One shop knows customers forget
> to sign their own gift and solves it with a parenthesis; another takes the note after
> the money, on a different page, with a one-hour clock.

A character counter is not a preview. `0/120` tells you that you have room; it does not
tell you that your message lands on four lines, that the card holds three, or that the
longest word in it is wider than the card. The customer finds out when the recipient
does, which is the one moment that cannot be fixed.

That is the thing worth building, and it maps exactly onto the four words the brief uses
for this direction: *storytelling, personalization, emotional connection, and
**presentation***.

---

## 3. The distance check

Run before a line of CSS, per D8.

| | Template 01 | Template 02 | Template 04 | Template 05 | **Template 03** |
|---|---|---|---|---|---|
| Ground | `#f5f1ea` cream | `#ffd84d` sun | `#0e0e10` near-black | `#faf9f6` near-white | **`#8e2a58` mulberry** |
| Display | Instrument Serif | Fredoka | Syne | Bricolage Grotesque | **Julius Sans One** |
| Type class | serif | rounded geometric | expressive / quirky | grotesque | **incised sans capitals** |
| Accent | `#8a3e2c` clay | `#6b2fd4` grape | `#ccff00` acid | `#0e7a4e` green | **`#ffb8c6` blush** |
| Separation | 1px hairline rules | 3px outline + offset shadow | overlap, bleed, visible grid | ruled rows + ticket | **masked apertures, no rules, no boxes** |

Measured in summed channel distance, the same way every other template's was:

```
ground   #8e2a58   vs 01 448   vs 02 298   vs 04 228   vs 05 473   → closest 228
accent   #ffb8c6   vs 01 393   vs 02 299   vs 04 320   vs 05 423   → closest 299
```

Template 02 was accepted at 192 and 207, so both clear the lowest precedent in the set
with margin.

**Why a mid-saturated chromatic ground, and why that specific one.** Under this metric,
"deep and romantic" is mostly unavailable: any near-black is within about 100 channels of
Template 04's, because dark colours are numerically close to each other whatever their
hue. A plum at `#7f2550` scrapes 200; at `#5e1f52` it is 163 and fails. What *is* wide
open is a ground with one high channel and two low ones — a saturated wine — which is 228
from near-black and 300–470 from everything pale. It is also the first ground in the set
that is a *colour* rather than a neutral: three near-whites, one near-black, and this.

And it is the right colour on the merits. "Intimate" is literally about low light. A
boutique at dusk, a velvet-lined box, a jewel case — that is the emotional character the
brief names for this direction, and nothing in the set had claimed it.

**Why blush is the accent, rather than avoided.** Blush is the cliché this direction was
in danger of, and it is also, measurably, the one accent region nobody used: every
shipped accent is dark or saturated, so a pale pink is 299–423 channels from all four. On
a mulberry ground it is the only light warm thing on the page, which makes it a genuine
accent rather than a mood. Reclaiming it is a better answer than flinching from it.

**Why an incised sans and not a fifth serif.** Julius Sans One is an art-nouveau incised
capital — the register of an engraved invitation, not of a frosting script. It is
unambiguously a sans, so there is no argument to have about whether it collides with
Template 01; it is nothing like Fredoka's rounded geometry, Bricolage's grotesque or
Syne's quirk. It is used only for short lines, always tracked out, because a hairline
capital face is a signature and not a paragraph.

### The three faces, and the rule that keeps the script honest

| Role | Face | Where it is allowed |
|---|---|---|
| Display | Julius Sans One | The shop's name, page titles, section marks. Short strings, tracked out. |
| **The hand** | Petit Formal Script | **Only inside a preview of something handwritten** — the card, the piped inscription. Never in the interface. |
| Interface | Karla | Everything functional: prices, buttons, forms, availability, body copy. |

The script is **diegetic**. It appears where handwriting literally appears, and nowhere
else. That is the whole difference between this template and the stock bakery theme that
sets its navigation in a script: there, the script is decoration applied to an interface;
here, it is a depiction of what the shop will actually do with a pen. D1 rejected Playfair
Display SC as "the wedding-menu cliché" for exactly this reason — a face borrowed for
atmosphere. This one has a job.

Total font weight: **76KB** for all three latin subsets, self-hosted per D2.

**Separation: masked apertures.** Nothing in this template is separated by a rule, a box,
a card or a shadow. Content is cut out of the ground into arch-topped and oval
apertures — the shape of a window, a locket, a Victorian photo mount — and text is set to
a narrow measure with wide margins, the way a letter is. The method also survives bad
merchant photography, which the brief explicitly demands: a phone snapshot inside an arch
still looks intended, where the same snapshot in a rectangular card looks like a mistake.

---

## 4. The signature: the card is composed, not typed

`card.html`. One screen, reached from any cake, and skippable.

You write to somebody. As you type, the card sets itself — in the shop's hand, at the
card's real proportions, broken where the pen will break it. The model underneath is
`js/card.js`: pure, DOM-free, template-local per D12, with its own tests.

What it does that a character counter cannot:

**It counts lines, not characters.** The stock is a real size and the hand has a real
width, so the message is laid out greedily at word boundaries into a measure. Four lines
on a three-line card is a problem a counter cannot see and a customer cannot predict.

**It knows what happens when it does not fit.** The shop's first move is to write
smaller — one step, and the preview does it, and says so. Past that it genuinely does not
fit, and the page says how many characters to cut rather than refusing.

**It names the word that is too wide.** A pen cannot hyphenate mid-word the way a browser
can. A single word longer than the measure is an error that names the word.

**It knows what a pen cannot write.** Accented letters are fine — Konditor's reviews
include a message written in Spanish. Emoji are not. The model separates "we can write
this" from "we cannot", lists the characters it cannot do, and never silently drops them.

**It shows the pair.** The recipient does not see a card and a cake separately; they open
one box. The preview shows the piped inscription and the written card together, because
that is the composition the customer is actually making.

**The card is per cake, not per order.** Two cakes to two people are two cards. It travels
on the line's `meta` field — the one D18 added for Template 04's commission brief, which
`shared/core/cart.js` carries and does not interpret, and which `signature()` already
includes so two different cards never merge into one line at quantity two.

### Why this is not Template 02's gifting

D15 is explicit that a capability may be switched off but not absent, and that
differentiation is about treatment and prominence rather than dropping requirements.
Template 02 has gifting as a first-class checkout branch with a live card preview, and it
is good. The difference is in kind:

| | Template 02 | Template 03 |
|---|---|---|
| Where | A branch of the checkout form | Its own screen, before the basket |
| What it models | The message text | The physical card: measure, lines, pen, stock |
| What it warns about | Character limit | Lines, the too-wide word, the unwritable character |
| Scope | One card for the order | One card per cake |
| Register | A note in a card-shaped box | The card, set in the hand that will write it |

Template 02 asks *"what should it say?"*. This asks *"what will it look like when she
opens it?"* — and answers.

---

## 5. Occasions, and the honest version of a reminder

§7 requires browsing by occasion, and §6 names repeat purchase rate as a metric. The
research on occasion reminders found vendor marketing and **no independent conversion
data at all** — one WooCommerce add-on cites "179% higher unique click rate" with no
source or method. §11 rejects *"unsubstantiated claims that a creative feature will
increase sales"*, so this template does not make one.

What it does instead, and labels plainly: after an order, the shop offers to **keep the
date on this device**. On a later visit it says *"Mara's birthday is in 23 days"* and
offers what you sent last time and something different. It is `localStorage`, it is this
browser only, and the page says so — it cannot email anyone, and claiming otherwise would
be the kind of demo that only works in a demo.

That is recorded as a hypothesis to test, not a result. See §9.

---

## 6. Both buyers

§5 of the brief demands the Express Buyer and the Exploratory Buyer equally, and a
storefront organised around composing a card is a trap for the first one.

- The cake page has two buttons: **Add to basket**, and **Add, and write the card**. The
  plain one is first and is the default.
- The card screen is reachable from the basket afterwards, so skipping it is not a
  decision you have to unmake.
- A line with no card is a complete, valid order and is never nagged about. "No card" and
  "an empty card" are different states and the model distinguishes them.
- Checkout is deliberately ordinary. The same rule Template 04 held: **experiment with
  composition and typography, never with interaction.**

---

## 7. Accessibility

Target WCAG 2.2 AA. Measured, not assumed, per D13 — `styleguide.html` computes the
contrast table from the live tokens.

Two tokens failed on the first pass and were raised before anything shipped, which is the
whole argument for computing it:

- `--ink-3` at `#e3aebd` measured **4.22:1** on the ground, under AA for body text. Raised
  to `#e8b9c6`, 4.65:1.
- `--rule-strong` at `#c98da4` measured **2.99:1**, one hundredth under the 3:1 that
  SC 1.4.11 requires of anything separating content. Raised to `#d49eb3`, 3.56:1.

Other commitments, each verified in the build:

- Form fields are **underlined, not boxed** — the stationery register. That is a
  discoverability risk, so every field keeps a visible persistent label above it, a 2px
  baseline that clears 3:1, a 48px target, and a focus ring that is an ordinary outline.
  Focus indication is not where this template experiments.
- The script face is never used for interface text, never below 20px, and never as the
  only carrier of information: the card preview is a `<figure>` whose `<figcaption>`
  states the message, the line count and any warning in the interface face.
- No colour-only signalling. Every state pairs its colour with a word.
- `prefers-reduced-motion` stops the card's set-and-settle transition.
- Target sizes measured at 375px; no horizontal scroll on any page at 375px.

**Not done, and it should be said:** no axe or Lighthouse run, nothing through a screen
reader. Measured is not audited — unmet across the whole project.

---

## 8. Pages

| Page | What it is for |
|---|---|
| `index.html` | Who it is for and when, the shop, and what the card does |
| `cakes.html` | The range, browsable by occasion |
| `cake.html` | One cake: size, flavour, finish, inscription, add-ons, the day |
| `card.html` | **The signature.** Write the card; see it set |
| `cart.html` | The basket, each line with its card |
| `checkout.html` | Collect or deliver, you, simulated payment |
| `confirmation.html` | The order, and the offer to keep the date |
| `styleguide.html` | Every component against awkward content, contrast measured live |
| `404.html` | |

## 9. Commercial hypotheses, stated as hypotheses

Per §6 and §11. None of these is a claim.

1. Showing the card set in the hand, before the basket, reduces the number of orders
   whose message is edited or apologised for after purchase. *Measure: post-purchase
   amendment requests per 100 gift orders.*
2. A line-budget warning before checkout reduces abandonment at the message field relative
   to a character counter. *Measure: field-level abandonment, A/B.*
3. A kept date brings a buyer back for the same occasion the following year. *Measure:
   repeat rate at 12 months among customers who kept a date versus those who did not.
   This one needs a backend; the template can only demonstrate the interaction.*

## 10. Running it

```bash
python devserver.py 4330 .
```

Then `http://localhost:4330/templates/03-romantic-boutique/index.html`.
