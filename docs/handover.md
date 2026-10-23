# Handover

**Purpose.** A session can end mid-task — a usage limit, a new account, a different machine.
This file is what the next session reads first so it knows what exists, what was decided and
why, and what to do next. Keep it current: update it when a decision is made, not when the
work finishes.

**Last updated:** 22 October 2026, after the Template 02 syntax incident and before starting
Templates 06 and 07.

---

## 1. What this project is

Five storefront templates for independent cake and bakery businesses, built from a client
brief at `docs/brief.pdf`. Two more (06 and 07) are now requested. The brief rejects "five
designs that share essentially the same creative identity", which is the single constraint
that shapes most decisions here.

Plain HTML, CSS and vanilla JS. Native ES modules, no framework, no build step inside a
template. `build.mjs` assembles `dist/`.

| | Template | Merchant | Concept |
|---|---|---|---|
| 01 | Editorial Atelier | Crumb Atelier, Brooklyn | Every cake, catalogued |
| 02 | Playful Celebration | Many Happy Returns, Margate | Draw the cake, we bake that one |
| 03 | Romantic Boutique | Postscript, Bath | Written by hand |
| 04 | Creative Studio | FOLD, Berlin | Priced on the page |
| 05 | Neighbourhood | Hazel & Rye, London | The Counter |

---

## 2. How to run, test and ship

```bash
# dev server (the browser pane's launch.json also starts this)
python devserver.py 4321

# every suite — 203 tests across five directories
node --test tests/*.test.mjs
node --test "templates/0X-name/tests/"*.test.js

# build exactly as CI does
node build.mjs --base "/bakery-storefront-templates/"

# regenerate the gallery screenshots after ANY visual change
node tools/previews.mjs
```

Deploy is **GitHub Actions → GitHub Pages** (`.github/workflows/deploy.yml`), on push to
`main`. `docs/deploy-cloudflare.md` is stale and describes a path that is not used — delete
or mark it.

Live: `https://pr0t0typ3-007.github.io/bakery-storefront-templates/`

---

## 3. Things learned the hard way

Each of these cost real time or shipped a defect. Do not re-learn them.

| Trap | What happens | Guard |
|---|---|---|
| **Apostrophe in a single-quoted JS string** | Module never parses, page renders as a stub, and it ships green because nothing parsed it | `tests/syntax.test.mjs` runs `node --check` over all 99 scripts. **It does not cover inline `<script>` in HTML.** |
| **`loading="lazy"` above the fold** | Invisible on localhost, seconds of empty boxes on a real network | Measure each lazy image's box against the viewport; don't judge by position in the file |
| **Testing source but never `dist/`** | A build-only or network-only defect reaches production | Open `dist/` in a browser before pushing anything visual |
| **ES module HTTP caching** | A fixed file looks broken for up to 10 minutes; GitHub Pages sets `max-age=600` | Verify with headless Chrome and a **fresh `--user-data-dir`**, not the browser pane |
| **Headless screenshots missing images** | Images inside clipped/transformed boxes render blank, identically every run | `--run-all-compositor-stages-before-draw` (already in `tools/previews.mjs`) |
| **Stale preview screenshots** | The gallery advertises designs that no longer exist; went nine commits unnoticed | `node tools/previews.mjs`, every visual change |
| **`grid-column: span N` + `.start-M`** | Element silently spans one column | Use `grid-column-end: span N` |
| **`max-width:100%` without `height:auto`** | `width`/`height` attributes become real heights and silently disable `aspect-ratio` | Already fixed in 04's base.css; check when adding templates |

**Verification routine that actually catches things**, run before any push:
1. All suites pass, `node build.mjs` succeeds.
2. Contrast sweep over every page × every merchant: `tools/contrast-sweep.js`. It used to
   live in session history, which meant it was rewritten each time and got rewritten wrong
   at least once. Run it in the page:

   ```js
   fetch('/tools/contrast-sweep.js').then(r => r.text()).then(eval);
   __contrastSweep();   // [] is the pass
   ```

   It composites every translucent ancestor background, and it parses `oklab()` — Chrome
   serialises `color-mix(in oklab, …)` that way, and a naive number-grab reads it as black
   and invents failures.
3. Phone width (375) and desktop (1320) — overflow and sideways scroll.
4. `dist/` opened in a browser.
5. Previews regenerated.

---

## 4. The design rules that bind

Full reasoning in `docs/decisions.md` (D1–D22). The ones that constrain new work:

- **D8 — the distance check.** Before a template gets any CSS, four axes are fixed and
  compared against every shipped template: **ground colour, display type class, accent
  chroma, separation method.** All four must differ. Ground distance is summed absolute RGB
  channel distance; the working floor is **190** (01 vs 02 shipped at 192).
- **D13 — measure claims or don't make them.** Style guides compute their contrast tables
  live from the tokens.
- **D16 — photography never lies about the product.** A "Number Cake" showing a cake with no
  number on it is a bug, not a placeholder.
- **D22 — a card by another name is still a card.** The test is what a shape is made of, not
  what the author intends it to mean.

**Separation methods already taken:** 01 hairline rules + cards · 02 drawn outlines + offset
shadow · 03 masked apertures on uninterrupted ground · 04 overlap, bleed, visible grid ·
05 ruled rows on paper pinned to a painted wall.

**Display type classes already taken:** serif (01) · rounded geometric (02) · incised capitals
(03) · expressive/quirky (04) · grotesque (05).

---

## 5. Where the five stand

Recently completed: per-template narrators, the copy rewrite with `docs/copy-references.md`,
05's palette rebuilt on one hue, 05's hero band and morning band, 04's hero commission,
03's letter garden.

**Open, not started:**

1. **Photography is shared across templates.** 12 images appear in more than one; three appear
   in three. **Templates 01 and 02 have no exclusive images at all** — all 18 of their photos
   are used elsewhere. Needs ~25 new images (01: 10, 02: 8, 05: 7) at three widths each.
   Reported externally as making "five brands feel like one shop". User deferred this.
2. **04's composition** is still headline-left / image-right on a regular grid; the brief asks
   for experimental composition.
3. **02's "Number Cake"** shows a cookies-and-cream cake with no number — a D16 violation,
   fixable only with a new photo, so it is blocked on item 1.
4. **01's press quotes** are now placeholders reading "Press quote — replace". Deliberate:
   they previously carried invented quotes credited to The New Yorker, Cherry Bombe, Eater NY
   and Kinfolk, which is a false-endorsement liability in a template a merchant ships.
5. **`docs/04-creative-studio.md` cites Yevnig**, whose page now 404s. Noted in
   `docs/copy-references.md` §7.

---

## 6. Templates 06 and 07 — the new work

### 6.1 The request

From the client (Slack, 22 Oct): two more templates — *"a spanish/barcelonan cafe feel to it
and a traditional french onatarian feel"*.

### 6.2 RESOLVED — 07 is Franco-Ontarian heritage baking

"Onatarian" is almost certainly **Ontarian**, which has two readings:

- **Reading A — Franco-Ontarian.** French-Canadian heritage baking: sugar pie, butter tarts,
  tourtière, maple. Homely and rural, bilingual French/English.
- **Reading B — a classic French *pâtisserie* located in Ontario.** Baguettes, croissants,
  éclairs.

**Confirmed 22 Oct: Reading A.** Sugar pie, butter tarts, maple, bilingual. Reading B was
rejected because an elegant French pâtisserie is Template 01 in different clothes.

### 6.3 THE BINDING CONSTRAINT: the palette space is nearly full

This was measured, not guessed, and it is the most important fact for planning both templates.

**Every colour the brief names for both templates is already taken:**

| Brief colour | Nearest shipped ground | Distance | Verdict |
|---|---|---|---|
| terracotta `#c96f4a` (06) | 02 sun | 162 | ✗ |
| ochre `#d99a3c` (06) | 02 sun | 117 | ✗ |
| Mediterranean blue (06) | 04 near-black | 120 | ✗ |
| tile blue `#2a6f97` (06) | 05 eucalyptus | 190 | borderline |
| maple amber `#b5651d` (07) | 03 plum | 185 | ✗ |
| warm cream `#f3ead8` (07) | 01 cream | **27** | ✗ |
| enamel blue `#2e5d6b` (07) | 03 plum | 142 | ✗ |
| forest `#2f4f3e` (07) | 04 near-black | 144 | ✗ |

Sweeping all hues at believable saturation (12–55%) and requiring the ground to carry text,
**only four families survive at all**: green (05's), teal, blue, and a sliver of magenta.
**Nothing remains in red, rust, orange, amber, yellow, olive, violet or crimson.** Every
survivor also sits at the top of the saturation range — muted versions do not clear 190.

**And 06's choice constrains 07:**

| If 06 takes | grounds left for 07 |
|---|---|
| teal `#27827c` | 18 — olive and magenta only |
| tile blue `#2a6f97` | 57 — including olive/mustard `#a88a2e` |
| indigo `#3f55c6` | 296 — roomiest |

### 6.3b RESOLVED — D8 amended as D23 (22 Oct)

The measurement showed the palette space was full: no accent at all remained in red, rust,
orange, amber, yellow, green, teal or crimson, and every warm accent both briefs imply is
taken (terracotta 106 from Template 01's clay, maple amber 97, currant red 30).

**D8 is replaced by D23** (see `docs/decisions.md`): every pair must differ decisively on at
least **three of four axes**, with the **ground always one of them**, plus a hard floor of 90
on accent-to-accent distance. Validated three ways — no shipped pair weakened (all still
4/4), the pair that caused the original complaint still rejected (0/4), and all 21 pairs
across seven templates pass.

`docs/for-client-distance-rule.md` is the write-up to send Covenant.

**Agreed palettes:**

| | Ground | Accent | Type class | Separation |
|---|---|---|---|---|
| 06 Barcelona | cobalt tile `#1b5e8c` | terracotta `#c4603a` | humanist slab / signpainter | tiled modules + painted panel |
| 07 Franco-Ontarian | wheat gold `#a88a2e` | wild blueberry `#3f3a7d` | condensed grotesque / enamel | stacked enamel plates + rule |

Tightest pairs: 01 vs 06 and 05 vs 07, both 3/4, sharing only the accent axis. Type class and
separation method above are **provisional** — they satisfy the rule but have not been designed
yet.

### 6.4 Proposed direction (to confirm)

**Template 06 — Barcelona.** Make the *tile* the ground rather than the terracotta. Barcelona's
hydraulic floor tiles and Mediterranean blue are as authentic as the clay, and blue is one of
the few families left. Terracotta and ochre then become **accents**, where the distance rule
is against other accents — a far less crowded space. This is the same move that rescued
Template 05: the brief's obvious colour was unavailable, so the identity came from the next
most authentic thing.

**Template 07 — Franco-Ontarian (pending confirmation).** Olive/mustard-gold `#a88a2e` is the
one warm family that survives, and it reads as wheat, maple syrup and enamel-era kitchenware —
appropriate rather than a compromise. It survives all three of 06's candidate grounds, so it
is the safe second pick whichever way 06 goes.

**Order of work: decide 06's ground first**, because it removes options from 07.

**A real risk to raise with the client:** at seven templates the set is close to exhausting
the colour space that D8's floor of 190 allows. An eighth may be impossible without either
lowering the floor or amending D8 to let a template differentiate on axes other than ground.
Worth saying out loud now rather than discovering it at Template 08.

### 6.4b CONCEPTS WRITTEN (22 Oct)

- `docs/06-barcelona-forn.md` — **"The calendar decides."** Forn de la Plaça, Poble-sec.
  Catalan-first (the brief said Spanish; Barcelona bakeries write Catalan). Organised by the
  festival year rather than by product, on a verified calendar with sources. Cobalt tile
  ground, terracotta accent, humanist slab type, tiled modules as separation.
- `docs/07-franco-ontarian.md` — **"Two names for the same tart."** Boulangerie Tremblay,
  Hearst. Built on the fact that the butter tart descends from the tarte au sucre, so the two
  names are relatives rather than translations and the language switch changes what things
  *are*, not just what they are called. Wheat-gold ground, wild blueberry accent, condensed
  enamel-sign type, stacked enamel plates as separation.

Both carry their own open questions at the end. Neither has had any code written.

### 6.5 Research still to do

Named by the client, not yet visited (visit the Instagram feeds too — they show the interiors
and tiles better than the websites):

- **Barcelona:** Pastisseria Escribà (1906, custom celebration cakes), Hofmann, Forn Baluard
  (Barceloneta, wood-fired, neighbourhood café side), Foix de Sarrià (1886), La Colmena.
- **Products to reflect:** Catalan rather than generic Spanish — xuixos, coca de llardons,
  crema catalana, ensaïmades. Festival calendar: tortell de Reis (Jan), mona de Pascua
  (Easter), coca de Sant Joan (Jun), panellets (Nov). **A pastry calendar that changes with
  the fiestas is a genuinely distinct mechanic** and no other template has a seasonal axis.
- **Ottawa:** The French Baker / Le Boulanger Français (ByWard Market, 1995), Le Moulin de
  Provence (maple leaf shortbread), Mamie Clafoutis, Art-Is-In Bakery (name deliberately
  pronounceable in both languages — a bilingual branding idea worth noting).
- **Butter tarts:** Betty's Pies & Tarts, Cobourg; Ontario has butter tart trails and
  competitions.

### 6.5b Research findings so far

**Barcelona.**
- **Forn Baluard** is the strongest reference and reveals something the brief missed: it
  writes in **Catalan, not Spanish** — "Quatre generacions de forners han fet de Baluard una
  manera d'entendre el pa." Products are Catalan: Pa Barceloneta, Coca Llarga amb Oli
  d'Oliva, Xapata, Pa de Sègol. Voice is lyrical and sensory, storytelling about family.
- **Escribà** is brand-led and aspirational — "ilusionar, sorprender y crear momentos únicos
  e irrepetibles" — and sells *pasteles personalizados* and wedding cakes. Written in Spanish.
- **Hofmann's site is the culinary school, not the pastry shop.** That reference is partly
  misdirected; the pastry shop would need finding separately.
- **The language is itself the identity.** A Barcelona bakery writing in Catalan rather than
  Spanish is authentic, immediately distinctive, and no other template has a language axis.

**Franco-Ontarian.**
- **The flag is green and white** — green for summer, white for winter, fleur-de-lys for the
  francophonie, trillium for Ontario. Designed 1975 at the University of Sudbury by Gaétan
  Gervais with students; an official emblem of Ontario since 2020. *Measured: the flag green
  fails as a ground — 142 from Template 04's near-black. Dark greens are all too close to it.*
- **The butter tart descends from the tarte au sucre.** 17th-century women in New France
  adapted French sugar pie using maple sugar; the butter tart is the English-Canadian version
  sweetened with brown sugar. The first documented recipe (Barrie, Ontario, 1900) used
  **currants, not raisins** — and the raisin question is a live cultural argument.
- **Art-Is-In Bakery** named itself so that "art-is-in" sounds like *artisan* in French — a
  bilingual pun as branding.
- **The French Baker** (Ottawa, 1995, Jérôme Mantel) writes in English with French words,
  not truly bilingually. Motto: "Keep it simple, keep it good."
- **The strongest concept available:** every item carries two names that are *not
  translations* — tarte au sucre and butter tart are relatives, not synonyms. A bilingual
  template where switching language changes what things are called *and* surfaces the
  heritage relationship is unique in the set and unavailable to a Parisian pâtisserie.

### 6.6 Voice

Both need their own narrator. The five existing ones are curator (01), party host (02),
confidant (03), provocateur (04), neighbour (05). Do **not** reach for "the small honest
bakery explaining its limits" — that voice was unintentionally applied to all five at once and
had to be unpicked. See `docs/copy-references.md` for the five AI tells that were removed and
the reference set.

---

## 6.7 Template 06 — build progress

**Started 22 Oct.** Foundation in, no pages yet.

Done:
- Directory scaffold; `js/services/session.js` and `components/toast.js` copied from 05
  (the service seam is genuinely the same, only the data files differ).
- `css/tokens.css` — full palette, every pairing measured before it was written. Two rules
  that came out of the measurement and must not be broken:
  **ink on marble, white on tile** (ink is 2.35 on tile), and
  **terracotta carries no small text in any direction** (3.80 on marble, 4.13 white on it,
  4.05 ink on it — all just under 4.5, which is the most dangerous place for a colour to be).
  The primary action therefore uses `--tile-3` with marble on it, not terracotta. `--ochre`
  is paint only.
- Fonts downloaded to `assets/fonts/`: Zilla Slab (display, slab serif — the one type class
  the set lacked) and Source Sans 3 (UI). **Not yet verified against Catalan glyphs** —
  check ç, à, è, í, ï, ú and the interpunct · render before trusting them.
- `js/year.js` — the signature. Pure, DOM-free. Easter is computed with the anonymous
  Gregorian computus because three of the shop's biggest days hang off it; hardcoding would
  be wrong every year but one, and silently.
- `data/merchant.forn-de-la-placa.json` + `products.*.json` — 11 year entries, 17 products,
  all Catalan.
- 25 tests passing: Easter against published dates 1818–2038, Dijous Gras always a Thursday,
  and config integrity (every year entry points at a product that exists — the failure mode
  is an empty shelf on one day a year that nobody notices until Sant Joan).

**22 Oct, second stretch — the home page is up and verified.**

- `css/base.css`, `css/layout.css` and the three component files
  (`chrome.css`, `calendar.css`, `controls.css`).
- `js/services/api.js`, `index.html`, `js/pages/home.js`,
  `js/components/chrome.js`, `js/components/calendar.js`.
- `tools/contrast-sweep.js` — a reusable in-page sweep (see §3). The project had been doing
  this by hand; it now lives in the repo.

Four things the build got wrong and what they cost, because each is the kind of mistake that
would otherwise be made again:

| Wrong | Why it happened | Now |
|---|---|---|
| `.tiles` sized its columns on `--tile-unit` | The tile module is 3.5–5.5rem, which is a floor tile and narrower than a word. Every product name broke one letter per line. | `--cell` (four tiles) is the content module; `--tile-unit` stays the paint module. |
| A checkerboard of alternating fills, via `nth-child(4n+2)` | `auto-fill` means the column count is unknown at authoring time, so the rhythm landed diagonally. | One surface; the **grout** (`--grout`, 2px of the panel showing through `gap`) is the whole separation method. |
| The nearest "què ve" item filled with terracotta | It is the warm colour and it looked right. It measured **4.04** for all three of its lines — the exact failure `tokens.css` bans in writing, written by the same person who wrote the ban. | Marble: in a band of tile it is the only pale thing, which is as loud as this system needs. Terracotta survives in the day label at 6.14. |
| The shop note said "two rooms and four marble tables" | Invented from an address. D13. | `voice.shop` in the merchant config; the template names nothing. |

Also fixed on the way: the footer was listing **Monday, Tuesday** on a Catalan page, because
`hours[].day` is an English key in the shared schema. `chrome.js` now treats the English name
as an index into the week and lets `Intl` say it in the merchant's locale — the data stays
English so the shared code keeps working.

Verified: contrast sweep clean at 1320 and 375, no sideways scroll at either, all 230 tests
pass, `node build.mjs` picks 06 up (44 pages).

**22 Oct, third stretch — `botiga.html` and `producte.html`.**

The shop lists the whole year, including what cannot be sold today, ordered by the calendar
rather than by the catalogue file: on the taulell now, then nearest, then everything made
every morning. Filters and search live in the URL, so a filtered shop is a link.

Three things worth knowing, because none is obvious from the code:

1. **Option prices are deltas, not sizes.** `shared/core/pricing.js` adds the chosen option's
   price to the product's own, which is how Template 05's data is written. 06's sizes were
   written as absolute prices, so a tortell cost 22 € plus the whole 22 € of its size again.
   The page showed `NaN €` instead, which hid it — `session.priceOf()` returns a `LinePrice`
   object, not a number, and `Intl` rendered the object as NaN. Two bugs, one of them masking
   the other. `mida` is now `0 / +8 / +20`, each product's `price` is its smallest size, and
   `tests/config.test.js` has three guards for the convention, proved by putting the absolute
   prices back and watching two of them fail.
   The coca de Sant Joan's default moved from the largest size to the middle: at 18 € for the
   largest, a shared ladder would have put its smallest below zero. 18 € is still the price of
   the one most people buy.

2. **The product page refuses orders it cannot take.** The forn books 30 days out
   (`maxDaysAhead`). In October a tortell de Reis is 76 days away, and `session.add()` was
   quietly putting it down for collection three days later — the shared fall-forward knows
   about lead days and capacity and has never heard of the calendar. It now says *"encara no:
   n'agafem comandes a partir del 23 de novembre"*. Inside the window, the collection day
   moves to the day the forn starts making them and `add` takes it from there.
   **This is the pattern the basket and checkout pages have to follow too** — nothing else
   stops a January tortell being collected in October.

3. **`toast.js` was rewritten, not copied.** 05's imports `./icons.js`, which this template
   does not have and should not get: a drawn tick in a circle is the one thing a system built
   on surfaces meeting surfaces never does. It also interpolated caller strings into
   `innerHTML`; text goes in as text now.

Verified: contrast sweep clean on both pages at desktop and 375, no sideways scroll, add-to-
basket works end to end (count, toast, moved-day sentence), a bad `?id=` lands on a real page,
233 tests pass, build at 46 pages.

**22 Oct, fourth stretch — photography.**

Eight images in `templates/06-barcelona-forn/assets/img/`, exclusive to this template —
nothing shared with the other five, which was the client's complaint. Unsplash stock at
lg/md/sm; `assets/img/CREDITS.md` lists every id and what it shows.

**Six of seventeen products have a photograph, and that is deliberate.** There is no honest
stock photograph of a tortell de Reis, a mona de Pasqua, panellets, neules i torró, any of
the four cocas or a xuixo. Searching Unsplash for "ensaimada" returns Mallorcan beaches;
"tortell de Reis" returns nothing. Captioning a generic ring cake *Tortell de Reis* is exactly
what **D16** bans, so those eleven do not get a photograph.

What they get instead took four goes, and the three failures are worth knowing:

| Attempt | Why it failed |
|---|---|
| The floor at full strength where the picture would be | A saturated ochre-and-terracotta checkerboard beside a croissant reads as a glitch. |
| The same, toned to marble | Tiled into vertical **stripes** — leaving 90–270° transparent in a conic gradient makes bands, not a checker. |
| The checker drawn correctly, as the tile's background | At marble-2 on marble-3 it is unmistakably the transparency grid out of an image editor. |
| **A plain tile of the second surface** | Nothing is missing from a surface. This is the separation method the template already runs on. |

All three failures were trying to fill the hole where a picture would be. The hole is only a
hole if something is supposed to be in it.

**When the merchant supplies real photography this inverts** — the calendar items are the ones
worth photographing. Drop files in, point `image` at them in the catalogue, and `picture()` in
`components/calendar.js` uses them with no other change.

Also moved: `--ready` and `--soon`. The green was measured at 4.63 **on marble** and shipped on
that number; the shop page then put a 12px "On the counter now" on **marble-2**, where it was
4.24 and failed the sweep. A state colour lands on whichever surface its tile happens to be, so
all three are now measured against all three marbles and clear the darkest.

The hero photograph is deliberately **not** lazy and its `src` is in the markup, not painted on
by JS — Templates 03 and 05 both shipped a lazy hero that showed as an empty coloured box for
seconds on a real network.

**22 Oct, fifth stretch — the premise, and a hero worth the name.**

The client's note: *"the image just sitting at the right in a box is bland and bad design"*,
*"make it a company that sells pastries, cakes and drinks — coffee, tea, espresso"*, and
*"from the overall design I don't feel anything."* All three are fair, and the third is the
real one.

**The premise was wrong, not just the hero.** `docs/06-barcelona-forn.md` §5 already says the
brief asks for *"a place you sit in, not just buy from"* and that the photography should be
*"interiors as much as product"*. The build had drifted into a bread timetable. A forn on
Carrer de Blai is where the street has breakfast standing at the counter, so the catalogue now
has six drinks — cafè sol, tallat, cafè amb llet, xocolata desfeta, te, orxata — and the home
page has a price card for them on a warm band.

**The hero.** A claim on a flat blue field with a photograph in a box beside it is a layout,
not a design: the room was a thumbnail and the page opened cold. Now the room is the page —
full bleed, type set into it, `--tile` washing in from the left and up from the floor so the
photograph and the page are one surface, and the hydraulic floor running along the bottom edge
as the join. Below 52rem the wash runs bottom-to-top instead, because left-to-right puts the
type over the busiest part of the picture.

**The headline moved too.** "The calendar decides." is the template's idea but it is a *rule*,
and a page that opens with a rule is exactly why this read as a timetable. The claim is now
*"Coffee every morning. Cake when its day comes."* and the motto sits under it, in Catalan,
where it explains rather than announces.

**`--terracotta-deep` is now a band colour.** The ban in `tokens.css` is on `--terracotta`
(4.13 white / 4.05 ink) and it stands. The deep one measures 5.50 for marble on it, and it is
the only warm surface in the palette that can hold words — without it the page had no warmth
anywhere that was not a photograph.

**The sweep was wrong again, the same way.** Chrome serialises `color-mix(in srgb, …)` as
`color(srgb 0.96 0.96 0.95 / 0.86)` — channels 0–1, not 0–255 — and the naive number-grab read
the whole hero as black-on-black and reported two failures that were not there. Second time
this class of bug has bitten. `tools/contrast-sweep.js` now parses `color(srgb …)` and
**throws** on any colour space it does not know, rather than guessing. The one real failure it
found after the fix was genuine: dimmed white at 82% measures 4.26 on terracotta-deep, so the
card's subtitles are 90%.

Also fixed: drinks are `kind: 'everyday'`, so they were appearing in the counter grid as well
as on their own card. The counter answers "what is baked today" and a coffee is not an answer
to that.

**22 Oct, sixth stretch — basket, checkout, confirmation.**

The whole order path works end to end: add, change quantity, change the collection day, pick a
time, pay, land on a reference. Verified by driving it, including both failure cards.

**A real bug, found by testing a Monday.** `closedWeekdays` in this merchant file held
`["Monday"]`, but `shared/core/fulfilment.js` compares `Date#getDay()`, which is a **number**.
Every other merchant file in the repo uses numbers. The comparison was simply always false, so
the shop had been quietly offering Monday collection since the config was written — nothing
threw, nothing warned. `config.test.js` now asserts the values are weekday indices *and* that
they agree with the `hours` list the footer prints; proved by putting the string back and
watching it fail.

**`dayState` returns a word, and a word is not an answer.** "lead" tells a customer nothing, so
each of the five states becomes the sentence somebody at the counter would say — *"We are
closed on Mondays"*, *"We are shut that week — the whole shop goes to the beach"*, *"That day
is full. We only make so much."*

**The season rule is now in three places**, because `dayState` has never heard of the calendar:
the product page refuses to add an out-of-window item, and `seasonBlocker()` in
`components/calendar.js` re-checks in the basket (the day can be dragged backwards afterwards)
and again at the top of the checkout (stale tab, edited URL). Its message carries the year
whenever the season rolls into the next one — "from 22 October" with no year reads as a date
that has already gone.

**Payment failure is shown, not described.** `4242…` goes through, `4000 0000 0000 0002`
declines, `4000 0000 0000 0119` fails to reach the provider. The basket is cleared only after
the order exists, so a declined card leaves the customer with their basket intact.

The confirmation reads everything from the query string rather than session state, so it
survives a refresh and a bookmark, and it says so plainly when it is opened without a
reference instead of rendering an empty page.

**23 Oct — `calendar.html`, the page the rest of the template points at.**

Twelve months that abut, each holding what the oven keeps that month. The empty ones are kept
and say *"Bread and the everyday things"*, because four blank months in a row is what summer
looks like here and leaving them out would hide the shape of the year.

**The year switcher is the mechanic, not a control.** Three of the eleven days hang off Easter,
so changing the year moves Dijous Gras, Quaresma and Pasqua while Sant Jordi stays on the 23rd
of April. A `MOVES` tag marks the three. Verified: Easter 2026 → Mona on Mon 6 Apr; 2027 → Mon
29 Mar; 2028 → Mon 17 Apr. The chosen year is in the URL (`?y=2027`), and a year outside the
three is silently corrected rather than rendered empty.

**A wrong number, on the page about numbers.** The first draft of the closing copy said *"seven
of these days are fixed… the other four hang off Easter."* It is eight and three. A template
whose entire subject is dates had a false count in the paragraph explaining how its dates work
— D13 again. Both sentences are now counted from `merchant.year` at render, with the moving
days' names listed by `Intl.ListFormat`, so they cannot drift from the config. Small numbers
are spelled out, because a sentence that opens with a digit reads like a spreadsheet.

**23 Oct — `visit.html` and `404.html`. Template 06 now has every page but the style guide.**

**Visit** opens with the room rather than the address, same hero construction as the home page
because it is the same idea and a second way of doing it would just be a second way. Today's
row in the hours table is marked by surface **and** by the word "today", since a row that only
differs in colour is not marked for everyone. When the shop is shut it says when it opens
again, rather than leaving the table to be read backwards. The map link is a search for the
address, not a pin — coordinates would have been invented.

All of it comes from a new `visit` block in the merchant config, so a second forn on a
different street gets a different page from the same markup.

**404** says the one true thing in this shop's voice — *"We never made that one."* — and then
renders the real shelf underneath via `renderShelf`, so it is never out of date with the shop
and a dead end hands somebody a croissant instead of only apologising.

One class removed on the way: the 404 referenced `.btn--on-tile`, which lives in `order.css`
and that page does not load. Worth a look if a page ever styles oddly — the CSS is per-page
here, not one bundle.

**23 Oct — `styleguide.html`. Template 06 is complete: ten pages.**

`index`, `shop`, `product`, `basket`, `checkout`, `confirmation`, `calendar`, `visit`, `404`,
`styleguide`.

Everything with a number in it is read out of the live CSS or the live catalogue — the
swatches, the full ink × surface contrast grid, the two non-negotiable rules with their
measurements, the shelf tiles (real products), and the three Easter-derived days resolved for
the next three years. A ratio typed into a style guide is a claim about the stylesheet; a ratio
computed in the page is a reading of it, and it goes red on its own when somebody moves a
token.

**The guide's own contrast table had invisible text.** `.grid td` set `background: var(--marble)`
and out-specified `.cell--fail`, so every failing cell rendered marble-on-marble — in the one
table on the site whose entire job is contrast. Found by looking at the page rather than by any
tool. The selectors are `.grid td.cell--*` now, and the failing band is quiet (grout behind,
`--gone` text) rather than a wall of red.

**The sweep gained one escape hatch, and it is counted.** The guide deliberately shows the
banned pairings at their real ratios so a reader can see *why* they are banned — text that is
meant to be hard to read. `data-contrast-demo` on an element skips it and everything inside it,
and the number skipped comes back as `__skipped` on the result, so an exemption can never be
silent. Six on the style guide, zero everywhere else. Nothing but a specimen may use it.

**Shipping 06 turned up four things the template itself was fine about.** A finished template
is not finished until it is on the listing:

| Found | Fix |
|---|---|
| `templates/06-barcelona-forn/package.json` was still named `the-counter-template-05`, description and all — copied from 05 and never renamed | Renamed to `forn-de-la-placa-template-06` |
| `tools/previews.mjs` listed five templates, so 06's gallery thumbnail could never be generated | 06 added; all six regenerated |
| 06 was not on `index.html` at all | Entry added, matching the existing markup and the `loading="eager"` the other five use |
| The listing's footnote said "All five shops", and its count script's word list stopped at `'Five'` — so the sixth rendered as "**6** templates available" in a line whose whole point is being written out | Both corrected; the word list goes to twelve |

**And one pre-existing accessibility fault on the listing page**, which is the first page anyone
opens: `--ink-3` was `#857b6e`, measuring **3.62** on the paper and **3.92** on the surface, at
the 10–11px its meta lines and definition terms are set in. Every entry carried it, 01 to 06.
Now `#6b6256`: 5.23 and 5.65, still clearly the quiet tier. The listing page sweeps clean.

**23 Oct — the client said products were missing pictures. They were right, and the first
photography pass was the reason.**

No broken file references; the gap was deliberate. But "no honest photograph exists" was a
conclusion drawn from a search that was too shallow, not a finding. The queries were English
and compound — `marzipan-pine-nut-cookies`, `ensaimada-mallorca` — and several of these things
are heavily photographed under their **Castilian** names. `roscón de reyes` is the same cake as
a tortell.

Searching the native terms found five that are genuinely what they claim to be, so the
catalogue went from 9 of 23 to **14 of 23**: a marzipan tortell for Sant Antoni, ring mones
with eggs baked in, almond torró, a tallat, and a cup of thick xocolata.

**Nine are still blank and should stay blank** until the merchant photographs them —
`tortell-reis`, the four cocas, `panellets`, `xuixo`, `ensaimada`, `orxata`. Searched under
Catalan, Castilian and plain description: panellets returns croissants, xuixo returns a street
in Ensenada, ensaimada returns Mallorcan beaches, orxata returns bottled water. The reasoning
for each is in `assets/img/CREDITS.md`.

`tortell-reis` is the interesting one: roscón photographs do exist, but they show the
marzipan-and-pine-nut kind, which is what `tortell-sant-antoni` already is. This shop's Reis
tortell is the candied-fruit one with a figurine and a bean, so that photograph would
misdescribe it by its own subtitle.

**A new test and a near miss.** `config.test.js` now asserts every `image.src` resolves to real
lg/md/sm files and that each has usable alt text — proved by pointing one at a typo and
watching it fail. And the capture tooling broke silently: at 54 images the headless pass began
painting before its stylesheets applied, producing a shot of a completely unstyled shop page.
The live page was fine. `tools/previews.mjs` had the same 20s budget and generates the shipped
gallery thumbnails, so a blank-CSS thumbnail was one run away; both are at 45s now.

**23 Oct — Wikimedia Commons closes five more. 19 of 23.**

Stock libraries were genuinely empty for the Catalan specialities, but **Commons was not** —
Catalan Wikipedia documents its own food, so a panellet and a xuixo have real photographs there
even where Unsplash and Pexels return croissants and street scenes. Pexels was checked first and
behaves like Unsplash: "panellets" returns mooncakes and paella.

Five added, **every one public domain or CC0** — chosen on licence as much as content, because
share-alike would travel with a template that is sold on:

| Product | Commons file | Licence |
|---|---|---|
| `panellets` | `Panellets (surtido).jpg` | Public domain |
| `xuixo` | `Xuixo.jpg` | Public domain |
| `ensaimada` | `Ensaïmada.jpg` | CC0 |
| `coca-llardons` | `Coca de llardons.jpg` | Public domain |
| `coca-sant-joan` | `Coca de sant joan.jpg` | Public domain |

The panellets tray shows all four varieties the subtitle names; the Sant Joan coca is candied
fruit and pine nuts, exactly as described. Each was looked at full size before it was kept.

**Four remain, and three of them are a licensing decision, not a design one.** `tortell-reis`,
`coca-sant-jordi`, `coca-llarga`, `orxata`. Commons has good CC BY-SA photographs of the
tortell and of real Valencian orxata; using them would carry attribution and share-alike into
whatever this template becomes. That call is the client's, and it is left open deliberately.
`coca-sant-jordi` and `coca-llarga` have nothing on any source at any licence.

**An honest note about how it looks.** The documentary photographs are visibly more amateur
than the stock beside them — a blue plate, a green wall, a paper doily. A light grade
(`saturate(0.94) contrast(1.02)`, matching the hero) is applied across all images for
consistency, but it does **not** fix this: the mismatch is composition and setting, not colour.
Only the merchant's own photography closes it. A true photograph of a panellet still beats a
beautiful photograph of a croissant captioned *Panellets*, which was the only alternative.

**23 Oct — the client chose to take the CC BY-SA photographs. 21 of 23.**

Two added, and the obligation is now discharged properly:

| Product | Commons file | Author | Licence |
|---|---|---|---|
| `tortell-reis` | `Tortell de reis.jpeg` | Friviere | CC BY-SA 3.0 |
| `orxata` | `Orxata a Benifaió.jpg` | Francesc Fort | CC BY-SA 4.0 |

**Attribution is in the footer of every page, not in a repo file.** CC BY-SA requires the
credit to reach the people *using* the work, and `CREDITS.md` does not. `photoCredits()` in
`components/chrome.js` renders title, author, source link, licence link and the fact that both
were resized — driven from `merchant.photoCredits`, so it cannot drift from what is in use, and
deleting that config key removes the line when the merchant supplies their own.

**Share-alike now travels with this template** for as long as those two files are in it. That
was the client's call, made knowingly against leaving the tiles blank. Replacing both with the
merchant's own photographs removes it entirely.

**Two more were rejected, one of them on grounds licence does not touch.** The only Commons
`coca llarga` is a press photograph of a baking competition full of identifiable private
individuals — recognisable people in a commercial template is a problem no licence solves. The
alternatives are *coca d'oli i sal* and *coca de pa i sal*: oil and **salt**, where this shop's
is oil and **sugar**. And `Tortell de Reis - Horno de San Antonio.jpg` is a chocolate ring with
strawberries: a real modern tortell, but not the one the subtitle describes.

Worth knowing: `Roscon de reyes - tortell de reis.jpg` is **CC BY 2.0** — attribution only, no
share-alike — and would have been the better licence, but it is 612×612 and too small for the
tile. Revisit it if the tiles ever shrink.

**Still blank: `coca-sant-jordi` and `coca-llarga`.** Sant Jordi has nothing on Unsplash,
Pexels or Commons at any licence.

Next:
1. Template 07 — the concept is written in `docs/07-franco-ontarian.md`, nothing built.

Open design note from the client: *"could need improvement in design"* — accepted, no specifics
given yet. The weakest thing is probably the basket line at phone width, where the quantity box
and the remove link each take a row of their own.




Not started: the Catalan/Spanish/English glossing mechanism. Still unverified: the fonts
against Catalan glyphs — ç, à, è, í, ï, ú and the interpunct ·. The home page renders
"Plaça", "Massapà" and "què" correctly, so Zilla Slab and Source Sans 3 look sound, but the
interpunct has not been seen yet.

## 7. Session conventions

- Nothing is pushed without being asked. The client has asked each time so far.
- Commit messages explain **why**, including what was wrong before and what was ruled out.
- Verify claims before acting on them — a recent review had one claim (04 carrying a heavy
  animation) that did not hold up: 305 nodes, zero running animations, 1.9s.
- State disagreements plainly rather than silently complying. The board was removed from 05's
  home page on instruction and put back on instruction; both are recorded in `decisions.md`.
