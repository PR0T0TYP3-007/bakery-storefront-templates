# Adding templates six and seven: a rule we need to change, and why

**For:** Covenant
**From:** the build team
**Date:** 22 October 2026
**Decision needed:** none — this explains a change already validated. Flag it if you disagree.

---

## The short version

The two new templates can be built, and they will look like Barcelona and like Franco-Ontario
rather than like each other. But getting there meant changing a rule we put in place after
your note on Template 05, because at seven templates that rule had started doing the opposite
of its job.

Nothing already delivered changes. All five shipped templates still pass, by the same margins
as before.

---

## What the rule was, and why

After your note — *"looks good in style but it seems similar to the spirit of the first one"* —
we stopped treating "do these look different?" as a matter of opinion and made it a
measurement. Before a template gets any design work, four things are fixed and compared
against every template already built:

1. **Ground colour** — the dominant background
2. **Display type class** — serif, grotesque, rounded, and so on
3. **Accent colour**
4. **Separation method** — how the page divides one thing from another: rules, cards,
   apertures, overlap

The rule was that **all four** had to differ by a set amount. Colour distance is measured
numerically, so "different enough" stopped being arguable.

It worked. Your note was correct and measurable: Template 01 and the first Template 05 had
grounds **25 units apart** on a scale where everything else in the set is over 190. They were
also both serif, both muted earth accents, and both separated by thin rules. They matched on
**all four axes**, which is exactly why they read as one shop.

---

## What went wrong at seven

Before designing anything for Barcelona or Franco-Ontario, we searched the entire colour space
for accent colours that would satisfy the existing rule. This is what is left:

| Colour family | Accents still available |
|---|---|
| Red, rust | **none** |
| Orange, amber | **none** |
| Yellow | **none** |
| Green | **none** |
| Teal | **none** |
| Crimson | **none** |
| Blue | 3 |
| Violet | 3 |
| Magenta, pink | 65 |

The warm end of the spectrum is used up — which is a problem, because that is where bakeries
live. Specifically:

- Barcelona's **terracotta** sits 106 units from Template 01's clay. Rule says no.
- Franco-Ontarian **maple amber** sits 97 from the same colour. No.
- **Ochre**, **currant**, **barn red**: all no.
- Even the **Franco-Ontarian flag green** fails — it is too close to Template 04's near-black
  ground.

Under the old rule, the only colours available to a Catalan bakery and a Franco-Ontarian one
were magenta, navy and violet. Neither culture has any claim to those.

**So the rule had begun preventing the thing it was written to protect.** You asked for
templates that don't share a creative identity. The rule was about to force two of them to
adopt a palette belonging to neither culture — which produces its own kind of sameness:
designs whose colours were picked by arithmetic.

---

## What we changed

Every **pair** of templates must now differ decisively on **at least three of the four axes**,
and **the ground must always be one of them**.

The reasoning comes straight from your original note. The problem with Template 01 and
Template 05 was never one axis — it was that they matched on **all four at once**. Sharing a
single axis out of four does not produce "the same spirit". Sharing four does.

The ground stays non-negotiable because it is the axis your note was actually about, and it
covers more of the screen than everything else combined.

---

## How we know it is safe

Three checks, all reproducible from the code:

**1. Nothing already delivered is weakened.** All ten existing pairs still differ on **4 of 4**.
The amendment costs you nothing you have already seen.

**2. It still catches the original problem.** Running Template 01 against Template 05 *as it
was first built* — the pair that prompted your note — scores **0 of 4** and is rejected. A
replacement rule that let the original mistake through would be worthless, so this was the
test it had to pass first.

**3. The new templates fit.** All 21 pairs across seven templates pass. The tightest are
Template 01 vs 06 and Template 05 vs 07, each sharing only the accent, while differing
decisively on ground, type and separation.

---

## What this buys the two new templates

**Template 06 — Barcelona.** A cobalt-blue ground taken from the city's hydraulic floor tiles,
with **terracotta** as the accent. The terracotta sits 106 from Template 01's clay, which the
old rule forbade — but the two templates are 459 apart on the ground, use unrelated type and
separate their content in completely different ways. Nobody will confuse a blue Catalan
café-bakery with a cream Brooklyn catalogue.

**Template 07 — Franco-Ontarian.** A wheat-gold ground with **wild blueberry** as the accent —
a genuine Northern Ontario staple, and *tarte aux bleuets* is a real Franco-Ontarian dessert.
It clears every existing accent by a wide margin and sits 238 from Barcelona's terracotta, so
the two new templates do not drift toward each other either.

---

## One thing to be aware of

At seven templates the colour space is close to full even under the amended rule. An eighth
template would need this conversation again, and the honest answer then may be that the set is
complete. Better said now than discovered later.

---

## Also worth knowing

Two details from the research changed what these templates should be:

- **Barcelona bakeries write in Catalan, not Spanish.** Forn Baluard's site is entirely
  Catalan. A template that gets this wrong would read as a tourist's idea of Barcelona.
- **The butter tart descends from the tarte au sucre** — French settlers in New France adapted
  sugar pie using maple. They are relatives, not translations. That relationship is the
  strongest idea available to Template 07 and it is not available to a Parisian pâtisserie,
  which is the other way "French Ontarian" could have been read.

Full technical reasoning, with the numbers, is in `docs/decisions.md` under D23.
