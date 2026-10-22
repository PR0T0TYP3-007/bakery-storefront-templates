# Decisions

Significant choices, the alternatives, and why. Newest last.

---

### D1 — Skill output overridden on style and typography

**Decision.** Used `ui-ux-pro-max` for the design-system pass, then overrode two of its
recommendations.

**What it returned.** At `--variance 8` it proposed **Brutalism** with a three-step
conversion-funnel page pattern. At `--variance 5`, **Minimalism**. For type, both passes
recommended **Playfair Display SC + Karla** ("Restaurant Menu").

**Why overridden.** Brutalism — "raw, unpolished, stark, anti-design" — is the wrong
posture for a shop whose entire proposition is warmth and local trust, and the funnel
pattern is for a landing page, not a shop people use weekly. Playfair Display SC is the
wedding-menu cliché; small-caps Playfair is what every stock bakery template already uses.

**Kept from it.** The warm amber/cream colour direction, the anti-patterns list ("poor
food photos", "hidden hours"), the structural ideas behind brutalism (sharp corners,
visible grid, bold type, large blocks) applied selectively, and the pre-delivery
checklist. The skill's own guidance says to verify fit before applying, which is what
this is.

**Chosen instead.** Fraunces (variable, with the `SOFT` and `WONK` axes active) for
display and Public Sans for interface. Warm and legible without being twee, and distinct
from Template 01's Instrument Serif.

---

### D2 — Self-hosted variable fonts rather than Google Fonts

**Decision.** Downloaded the latin subsets of both families as variable WOFF2 into
`assets/fonts/` and declared them with `font-display: swap` and explicit `unicode-range`.

**Cost.** 148KB total (Fraunces 121KB, Public Sans 27KB).

**Why.** Removes a third-party connection from the critical path, which matters for the
LCP target, and means the template works offline and on a static host with no external
dependency. The first download attempt grabbed the wrong subset (a 4.8KB vietnamese
block) — the latin block has to be selected explicitly from the CSS response.

---

### D3 — ES modules here, global scripts in Template 01

**Decision.** Template 05 uses native ES modules with a pure, DOM-free `js/core/` and a
single `js/services/api.js` seam. Template 01 still uses the older global-script
`shared/js/` approach.

**Alternatives.** (a) Migrate Template 01 too, for one architecture. (b) Keep Template 05
on the global scripts.

**Why this.** (b) would have meant giving up the DOM-free core and the swappable API seam,
which are the two things that make the commerce logic genuinely reusable by templates
02–04 and replaceable by a real backend. (a) is the right end state but means re-verifying
a template that currently works, in the same change as a redesign.

**Debt, stated plainly.** The project now has two module systems. `js/core/` is the better
version and Template 01 should migrate to it; until then, `shared/js/store.js` and
`templates/05-neighbourhood/js/core/` encode the same rules twice. That is a real
duplication risk and it should not survive into template 02.

---

### D4 — Board rows for everyday stock, photo tiles for cakes

**Decision.** Two product presentations, selected by `product.kind`.

**Why.** The uniform rounded-card grid was the single biggest reason v1 read as
machine-generated, and it was also wrong on the merits: a £2.60 baguette does not need a
hero photograph and a £42 celebration cake is not sold by a 250px thumbnail. Rows are
denser, scan faster for regulars, and survive bad merchant photography — a missing image
becomes a designed monogram rather than a broken tile.

---

### D5 — Honest availability: a banded count today, a capability statement later

**Decision.** `shelf()` bands the live count for today — *Plenty left · Going fast · Last
few · Sold out* — and for any day still to come says only what the shop does: it bakes
these that morning. Thresholds are fractions of the morning's batch and live in merchant
config.

**Why.** A shop cannot know how many baguettes will be left next Tuesday. Printing
"15 left" for a future date is invented precision, and the board stops being worth reading
the moment a customer notices.

**Revised after the voice work (D11).** The original version answered the honesty problem
and created a framing one. For future days it printed the batch size — "40 a day" — which
is a fact about the bakery rather than an answer to the question the customer is asking,
and it made every future day read as a scarcity notice. It also claimed "Mostly
pre-ordered" on a hashed one day in eight, which was a specific claim about a specific
Tuesday invented from a hash: exactly the false precision the rest of the function exists
to prevent.

Both are gone. Where a product genuinely does go early, that is a property of the product
(`popular`) and it is said once, in the long label on the product page, as advice rather
than as a warning — on the board it would put an urgency notice on half the rows.

**Two ways to get fake scarcity, both now guarded by tests.** The first was an absolute
low-stock threshold, which made half a small shelf say "Only 3 left"; thresholds are
proportional. The second is subtler: the simulated live count ran to about half the batch,
which modelled a permanent late afternoon and once put seven of nine rows in an urgent
band. It now runs to about 80%, and a test asserts that across four batch sizes most of
the board reads *Plenty left*.

**Consequence.** Today's bands are only visible when browsing today. `styleguide.html`
renders every band by searching for a product id whose hash lands in it, so the
demonstration stays on the real code path rather than hand-writing labels that could
drift away from it.

---

### D6 — Payment is simulated, with deliberate failure paths

**Decision.** `placeOrder()` rejects on two test card numbers:
`4000 0000 0000 0002` → declined, `4000 0000 0000 0119` → provider unreachable.

**Why.** The brief requires a demonstrated recovery path. A happy path that always
succeeds proves nothing about whether the basket survives a decline.

---

### D7 — Documentation scope reduced against the prompt

**Decision.** Produced the concept, art direction, decisions, API contract and README.
Did **not** produce the full 14-document set (separate research, journeys, design-system,
motion-guidelines, usability-test-plan, merchant-guide, analytics-and-experiments,
accessibility and performance report files).

**Why.** The feedback driving this work was about visual quality and consistency, so the
effort went into the design and the working build. Writing fourteen markdown files while
the design stayed mediocre would have satisfied the letter of the prompt and missed its
point.

**What this means.** Those documents are not written. The commercial hypotheses live in
`02-concept.md` §5 rather than a separate analytics file, and no Lighthouse or axe run has
been performed yet — so no performance or accessibility numbers should be quoted.

---

### D8 — An explicit distance check before any template is designed

**Decision.** Before a new template gets a single line of CSS, four axes are fixed and
compared against every template already shipped: the ground colour, the display type
*class*, the accent chroma, and the method used to separate one thing from another. All
four must differ. The numbers go in that template's concept document.

**Why.** The higher-up's note on Template 05 — "looks good in style but it seems similar
to the spirit of the first one" — was correct, and the evidence was measurable. Template
01's ground was `#F5F1EA`, Template 05's `#FBF6EC`: about 2% apart. Both had a serif
display face, 1px rules, no shadows and a muted earth accent.

The cause was that I differentiated on **structure** — cards versus ruled rows, ticket
versus no ticket — while keeping my own aesthetic defaults, and those defaults *are* the
identity. The brief's §11 names "five designs that share essentially the same creative
identity" as a rejection criterion, so this is a project risk, not a question of taste.

**What this means in practice.** It forced Template 02 off an off-white ground entirely,
because any pale colour is numerically close to any other pale colour. Template 02's
ground is 192 and 207 channels from the other two; its accent is 214 and 302 away.

---

### D9 — Shared commerce layer, per-template everything else

**Decision.** Three layers, with a hard rule about what may go in each:

- `shared/core/` — pure, DOM-free commerce rules. Dates, money, pricing, cart, option
  rules, fulfilment, storage. Imported by every template.
- `shared/session.js` — the stateful layer: merchant, catalogue, basket, chosen day,
  events. It touches the DOM (it sets `lang` and `data-brand`), so it is not in `core/`.
  It is a factory that takes the template's own `api.js`.
- Everything in `templates/<name>/js/` — components, pages and the `api.js` data seam.
  Shared by nothing.

**Why.** D3 said the duplicated commerce rules "should not survive into template 02". When
Template 02 started, the choice was to copy them a third time or promote them. Promoting
them took a `git mv`, thirteen import rewrites and a build-script change; copying would
have been free today and a three-way merge every time a rule changed.

`session.js` went the same way one step later, for the same reason: it was 180 lines and
the only template-specific line in it was the relative import of `api.js`.

**What this means.** UI components are deliberately *not* shared. Template 02's date picker
and Template 05's do the same job and look nothing alike, which is the point — a shared
component across five templates with five identities would pull them back together, which
is exactly what D8 exists to prevent.

---

### D10 — The cake builder is drawn from data, and it is deterministic

**Decision.** Template 02's live cake preview is inline SVG built by one pure function
that returns a string. Option colours and drawing modes live in `products.json`; the
renderer never mentions an option id. Sprinkle scatter and drip lobes are seeded from an
FNV-1a hash of the configuration.

**Why determinism matters.** The inscription repaints the cake on every keystroke. With
random placement the sprinkles would re-scatter on each letter typed, which reads as a
glitch rather than a feature. There is a test asserting that typing does not re-pour the
drip.

**Why from data.** A merchant adding a buttercream colour should not need a developer. The
only join between the two vocabularies — option ids and drawing modes — is `specFrom()`.

**Why a string and not DOM nodes.** It makes the thing testable under `node --test` with
no DOM, no jsdom and no transpiler. One `innerHTML` of a three-tier sprinkle-coated cake
measures around 1.1ms, well under a frame, so diffing would be more code for no gain the
customer could feel.

---

### D11 — Voice is part of the identity, and it is checked separately

**Decision.** Template 05's customer-facing copy was rewritten from a craftsperson
explaining their constraints to the person behind the counter telling you what you can
have. Palette, typography and layout were not touched.

**Why.** D8 added a numeric distance check — ground, display type class, accent chroma,
separation method — and Template 05's re-skin passed it comfortably. The client still
had a point, because the thing that made 01 and 05 feel like siblings was never only
the colours. Strip the styling from either and both said: *we are a small, serious
bakery, we make a limited amount, and we are strict about our rules.* Almost every
operational sentence put the bakery in the subject position and stated a limit — "we
don't ship, and we're not going to pretend otherwise", "the morning's baking is already
spoken for", "we cap how many orders we take".

That posture is identity. The numeric check cannot see it, so it is now checked on its
own, with three questions per line:

1. Is the subject the customer or the bakery?
2. Does the sentence state a limit, or what is possible inside the limit?
3. Would it survive being said out loud across a counter?

Every fact was kept. The cutoff, the three-mile radius, the capacity caps and the
allergen statement all still say exactly what they said before.

**The guard that matters.** No jokes, no exclamation marks, no whimsy. That is Template
02's register, and the entire point of the exercise is not to recreate the problem one
template to the right. A grep for exclamation marks is part of the check.

**What this did not cover, and what happened next.** The board still reported future-day
availability as a production count — "40 a day" — which was the loudest remaining piece of
the old voice. It was left alone in the copy pass because changing it is a behaviour
change: D5 deliberately distinguishes what is *on the shelf today* from *the size of
tomorrow's batch*, and replacing a future count with "Plenty left" would have invented
precisely the precision D5 exists to avoid.

It has since been done properly — bands for today, a capability statement for future days,
thresholds in merchant config — and D5 is revised to match.

---

### D12 — Template 04 prices commissions; the model is template-local on purpose

**Decision.** Template 04's commission pricing lives in
`templates/04-creative-studio/js/commission.js`, not in `shared/core/`. It is pure and
DOM-free and has its own tests, but it is not promoted.

**Why not shared.** D3 and D9 set the rule the hard way: a module moves to `shared/` when
a *second* template needs it, not in anticipation. One template prices commissions. If
Template 03 ever does bespoke work, it moves and both import it.

**Why not shared/core/pricing.js.** `priceLine()` is additive — a base plus the price of
each chosen option — which is right for a cake with a size and a sponge. It cannot express
how a studio quotes: a base for the *scale* of the piece, multiplied by how far it is
taken, and only then the techniques added on top. Going from Clean to Editorial does not
add a fixed sum, it changes what the whole job costs. Forcing that into an additive model
would have meant inventing option prices that do not correspond to anything.

The two models coexist through `priceAnyWith()`, which dispatches on `product.kind` and
returns the same shape as `priceLine`, so a basket row is written once whichever applies.
The shared `priceLine` is passed in rather than imported, which keeps the module free of a
dependency on the layer above it.

**What the research found.** Two real studios, checked directly. ECBG Studio (Chicago)
publishes "custom cakes start at $300" and takes an enquiry; a named manager quotes later.
Yevnig (London) asks for a budget *band* — below £1,500, £1,500–3,000, above £3,000 — and
books a consultation. Neither lets anyone buy. The budget band is a frank admission that
they cannot price it on the page, and it is the gap this template is built around.

**Three consequences that are not negotiable.**

*The lines sum to the quote.* A test asserts it. A figure a customer cannot check by
adding up is just a different kind of guess, which is what the category already offers.

*Lead time is additive, not the longest.* One person builds the whole piece, so drying
sugar flowers and building an armature happen in sequence. An ambitious brief really does
take six weeks and the diary says so before anyone has typed a name.

*The deposit is a share of the order.* A basket holding a commission is a commission
order: the button says "Pay the deposit — €689.51", not the €2,298 total. Showing the
total as the amount to pay would be a lie the customer finds on their statement.

---

### D13 — Measure the design claims, or do not make them

**Decision.** Every template's style guide computes its contrast table from the live
tokens rather than listing figures written down at design time, and target sizes and
horizontal overflow are measured per page at 375px before a template is called done.

**Why.** Three times now the measurement has disagreed with the claim, and each time the
claim was mine:

- Template 02's docs said "every tap target is at least 44 × 44". Measuring found fifteen
  under it, including every footer link.
- Template 04's `tokens.css` said `--rule-strong` "clears 3:1". Its own style guide
  measured **2.64:1** — under what SC 1.4.11 requires of a rule that separates content.
- Template 04's `.bleed` used the standard `100vw` break-out, which includes the vertical
  scrollbar and gave every page a sideways scroll. Nothing looked wrong; the number was
  eight pixels.

A guide that states yesterday's contrast ratio is worse than no guide, because it is
believed. The cost of computing it live is about fifteen lines per template.

**What this does not cover.** No axe or Lighthouse run has been performed on any template,
and nothing has been tested with a screen reader. Measured is not audited, and no
accessibility or performance numbers should be quoted to the client yet.

---

### D14 — Tax is a property of the jurisdiction, not of the layout

**Decision.** `shared/core/pricing.js` grows a `taxMode` of `inclusive` or `exclusive`,
defaulting to `exclusive`. An inclusive merchant's shelf price already contains the tax,
so the checkout *extracts* and states it rather than adding it.

**Why.** Template 04's config said "Includes 7% VAT" while `orderTotals()` added 7% on
top: €85 became €90.95. A customer saw one price and would have paid another. In the EU
and the UK that is not a presentation preference, it is the law for consumer prices — so
the bug was not merely confusing, it made the template non-compliant for the market it
is set in.

US sales tax genuinely is quoted separately and appears at checkout, which is why the
exclusive path stays and stays the default: Template 01 is in Brooklyn.

**Caught by an outside review, not by us.** Every test asserted the arithmetic was
*consistent*; none asserted it matched what the page promised. There are now four tests
covering both directions, a zero-rated merchant, and that a deposit is a share of the
gross rather than of a pre-tax figure.

---

### D15 — A capability may be switched off; it may not be absent

**Decision.** Where the brief's §7 lists a capability — inscriptions, add-ons, gifting,
local payment methods — the template implements it behind a config flag. A merchant
config may then turn it off.

**Why.** Template 04 shipped with `gifting: false`, `inscriptions: false` and no code for
either, justified on the grounds that Template 02 "owns" gifting. That confused two
different things. §7 says *"Each template must support the core realities"* and then
*"The underlying system must allow merchants to configure which capabilities apply... The
experience must accurately reflect what each merchant can fulfil."* Supporting a
capability and emphasising it are not the same decision. Differentiation between
templates is about treatment and prominence, not about dropping requirements.

Template 02's gifting is a first-class branch with a card preview; Template 04's is a
compact section in the studio's voice. Both exist, both are config-driven, and they do
not look alike — which is the whole point.

**Also corrected under this.** Editions had a "How many: One / Two / Four" control where
every option was priced zero and labelled "included", sitting directly above a quantity
stepper. A control that changes nothing is worse than no control: it is the brief's
"clear price changes as selections are made" failing in the most visible way available.
It is a real size now, and the price moves.

---

### D16 — Photography is art-directed in CSS, and never lies about the product

**Decision.** Template 04's images carry no baked-in treatment. A CSS filter puts every
photograph into the studio's look, and full colour returns on hover and on focus.

**Why in CSS.** The brief rejects "design concepts that only work with perfect
demonstration content". A treatment applied in the stylesheet reaches a merchant's own
phone snapshots too, so a bad photograph and a studio photograph end up looking like they
belong to the same shop. A treatment baked into the files would only ever flatter ours.

**Why the range shrank.** All four of Template 04's editions were showing photographs of
something else — "Buckwheat, pear, crème fraîche" was a croissant — and two of them were
the same shots Template 02 uses for different products. Only two cake photographs in the
library were unused. So the range is two editions and the offcuts box, each with a
photograph that is actually of it. A studio taking four commissions a week repeating two
editions is more believable than one repeating three it cannot photograph.

Sharing a photograph between two templates is its own portfolio problem, and worth a
sweep: eight images are currently used by more than one template.

---

### D17 — Explain the product before explaining what is clever about it

**Decision.** The commission page opens by saying what a commission *is*, in one
sentence, before asking anything. The home page names the two things the studio sells
before it makes its argument. The four ambition levels are shown as photographs.

**Why.** The owner of this project read the commission page and asked: *what am I
commissioning? what is the company even about? can I request custom orders? what do the
options mean?* If the person who commissioned the work cannot tell what is being sold,
the page has failed the brief's "beautiful interfaces that are difficult to navigate"
regardless of how good the mechanic underneath it is.

Everything on the page was true and nothing on it was an introduction. "Priced on the
page" is the *differentiator*, not the *product*. A visitor has to learn what is sold
before they can care what is clever about it.

**The levels were the worst of it.** Clean, Composed, Sculptural and Editorial are the
decision that multiplies the price, and they were four abstract words with abstract
notes under them — nobody can choose between "composed" and "sculptural" from prose. A
studio asked that question in person would point at something it had made. Each level
now carries a reference photograph, a real figure for the scale currently chosen
("from €972") rather than a multiplier, and a note in plain language. The chosen one
comes into colour; the rest stay monochrome.

Palette options moved from designer vocabulary to what they mean — "Monochrome" became
"One colour", "High contrast" became "Colours that fight" — and each technique says what
it looks like rather than what it is called in a kitchen.

**What this is not.** It is not a retreat from the direction. The brief asks for a bold,
experimental design language; it also rejects interfaces that are hard to use, and the
two are not in tension. The composition, the typography and the dark ground are
untouched. What changed is that the page now introduces itself.

---

### D18 — The written brief is the design, so it gets its own step

**Decision.** Template 04's commission gains a numbered step, third of six, holding three
short questions: what it is for, the idea in the customer's words, and anything to avoid.
It travels on a new `meta` field on the cart line, which `shared/core/cart.js` carries and
does not interpret.

**Why.** The owner put it precisely: *after selecting the options, the overall design
depends on the maker.* That is exactly right, and it is the hole in the mechanic. Scale,
ambition, techniques and palette fix how much work is involved and roughly what register
it is in. They do not describe the idea. Everything that makes the cake *this* cake rather
than any other cake at that price was, until now, a 400-character box at the bottom of the
delivery step labelled "Anything we should know" — which is why nobody found it, including
the person who commissioned the project.

Three short questions beat one open box. "Anything we should know" gets you nothing;
"what is it for" gets you an answer.

**Why `meta` and not `inscription`.** It was being stored as the line's inscription, which
is the field for what is piped onto a cake. A design brief is not an inscription. The
commerce core now carries an opaque per-line object instead, and `signature()` includes it
— without that, two commissions with different briefs would share a signature and silently
merge into one line at quantity two, which is a different cake ordered twice.

`session.add()` had to forward it too. It builds its own line object and dropped every
field it did not name, so the brief reached the cart layer and vanished. Found by looking
at the basket rather than by trusting the call.

**The honest bit the page now says.** "We design it from this... expect us to come back
with questions, and sometimes with a better idea than the one you sent." A studio that
takes a brief and interprets it should say so, rather than implying six dropdowns fully
determine the outcome.

---

### D19 — The direction that failed the distance check is the one that had to be rethought, not dropped

**Decision.** Template 03, The Romantic Boutique, is built on a `#8e2a58` mulberry
ground with an incised-capital display face, a blush accent and masked apertures for
separation. Its signature is a card that typesets itself as the customer writes it.

**Why this needed a decision at all.** When Template 04 was chosen ahead of this one,
[docs/04-creative-studio.md](04-creative-studio.md) §1 made a specific argument: a
Romantic Boutique built the way the brief's own words push it — intimate, affection,
presentation, therefore blush, a high-contrast serif and generous whitespace — fails D8.
Its ground would sit 10 and 17 channels from two shipped templates and its display face
would be the project's fifth serif.

That analysis was right about the obvious build and wrong about the direction. "Blush,
serif, whitespace" is the *cliché* of romance, not romance itself. The fix was not to
soften the distance check; it was to stop designing from the adjective.

**Where the identity came from instead.** Three real shops, checked directly, all selling
cakes whose entire purpose is to carry a message to somebody:

- **Konditor** — *"Add your message at checkout and we'll pipe it by hand, with care and
  a flourish."* A 120-character counter. No preview, anywhere.
- **Cutter & Squidge** — the note is not part of the order. You pay, then go to a separate
  page, enter your order number and postcode, and type it — **within one hour**, or the
  cake is delivered with nothing. With the instruction to *"remember to include in your
  note who the gift is from"*.
- **Patisserie Valerie** — an inscription and an optional gift card at checkout, both
  plain inputs.

**The words are the product, and every storefront treats them as a text input.** A
counter tells you that you have room. It does not tell you that your message lands on four
lines and the card holds three, or that the longest word in it is wider than the card.
The customer finds out when the recipient does, which is the one moment that cannot be
fixed. That is the gap, and it maps exactly onto the four words the brief uses for this
direction: *storytelling, personalization, emotional connection, and **presentation***.

**The colour finding, which is reusable.** Under D8's metric, "deep and romantic" is
mostly unavailable: any near-black is within about 100 channels of Template 04's, because
dark colours are numerically close to each other whatever their hue. What is wide open is
a ground with one high channel and two low — a saturated wine — at 228 from near-black
and 300–470 from everything pale. Three near-whites, one near-black, and now one that is
a colour. **Blush is the accent for the same reason in reverse:** every shipped accent is
dark or saturated, so a pale pink measures 299–423 from all four. The cliché this
direction was in danger of turned out to be the one region nobody had used, and
reclaiming it is a better answer than flinching from it.

**The rule that keeps the script honest.** Three faces: incised capitals for display,
Karla for interface, and Petit Formal Script for *the hand* — allowed only inside a
depiction of handwriting, the card and the piped plaque, and never in the interface. The
script is **diegetic**. That is the whole difference between this and the stock bakery
theme that sets its navigation in a script, and it is why D1's objection to Playfair
Display SC — a face borrowed for atmosphere — does not apply here.

**What the measurement caught this time.** D13 earned its place again, four times:

- `--ink-3` at `#e3aebd` measured **4.22:1** and `--rule-strong` at `#c98da4` measured
  **2.99:1**. Both were written down as passing. Both were mine.
- The target table counted seven failures that were all false — hidden radio proxies one
  pixel square, and tile titles whose stretched overlay is the real target. It now derives
  the *effective* target from the computed styles, so the number means something.
- The tile hit test reported a failure that was entirely its own: `elementFromPoint` only
  answers for the viewport, and the section is a long way down the page.
- 111px of sideways scroll at 375px, traced to a 58-character Welsh place name inside an
  error message. Long words now break rather than breaking the page — which matters more
  here than anywhere else in the project, because this template quotes the customer's own
  writing back at them.

**And one honest limit, stated rather than designed around.** The occasion layer — "keep
this date" — is `localStorage`. It is this browser, on this device, and it cannot email
anybody. The research on reminder features found vendor marketing and no independent
conversion data at all; one add-on claims a "179% higher unique click rate" with no source
and no method. §11 rejects unsubstantiated claims that a creative feature will increase
sales, so the concept doc records three hypotheses with the measurements that would settle
them, and every surface that offers to keep a date says in the same sentence where it
lives.

**Two shared-layer changes came out of this.** `cart.js` gained `updateLine`, because the
card is written after the cake is already in the basket and re-adding would mint a new id
and move the row; and `rules.js` stopped falling an impossible option back onto a default
that was itself impossible — Ombré defaults to sugar roses, which need one of the larger
sizes, so shrinking the cake left the finish on the option the kitchen had just refused.
Both have tests.

---

### D20 — The ground was never fixed, and fixing it is a re-skin, not a repaint

**Decision.** Template 05's ground moves from `#faf9f6` to sage `#9ab894`, and with it the
template gains a structural distinction it did not have: a **wall** and the **paper pinned to
it**. The board, the header, the dialog and the ticket are sheets of paper. The page behind
them is painted.

**Why it had to move.** D8 was written because of a complaint about Template 05 — "looks good
in style but it seems similar to the spirit of the first one" — and D11 answered it by
rewriting the voice. The colour was never touched. Measured, Template 05's ground sat **25
channels** from Template 01's cream while every other pair in the set cleared 192. The one
template the rule existed for was the one still failing it.

```
         01 cream  02 sun  03 plum  04 near-black
05 sage      234     204      206            442      (was 25 / 178 / 192 / 418)
```

**Why a wall-and-paper split rather than just a darker page.** A mid-tone ground takes two
things away. The tertiary ink and all three sign colours measure between 2.47 and 3.68 on
sage, so a board drawn straight onto it could not price a loaf in the shop's own green. The
first instinct was to ration the colours and write the restriction down as a rule. That was
wrong twice over: the restriction was enforced by nothing — the home page broke it in twelve
places — and it would have made the board the one surface forbidden to use the brand.

Putting the content on paper gives every ink and every sign colour an AA surface to live on,
turns the wall into the thing the paper is pinned to, and makes the template's own
description of itself literally true for the first time. The constraint produced the
structure; it was not something to work around.

**One claim in this repository was wrong and is withdrawn.** `tokens.css` asserted that three
levels of ink cannot fit on a mid-tone ground. They fit. What did not fit was a tertiary ink
spaced against a near-white page and carried over unchanged; re-spaced to `#394433` it clears
AA on all five surfaces. **A palette inherited from a different ground is not evidence about
the ground.**

**What measuring found that reading would not.** Nine of the ten pages were clean; the
failures were all in places where a colour met a surface nobody had thought about together —
a translucent *white* chip lightening the green bar until white text on it read 4.11, labels
dimmed to 72% on that same bar at 3.58, and a style guide demonstrating status chips on the
wall, so the page documenting the contrast rules was the only page breaking them. None of
these is visible in a diff. All of them are visible to a script that composites the actual
layers and checks every text node on every page in both brands.

**The companion rule.** The style guide now computes its contrast table in the browser from
the tokens as they are set, so the table cannot drift away from the CSS — and demos sit on
paper, because that is where the components they demonstrate actually sit.

---

### D21 — A template's separation method has to appear on its first screen

**Decision.** Template 04's hero carries a real commission that bleeds off the right edge of
the document and hangs into the section below it. Section 01 of the home page shows
commissions rather than editions, each with the brief it was built from and the figure that
brief produces.

**Why the hero.** The markup comment above that section read *"Type at display scale, a piece
pushed up beside it"* from the first commit, and the piece was never built. D8 assigns this
template **overlap, bleed and a visible grid** as its separation method — and the first
screen, the one that has to establish the identity, used none of the three. It was type on a
flat field, which is the one composition this template is not.

**Why the work section.** Sections 01 and 03 both showed editions. The home page of a studio
whose headline is *"One-off cakes, priced on the page"* displayed the fixed-price shelf twice
and a commission never, because there was no commission photography and no past work in
config. The claim was asserted at the top of the page and never once shown.

**The figures are computed, not stored.** Each past piece is saved as the brief that made it
— scale, ambition, palette, techniques — and `priceCommission` prices it at render time. The
same function quotes the visitor. A stored number would make the proof of the template's one
claim a hardcoded string that starts lying the day somebody edits the scale prices. There are
tests over the shipped JSON, because the failure mode of a mistyped technique id is not a
crash: it is a plausible smaller number under a real photograph.

**What the browser found that reading did not.**

- A `<figure>` carries the browser's own `margin: 1em 40px`. Inside a grid item that margin
  sits in the track, so the piece stopped 40px short of the edge and **the bleed silently did
  not happen** — while looking near enough to right to pass by eye.
- Sizing the two middle tracks as fractions of `--page` (1560px) meant that on any narrower
  viewport both asked for more room than existed, were compressed to fit, and came out
  **equal** — a 50/50 hero where 62/38 was written.
- A column gap puts a gap between the side track and the first content track too, so the
  headline began one gutter further in than every other section. On a template that draws its
  column grid on the screen, that is the first line of the page sitting off the grid.
- `--t-mega` is `9.5vw`. Sized against the window rather than its column, the headline ran to
  five lines once the piece took its share and pushed **both calls to action below the fold**.
  It is now `14.6cqw`, so it fills whatever column the ratio gives it.

**And one defect that was never a design decision.** The studio treatment is monochrome
resolving to colour on hover. `hover` does not exist on a touch screen, so on a phone every
cake on the site was permanently black and white, with no way to see one in colour outside
the product page. **A reveal that cannot fire is not an art direction; it is a photograph
nobody can see.** Under `@media (hover: none)` the grayscale comes almost all the way off and
the contrast lift stays. Keyed to `hover` rather than to a width, so a touchscreen laptop
keeps the version that suits it.

---

### D22 — A card by another name is still a card

**Decision.** Template 05's "Before the doors" section is one band whose three columns run
from ink to paper — night, the light coming up, the doors. No panels, no borders between
items, photographs flush to their column edges.

**What it replaced, and why that matters.** The first build mounted each moment on its own
white rectangle with a 1px hairline border, separated from its caption by another hairline.
The comment above it argued that a generous mount made them read as *pinned prints* rather
than as cards. That reasoning was wrong, and it was wrong in a way worth naming: **the test
is not what the author intends a shape to mean, it is what the shape is made of.** A white
panel with a hairline border is a card, and hairline-ruled panels is the separation method
D8 assigns to **Template 01** — so the section was built in another template's vocabulary,
inside the one template whose entire re-skin exists to get away from Template 01. It was
reported from outside as "giving vibes of template 1", which it was.

**The second attempt was correct and dull.** One ruled sheet, three equal columns, same
shapes in each — a metronome. Correct is not the same as designed.

**What fixed it was the content.** The three moments are 03:20, 05:45 and 07:30: a night
turning into a morning, drawn as three equal things side by side. Letting the band get
lighter across its width makes the section mean what it looks like, costs nothing but two
existing tokens, and is measurable — body text on ink is 15.51, and `--green-light` is the
sign colour's own hue lifted until it reads on ink at 9.70.

**Two smaller rules fell out of it.**

- **Ink is a surface, not only a text colour.** That is consistent with the wall-and-paper
  rule rather than an exception to it: the rule is that content sits on something that can
  hold it. What content may never sit on is the painted wall.
- **A tonal step between two columns is the division.** A rule drawn between two different
  surfaces is a line nobody needed.

**And a layout note.** The columns are deliberately unequal — the last is widest, because it
is the one the section counts down to. Unequal columns plus a fixed picture ratio means three
different picture heights, so the rows live on the band via `grid-template-rows: subgrid` and
the three columns keep step. Without it the times lined up and the captions did not.
