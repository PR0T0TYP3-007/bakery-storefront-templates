# Photography — Forn de la Plaça

Twenty-seven photographs, exclusive to this template. The review of the first five
templates raised that they share one pool of twelve images in `shared/img/`;
nothing here is in that pool and nothing here is used by another template.

Eighteen are Unsplash stock under the [Unsplash
licence](https://unsplash.com/license); nine are from Wikimedia Commons and
are listed separately below with their licences. **Every one of the 23
products now has a photograph.** All of them stand in for the
merchant's own photography. Each file is `<name>-lg.jpg` (1600–1800px), `-md.jpg` (900px)
and `-sm.jpg` (480px), fetched from
`images.unsplash.com/<id>?w=…&q=72&fm=jpg&fit=max`.

| File | Unsplash id | What it shows |
|---|---|---|
| `room` | `photo-1562815240-be666d2600ce` | **The hero.** Brick, a wooden counter with the pastry case lit, pendant lamps, people at tables |
| `counter` | `photo-1790156591751-5c3c96e0140f` | A marble counter under glass domes against dark blue panelling, tiled floor beyond |
| `table` | `photo-1529942458412-eda69f76291d` | A slice of cake and a coffee on a café table |
| `cafe-sol` | `photo-1549035975-7ca0d2ce5033` | A gold-rimmed cup of black coffee on marble |
| `espresso` | `photo-1598146635303-dd566d5e3ac2` | Espresso pulling into a glass |
| `tea` | `photo-1548523067-82c2fbc0e8ee` | A teapot in low morning light |
| `obrador` | `photo-1738866299755-6ef45d3fc01e` | A bread and pastry counter, loaded |
| `croissant` | `photo-1623334044303-241021148842` | A tray of croissants |
| `pa-de-pages` | `photo-1549413468-cd78edb7e75c` | Round floured loaves on cloth |
| `pa-de-segol` | `photo-1626423642275-6d0df1662c96` | Slices of dark rye with walnuts |
| `barra` | `photo-1599819055803-717bba43890f` | Thin loaves in a paper bag |
| `bunyols` | `photo-1651802556013-22e60a3ff853` | Fried rings rolled in sugar |
| `crema-catalana` | `photo-1554371650-1f19f803c220` | Sugar on a terracotta dish being burnt with a torch |
| `tortell-marsipan` | `photo-1586716580690-f8418e99e482` | A round tortell topped with marzipan and pine nuts |
| `mona` | `photo-1590222566750-b19466b991d0` | Ring-shaped mones on a market table, each with a whole egg baked in |
| `torro` | `photo-1610529540377-3a3ef463346f` | Bars of almond torró on a board |
| `tallat` | `photo-1534687941688-651ccaafbff8` | A tallat in a small glass on a saucer |
| `xocolata` | `photo-1590872809871-8a1602d5842d` | A cup of thick drinking chocolate with a spoon, xurros alongside |

Every one was looked at before it was kept — on contact sheets, at size, and
then again in the page.

`room` is the hero because it is the only candidate that has a counter, tables
AND people in one frame. The brief asks for "a place you sit in, not just buy
from", and a photograph of bread does not say that. Its left third is in
shadow, which is where the type sits.

`counter` was kept for its palette, which is already this template's: dark
blue panelling against a pale marble top, with a patterned floor behind it.

## A correction: the first search was too shallow

The first pass concluded that no honest photograph of the Catalan specialities
existed and left eleven of them blank. That was under-searching, not a finding.
The queries were English and compound — "marzipan-pine-nut-cookies",
"ensaimada-mallorca" — and several of these things are heavily photographed
under their **Castilian** names. `roscón de reyes` is the same cake as a
tortell. Searching the native terms found five more that are genuinely what
they claim to be, and they are now in use.

## Why nine things still have no photograph

**D16 — photography never lies about the product.**

There is no honest stock photograph of a tortell de Reis, a mona de Pasqua,
panellets, neules i torró, a coca de llardons, a coca de Sant Jordi, a coca
de Sant Joan, a coca llarga, a tortell de Sant Antoni or a xuixo. Searching
Unsplash for "ensaimada" returns photographs of Mallorcan beaches; "tortell
de Reis" returns nothing at all; "marzipan" returns pink sweets that are not
panellets, which are crusted in pine nuts.

The tempting move is to use a near miss — a generic ring cake captioned
*Tortell de Reis*, a cinnamon roll captioned *Ensaïmada*. That is the exact
thing D16 forbids, and it would be the template lying about the one subject
it is built on.

So the ones without an honest photograph are plain tiles of the second
marble, with their words at the bottom so the names still line up across a
row. Three earlier attempts filled that space with the hydraulic floor at
various strengths; all three read as an image that had failed to load,
because a patterned rectangle where a picture belongs is a hole. A surface
is not a hole. `docs/handover.md` has the full account.

**When the merchant supplies real photography, this inverts.** The calendar
items are the ones worth photographing; they are the reason anyone comes.
Add the files here, point `image` at them in
`data/products.forn-de-la-placa.json`, and `picture()` in
`js/components/calendar.js` will use them with no other change.


## The drinks

Six of them, added when the shop became a café rather than only a bakery.
Three carry a photograph (`cafe-sol`, `espresso`, `tea`); a tallat, a
xocolata desfeta and an orxata do not, and the same rule applies — a
photograph of a generic latte captioned *Tallat* is the same lie as a
generic ring cake captioned *Tortell de Reis*.

They are listed on the home page as a price card rather than a grid of
tiles. Six coffees at four prices are read top to bottom like the card
propped against the till; making them the same shape as six cakes would say
they are the same kind of decision, and they are not.


## The five from Wikimedia Commons

Stock libraries have nothing for the Catalan specialities — but Commons does,
because Catalan Wikipedia documents its own food. Every one of these was
chosen on its licence as much as its content: **all five are public domain or
CC0**, so there is no attribution to carry and no share-alike to inherit.
That matters for a template that is sold on.

| File | Commons file | Licence |
|---|---|---|
| `panellets` | `Panellets (surtido).jpg` | Public domain |
| `xuixo` | `Xuixo.jpg` | Public domain |
| `ensaimada` | `Ensaïmada.jpg` | CC0 |
| `coca-llardons` | `Coca de llardons.jpg` | Public domain |
| `coca-sant-joan` | `Coca de sant joan.jpg` | Public domain |

**These look different from the stock, and deliberately so.** They are
documentary photographs — a blue plate, a shop counter, a paper doily — not
studio work. A true photograph of a panellet is worth more here than a
beautiful photograph of a croissant captioned *Panellets*, which is the only
alternative the stock libraries offered. When the merchant shoots their own,
these are the first to replace.

## The two under Creative Commons

These two carry an attribution obligation, and it is discharged **in the
footer of every page** — not here. A file in the repository does not reach
the people using the work, which is what the licences require. Both were
resized and re-encoded, and the footer says so.

| File | Commons file | Author | Licence |
|---|---|---|---|
| `tortell-reis` | `Tortell de reis.jpeg` | Friviere | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `orxata` | `Orxata a Benifaió.jpg` | Francesc Fort | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

**Share-alike travels with these.** Anyone who takes this template on inherits
it for as long as those two files are in it. The client chose that knowingly
over leaving the tiles blank; replacing them with the merchant's own
photographs removes the obligation entirely, and deleting `photoCredits` from
the merchant config removes the footer line with it.

The credit is rendered by `photoCredits()` in `js/components/chrome.js` and
driven from config, so it cannot drift from what is actually in use.

`tortell-reis` was chosen over two alternatives. One
(`Tortell de Reis - Horno de San Antonio.jpg`) is a chocolate ring with
strawberries — a real modern tortell, but not the one this shop's subtitle
describes. The other (`Roscon de reyes - tortell de reis.jpg`) is **CC BY
2.0**, a lighter licence with no share-alike, and would have been preferable
on that ground alone, but it is 612×612 — too small for the tile. It is worth
revisiting if the tiles ever get smaller.

## Two products were renamed, not just photographed

`coca-sant-jordi` → **`pa-sant-jordi`**, and `coca-llarga` → **`coca-sucre`**.

Both of the old names were invented — this catalogue is fiction. The real,
canonical, photographable Catalan items are the **pa de Sant Jordi** (the
loaf striped red and yellow like the senyera, which is what every forn in
Barcelona actually puts in the window on 23 April) and the **coca de sucre**
(the plain flat one: oil, sugar, nothing else).

This is the opposite of bending a product to fit a stock photograph. It
corrects invented data toward a real thing, so the catalogue and the picture
agree on something true. The ids moved with the names, and so did the `year`
entries that point at them — `config.test.js` checks that link.

| File | Commons file | Author | Licence |
|---|---|---|---|
| `pa-sant-jordi` | `147 Pa de Sant Jordi a l'aparador del Forn Sant Jordi…` | Enric | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — attribution only, **no share-alike** |
| `coca-sucre` | `Coca de sucre del Priorat.jpg` | Espencat | Public domain |

The Sant Jordi photograph is a Barcelona forn's own window, which is as close
to this template's subject as stock gets.

## Nothing is blank now

All 23 products carry a photograph. Earlier passes left as many as fourteen
without one, on the grounds that no honest picture existed — that was true of
the stock libraries and false of Wikimedia Commons, which is where regional
food is actually documented. The lesson, written down so the next template
does not repeat it: **search the native name, and search Commons before
concluding a thing has never been photographed.**

Every file here is still a placeholder for the merchant's own photography.
