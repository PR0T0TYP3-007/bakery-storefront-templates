# Template 04 — The Contemporary Creative Studio

**FOLD**, Berlin. A cake studio that prices commissions on the page.

A static storefront: plain HTML, CSS and native ES modules. No framework, no build step,
no backend. Open the files and they run.

The concept, the research and the art-direction reasoning are in
[`docs/04-creative-studio.md`](../../docs/04-creative-studio.md).

---

## The thing worth looking at

`commission.html`. Scale, how far it is taken, which of the studio's nine techniques
belong on it, a palette direction and a day — and a firm price, live, with its arithmetic
shown. Taking the same brief from Clean to Editorial moves it from €720 to €2,262, because
ambition multiplies the scale rather than adding a fixed sum.

The output is a typeset spec sheet with the price at display scale. It prints.

Research found the artistic end of this market has **no transactional storefront at all**.
[ECBG Studio](https://www.ecbgstudio.com/custom-inquiry) takes an enquiry and quotes
later; [Yevnig](https://yevnig.com/contact-yevnig/) asks you to pick a budget *band* and
books a consultation. Neither lets you buy.

---

## Running it

From the repository root:

```bash
python devserver.py 4330 .
```

Then `http://localhost:4330/templates/04-creative-studio/index.html`.

Any static server works, but `devserver.py` sends `Cache-Control: no-store`, which this
project needed after browser caching repeatedly served modules that no longer existed.

## Tests

```bash
npm test
```

20 tests under Node's built-in runner — no framework, nothing installed. They cover the
claims the page makes to the customer: that the lines sum to the quote, that ambition
multiplies, that lead time is additive because one person builds the whole piece, that the
deposit and balance account for the whole total, and that an unknown option falls back
rather than crashing a quote.

---

## Layout

```
04-creative-studio/
├── index.html            the claim, the gap, work, the technique vocabulary
├── commission.html       the brief, and the spec sheet it produces
├── work.html             commissions pitched, editions listed
├── piece.html            one edition
├── cart.html  checkout.html  confirmation.html
├── styleguide.html       every component, contrast measured live
├── 404.html
├── css/
│   ├── tokens.css        the only file holding a raw value
│   ├── base.css  layout.css
│   └── components/       chrome, controls, piece, sheet, overlay
├── js/
│   ├── commission.js     the pricing model — pure, DOM-free, tested
│   ├── services/
│   │   ├── api.js        the one module that touches data — the swap seam
│   │   └── session.js    four lines; the logic is in shared/session.js
│   ├── components/       specsheet, pieces, chrome, datepicker, toast, icons
│   └── pages/            one entry module per page
├── data/                 merchant and catalogue JSON
├── assets/fonts/         Syne and Archivo, latin subsets, 70KB total
└── tests/commission.test.js
```

Dates, money, cart, option rules and fulfilment come from
[`shared/core/`](../../shared/core/); the stateful layer from
[`shared/session.js`](../../shared/session.js). Both are shared with Templates 02 and 05.
`commission.js` is deliberately **not** shared — see decision D12.

---

## The design rules

Nothing in this template has a border radius, a shadow or a gradient. Separation is
positional: a visible twelve-column grid, sections that bleed past the measure, and
elements that overlap. One accent colour; the work supplies the rest.

One rule held throughout: **experiment with composition and typography, never with
interaction.** The brief rejects "beautiful interfaces that are difficult to navigate",
so the commission page is unusual and the checkout is completely ordinary.

## Swapping in a real backend

Everything that touches data is in `js/services/api.js`. Every function is already `async`
and returns plain JSON; replacing each body with a `fetch()` is the whole job. Shapes are
documented on each function and in [`docs/api-contract.md`](../../docs/api-contract.md).

Three things must move server-side in production: availability, studio capacity, and order
placement. A quote the customer can edit is not a quote.

## Payment

Simulated, and labelled as such on the page.

| Card | What happens |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declined by the bank |
| `4000 0000 0000 0119` | Processor unreachable |

A failure keeps every field and the whole basket.

---

## Known gaps

- One merchant config. The seam supports more.
- Two editions rather than three — see decision D16.
- No analytics instrumentation — unmet across the whole project.
- No axe or Lighthouse run, and no screen-reader testing. Contrast, target sizes and
  horizontal overflow were measured during the build; everything else is built to WCAG
  2.2 AA but not independently audited.
