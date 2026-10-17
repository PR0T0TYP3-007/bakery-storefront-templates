# Template 01 — where it came from

Written so the design direction can be defended rather than just asserted.

---

## The short answer

Template 01 is **not modelled on an existing bakery website**, because there is barely
anything to model it on. The direction came from three places:

1. **A gap found in the award record** — the commercial argument.
2. **One directly studied reference** — Bernice Bakery, the only award-recognised bakery
   storefront we could find.
3. **A convention borrowed from outside the category** — the art-book / auction catalogue,
   which is where the plate numbers, makers and provenance come from.

---

## 1. The gap — the strongest thing to lead with

We searched the Awwwards archive for bakery and patisserie work.

**There is no bakery Site of the Day.** The category ceiling is an Honorable Mention.

| | |
|---|---|
| [Bernice Bakery](https://www.awwwards.com/sites/bernice-bakery) — Casa Media, 28 Feb 2025 | Honorable Mention. Jury scores 6.90–9.20, averaging ≈7.8 |
| [The Bakery](https://www.awwwards.com/sites/the-bakery) — grove lust | Honorable Mention, and it is a design agency, not a bakery |

Everything else surfacing under "best bakery websites" is a listicle
([Colorlib](https://colorlib.com/wp/bakery-websites-design/),
[Site Builder Report](https://www.sitebuilderreport.com/inspiration/bakery-websites)),
not an award.

**Why this matters commercially:** the brief asks for work that earns admiration from
excellent designers. In most retail categories that means beating a very high bar. Here it
means clearing roughly 7.8 in a field nobody has won. That is a genuinely favourable
position, and it is a verifiable fact rather than a designer's opinion.

If challenged — *"how do you know we can stand out?"* — this is the answer.

---

## 2. The one reference actually studied

[bernicebakery.com](https://bernicebakery.com) (Montreal; a custom Shopify theme). We
opened it and went through it rather than looking at a screenshot. Four things were worth
taking, and all four are in Template 01:

| Observed | Where it ended up |
|---|---|
| Oversized type set **directly on** full-bleed photography — no card, no scrim box | The hero: `Every cake, catalogued.` at ~13vw on the ganache photograph |
| Ingredient tags stacked **above** the product name — looks like art direction, is actually merchandising | Became plate number + maker + provenance metadata |
| Inline add-to-cart with a stepper **on the card** — no page round-trip | The Quick add control, serving the brief's "express buyer" |
| Press quotes as a looping marquee instead of a testimonial grid | The press band, restyled as a static ruled grid |

What we deliberately did **not** take: Bernice is playful and animation-forward (its award
cites a "cookie crumbs" interaction). Template 01 is the premium, restrained direction —
and the brief explicitly rejects "excessive animations that slow down purchasing".

---

## 3. The borrowed convention — and the honest bit

The organising idea, **"every cake is catalogued"**, is not from a bakery site. It is
lifted from how art books and auction houses present objects: a **plate number**, the
**maker**, the **year**, a short **provenance** note. Phaidon-style monographs and auction
lot numbering are the mental reference.

Applying that to cakes does three things at once:

- It makes each cake read as a considered object rather than a product tile, which is the
  premium perception the brief asks Template 01 for.
- It is a real navigation and ordering system — the catalogue is sequenced by plate number.
- It gives the typography a job, which is what stops it being decoration.

**To be straight about it:** this is synthesis, not something copied. There is no single
site this was modelled on. If someone asks "which site is this based on?", the accurate
answer is *none — it applies an art-catalogue convention to a category that has never used
one*.

---

## 4. Supporting research

Typography and texture direction, from 2026 trend surveys
([Figma](https://www.figma.com/resource-library/web-design-trends/),
[Envato](https://elements.envato.com/learn/web-design-trends),
[Line25](https://line25.com/articles/web-design-trends-2026/)): oversized editorial serifs
returning, **text-led heroes replacing stock-photo heroes**, film grain as a brand layer,
and — usefully — a correction *against* decorative scroll animation toward motion that
does a job. That last point matches the brief's own rejection criteria.

Commerce and usability decisions came from Baymard Institute, not from taste:

- [Delivery date over shipping speed](https://baymard.com/research-articles/shipping-speed-vs-delivery-date) — 41% of benchmarked sites fail to show a delivery date.
- [Checkout UX 2025](https://baymard.com/research-articles/current-state-of-checkout-ux) — show a cutoff as a **countdown**, not a static time.
- [Date picker examples](https://baymard.com/ecommerce-design-examples/date-picker) — a picker that does not communicate availability sends shoppers out of the flow to verify it.

Occasion-first navigation came from the UK retailers that already do it well —
[Konditor](https://konditor.co.uk/), [Cake Box](https://www.cakebox.com/celebration-cakes/by-occasion/birthday),
[Bettys](https://www.bettys.co.uk/cakes) — because people arrive with an event, not a flavour.

---

## 5. The typography, if asked

- **Instrument Serif** for display — high contrast, editorial, and not one of the
  defaults (not Playfair, not Didot). Set oversized so the page has real scale contrast.
- **Inter** for interface text.
- **IBM Plex Mono** for plate numbers, labels and availability. This is the single
  strongest signal that the page is a *catalogue* rather than a *shop*, and it is doing
  the most work for the least money.

---

## 6. What we have not done

Worth saying before someone else does:

- No competitive teardown of the major Shopify bakery themes.
- No merchant interviews, and no usability testing — none is possible at this stage, so
  the commercial reasoning is written as hypotheses with a test plan, not as claims.
- The 7.8 Awwwards average is from a jury of 15 of 21 members on a single project; it
  indicates the category ceiling, it is not a statistical result.
- Photography is Unsplash stock standing in for merchant photography. Template 01 is the
  most photography-dependent of the five, so this is its largest untested risk — the brief
  explicitly rejects designs that only work with perfect demonstration content.
