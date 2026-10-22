# Template 06 — The Barcelona Forn

Concept and art direction. The client's brief is a *"spanish/barcelonan cafe feel"*; **"The
calendar decides"** is our concept for it, the way "every cake, catalogued" is Template 01's.

Merchant: **Forn de la Plaça**, Carrer de Blai, Poble-sec, Barcelona. A neighbourhood *forn*
with four marble tables, open since 1954, third generation.

---

## 1. The two things the brief gets wrong, and why they matter

**It says Spanish. Barcelona bakeries write in Catalan.** Forn Baluard's site is entirely
Catalan — *"Quatre generacions de forners han fet de Baluard una manera d'entendre el pa."*
The products are Catalan too: *Pa Barceloneta*, *Coca Llarga amb Oli d'Oliva*, *Pa de Sègol*.
A template that renders a Barcelona bakery in Spanish is a tourist's idea of Barcelona, and
anyone from the city will clock it in a second.

So this template is **Catalan first, Spanish second**, and that is not decoration — it is the
one genuinely new axis in the set. No other template has a language.

**It says terracotta, and terracotta is taken.** Measured against the shipped set, terracotta
sits 106 channels from Template 01's clay and ochre 155 from Template 04's acid. Under D8 as
originally written, neither was available (see §3 and D23 in `decisions.md`).

The resolution is not to find a terracotta that squeaks past a threshold. It is to notice that
**the tile is as Barcelona as the clay**. Hydraulic floor tiles — *rajoles hidràuliques* — are
in every old shop and flat in the Eixample, and they are blue. Making the tile the ground and
the terracotta the accent is both more accurate and the only thing that fits.

---

## 2. Research

| Shop | What it gives us |
|---|---|
| **Forn Baluard**, Barceloneta | The model. Catalan throughout, wood-fired, four generations, bread named for the neighbourhood. Voice is sensory and unhurried: *"Fem pa com s'han fet sempre les coses importants: amb temps, mans i cura."* |
| **Pastisseria Escribà** (1906) | The other end: brand-led, theatrical, Spanish-language, custom and wedding cakes — *"ilusionar, sorprender y crear momentos únicos"*. Useful as the thing this template is **not**. |
| **Foix de Sarrià** (1886), **La Colmena** | Old-world. La Colmena is noted for its *tortell de Reis*, which is the calendar in action. |

**Correction for the record:** the brief cites Hofmann as a pastry shop reference. The site at
`hofmann-bcn.com` is the **culinary school** — masters and diplomas, not cakes. The pastry
shop is a separate operation and was not reached. Do not cite the school as a pastry
reference.

---

## 3. The distance check (D23)

| | 01 | 02 | 03 | 04 | 05 | **06** |
|---|---|---|---|---|---|---|
| Ground | `#f5f1ea` cream | `#ffd84d` sun | `#86286a` plum | `#0e0e10` near-black | `#8db9a8` eucalyptus | **`#1b5e8c` cobalt tile** |
| Accent | `#8a3e2c` clay | `#6b2fd4` grape | `#ffb8c6` blush | `#ccff00` acid | `#0e7a4e` green | **`#c4603a` terracotta** |
| Type class | serif | rounded geometric | incised capitals | expressive | grotesque | **humanist slab / signpainter** |
| Separation | hairline rules | drawn outline | masked apertures | overlap + bleed | ruled rows on paper | **tiled modules on a painted panel** |

Ground clears every shipped ground (closest: 195 from plum). Accent clears three of five
outright; against Template 01's clay it is 106, which **D23 permits because the pair differs
decisively on the other three axes** — ground 459 apart, different type class, different
separation. A cream Brooklyn catalogue and a cobalt Catalan *forn* will not be confused.

Full pair table and validation in `docs/for-client-distance-rule.md`.

---

## 4. The signature: the calendar decides what is on the shelf

Every other template in the set is organised by **product**. This one is organised by **date**,
because that is how Catalan baking actually works. The sweets are not seasonal in the vague
sense of a pumpkin latte — they are attached to named days, and on the day before, every
*forn* in the city is making the same thing.

Verified calendar ([Meet Barcelona](https://meet.barcelona.cat/en/discover-barcelona/live-barcelona/food-and-drink/barcelona-pastry),
[Time Out Barcelona](https://www.timeout.com/barcelona/shopping/7-traditional-holiday-desserts-in-barcelona),
[Barcelona Metropolitan](https://www.barcelona-metropolitan.com/api/amp/eating-and-drinking/autumn-treats/)):

| When | What | Note |
|---|---|---|
| 6 January | **Tortell de Reis** | Marzipan ring. A figurine and a dry bean are hidden inside |
| 17 January | **Tortell de Sant Antoni** | Saint's-day ring |
| Dijous Gras | **Coca de llardons** | The last excess before Lent |
| Lent | **Bunyols de Quaresma** | Sugared fritters |
| 19 March | **Crema catalana** | Sant Josep |
| Easter | **Mona de Pascua** | Given by godparents to godchildren. Hard-boiled eggs on top |
| 23 June | **Coca de Sant Joan** | Revetlla — bonfires on the beach. Candied fruit and pine nuts |
| 31 Oct – 1 Nov | **Panellets** | Tots Sants. Marzipan, pine nuts |
| Christmas | **Neules i torró** | |

**What the mechanic actually is.** The home page leads with *what is on the bench this week*
and *what is coming*, with the number of days until it. Order a tortell in March and the shop
says plainly that it is a January cake and offers the date it returns. The calendar is in
merchant config, so a second merchant keeps their own days — a Valencian shop would swap
Sant Joan for Falles.

**Why it is not Template 05's "today".** Template 05 asks *is it baked yet, this morning*: a
24-hour window on an everyday product. This is a 12-month wheel on a product that genuinely
does not exist out of season. One is a stock question, the other is a cultural one, and the
interfaces look nothing alike — 05 is a ruled board of today's bread, this is a year you can
scroll.

**Why it is not Template 02's occasions.** Template 02 asks *what is it for* — birthday,
new baby — which is about the buyer's life. This is about the city's calendar, which is the
same for everybody and is not a filter but a schedule.

---

## 5. Art direction

**The ground is a tile.** Cobalt `#1b5e8c`, taken from *rajoles hidràuliques*. The separation
method is **tiled modules on a painted panel**: content sits in square and half-square cells
that butt against one another with no gutter, the way floor tiles do, over a flat painted
field. No rules, no cards, no shadows — the join between two tiles is the division.

A **repeating four-tile pattern unit** drawn in CSS (not an image) runs as a band at section
boundaries. Hydraulic tiles are geometric and repeat in fours; this is the one decorative
element and it is structural, not applied.

**Type.** A humanist slab or signpainter face for display — Barcelona's shopfronts are
hand-lettered, and a *forn* sign is painted, not typeset. This is the one type class the set
does not have: 01 serif, 02 rounded geometric, 03 incised, 04 expressive, 05 grotesque.

**Terracotta and ochre are the warm marks** — prices, the day's name, the "ready" state —
against the cobalt. Marble white for the counter surfaces that hold text.

**Photography.** Interiors as much as product: the marble counter, the tiled floor, the
tables. The brief says "a place you sit in, not just buy from", and the way to show that is to
show the room. **This template must have its own photographs** — see the open photography item
in `handover.md`; it is the fault the client already raised about the existing five.

**What it must not become.** Not candy-bright — that is Template 02. Sun-faded, flat, warm.
Not Gaudí: no mosaic trencadís, no melting curves. Modernisme enters as geometry and tile,
not as pastiche.

---

## 6. Voice: the shopkeeper who assumes you know

The five existing narrators are curator (01), party host (02), confidant (03), provocateur
(04), neighbour (05). This one is **the shopkeeper who assumes you already know what a mona
is** — and explains it only if you ask.

That is a real Catalan register: unhurried, slightly dry, no selling. It also solves the
bilingual problem elegantly. Catalan terms are used plainly and unglossed; an English or
Spanish gloss appears on demand, not inline. A tooltip, not a parenthesis.

Sentences are short. Nothing is described as artisanal, authentic or traditional — a shop open
since 1954 does not need to claim it.

---

## 7. Accessibility and the language question

- Every page sets `lang="ca"`; glossed terms use `<span lang="es">` / `<span lang="en">` so a
  screen reader switches voice rather than reading Catalan with an English one.
- The glossary is a `<dfn>`/`<details>` pattern, keyboard-reachable, not a hover tooltip.
- Cobalt ground carries white at 6.94:1. Terracotta is a **panel colour, not body text on
  the ground** — the same rule Template 05 arrived at, and for the same measured reason.
- The tile pattern band is `aria-hidden` and decorative.
- Calendar dates get `<time datetime>`.

---

## 8. Pages

Same nine as the rest of the set: index, shop (*la botiga*), product, cart, checkout,
confirmation, visit, FAQ, 404, plus the style guide.

The shop page is organised **by the wheel of the year first**, with an "everything we make
every day" section beneath it — bread, *xuixos*, *crema catalana*.

---

## 9. Open questions

1. **Merchant name and street** are provisional. Poble-sec and Carrer de Blai are real and
   plausible for a neighbourhood *forn*; confirm nothing collides with a real business before
   shipping.
2. **How far to take Catalan.** Current plan is Catalan nouns for products and sections,
   English for interface verbs, so the template is usable by a reviewer who reads neither.
3. **Does the calendar need a merchant without one?** The config should degrade to a plain
   shop if a merchant supplies no calendar, as Template 04 degrades without past work.
