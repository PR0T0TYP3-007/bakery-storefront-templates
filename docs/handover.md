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
2. Contrast sweep over every page × every merchant, compositing translucent layers (the
   script is in session history; it walks text nodes and composites ancestor backgrounds).
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

Next, in order:
1. `css/base.css` and `css/layout.css` — the tile separation system. Square modules that
   butt with no gutter over a painted panel; the join is the division. No radius, no shadow.
2. `js/services/api.js` — copy 05's and point it at the new data files and merchant id.
3. `index.html` + `js/pages/home.js` — hero, then **what is on the bench now** and
   **what is coming**, driven by `year.js`.
4. The rest of the nine pages, then the style guide.

Not started: photography (the template needs its own set — see §5 item 1), the tile pattern
unit, the Catalan/Spanish/English glossing mechanism.

## 7. Session conventions

- Nothing is pushed without being asked. The client has asked each time so far.
- Commit messages explain **why**, including what was wrong before and what was ruled out.
- Verify claims before acting on them — a recent review had one claim (04 carrying a heavy
  animation) that did not hold up: 305 nodes, zero running animations, 1.9s.
- State disagreements plainly rather than silently complying. The board was removed from 05's
  home page on instruction and put back on instruction; both are recorded in `decisions.md`.
