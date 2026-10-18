# Template 03 — The Romantic Boutique

**Postscript**, Bartlett Street, Bath. A cake shop that writes on things.

A static storefront: plain HTML, CSS and native ES modules. No framework, no build step,
no backend. Open the files and they run.

The concept, the research and the art-direction reasoning are in
[`docs/03-romantic-boutique.md`](../../docs/03-romantic-boutique.md).

---

## The thing worth looking at

`card.html`. You write to somebody and the card sets itself as you type — A6 folded, in
the hand it will be written in, broken where the pen will break it. It counts **lines, not
characters**, writes smaller before it refuses, names the word that is too wide for the
stock, and reports the characters a pen cannot make instead of dropping them.

Research found this is the gap. Three real shops sell cakes whose entire purpose is to
carry a message, and all three take the message as a text input:

- [Konditor](https://konditor.co.uk/collections/personalised-cakes) — *"Add your message at
  checkout and we'll pipe it by hand, with care and a flourish."* A 120-character counter.
  No preview anywhere.
- [Cutter & Squidge](https://www.cutterandsquidge.com) — the note is not part of the order.
  You buy, then go to a separate page, enter your order number and postcode, and type it,
  **within one hour** or it ships with nothing.
- [Patisserie Valerie](https://www.patisserie-valerie.co.uk/collections/valentines-day) —
  inscription and an optional gift card at checkout, both plain inputs.

A counter tells you that you have room. It does not tell you that your message lands on
four lines and the card holds three.

---

## Running it

From the repository root:

```bash
python devserver.py 4330 .
```

Then `http://localhost:4330/templates/03-romantic-boutique/index.html`.

Any static server works, but `devserver.py` sends `Cache-Control: no-store`, which this
project needed after browser caching repeatedly served modules that no longer existed.

## Tests

```bash
npm test
```

28 tests under Node's built-in runner — no framework, nothing installed. They cover the
claims the page makes to the customer: that the preview breaks where the pen breaks, that
no produced line is wider than the measure, that a card which does not fit says how many
characters to cut *and that cutting exactly that many makes it fit*, that writing smaller
is tried before anything is refused, that accents are writable and emoji are reported
rather than dropped, and that a merchant with different stock gets a different card.

---

## Layout

```
03-romantic-boutique/
├── index.html            who it is for, the shop, and what the card does
├── cakes.html            the range, browsable by occasion
├── cake.html             one cake: size, flavour, finish, add-ons, the day
├── card.html             the signature — write the card, see it set
├── cart.html  checkout.html  confirmation.html
├── styleguide.html       every component, contrast and targets measured live
├── 404.html
├── css/
│   ├── tokens.css        the only file holding a raw value
│   ├── base.css  layout.css
│   └── components/       chrome, controls, cake, letter, overlay
├── js/
│   ├── card.js           the typesetting model — pure, DOM-free, tested
│   ├── services/
│   │   ├── api.js        the one module that touches data — the swap seam
│   │   └── session.js    four lines; the logic is in shared/session.js
│   ├── components/       cardpreview, cakes, chrome, kept, datepicker, toast, icons
│   └── pages/            one entry module per page
├── data/                 merchant and catalogue JSON
├── assets/fonts/         Julius Sans One, Petit Formal Script, Karla — 76KB total
└── tests/card.test.js
```

Dates, money, cart, option rules and fulfilment come from
[`shared/core/`](../../shared/core/); the stateful layer from
[`shared/session.js`](../../shared/session.js). Both are shared with Templates 02, 04 and
05. `card.js` is deliberately **not** shared — see decision D12's rule, applied again.

---

## The design rules

Nothing in this template is separated by a rule, a box, a card or a shadow. Content is cut
out of the ground into **arch-topped and oval apertures** and text is set to a narrow
measure with wide margins, the way a letter is. Form fields are **underlined, not boxed**.

Three faces, three jobs, and one rule that matters: **the script is diegetic.** Petit
Formal Script appears only inside a depiction of handwriting — the card, the piped
plaque — and never in the interface. That is the difference between this and the stock
bakery theme that sets its navigation in a script.

One rule held throughout, borrowed from Template 04 because it was right: **experiment
with composition and typography, never with interaction.** The card page is unusual; the
checkout is completely ordinary.

## Swapping in a real backend

Everything that touches data is in `js/services/api.js`. Every function is already `async`
and returns plain JSON; replacing each body with a `fetch()` is the whole job. Shapes are
documented on each function and in [`docs/api-contract.md`](../../docs/api-contract.md).

The card travels on the line's `meta` field and is sent with the order **verbatim** — no
truncation, no normalising, no stripping. It is the one part of the payload a human will
read and copy out by hand.

Three things must move server-side in production: availability, kitchen capacity and order
placement.

## Payment

Simulated, and labelled as such on the page.

| Card | What happens |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined by the bank |
| `4000 0000 0000 0119` | Processor unreachable |

A failure keeps every field, the basket, the chosen day and every card.

---

## Known gaps

- **One merchant config.** The seam supports more; a second shop is a pair of JSON files
  and one entry in an array.
- **A kept date is this browser only.** It is `localStorage`, it cannot email anyone, and
  every surface that mentions it says so. See the concept doc §5 — the commercial case for
  it is written as a hypothesis with a measurement, not as a claim.
- **No reference image on a brief.** The card is free text; people send photographs. That
  needs an upload and a backend, so it is out of scope here and worth stating.
- **No analytics instrumentation** — unmet across the whole project.
- **No axe or Lighthouse run, and no screen-reader testing.** Contrast, target sizes and
  horizontal overflow are measured live on `styleguide.html`; everything else is built to
  WCAG 2.2 AA but not independently audited.
