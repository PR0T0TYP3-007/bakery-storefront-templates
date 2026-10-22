# Photography — Forn de la Plaça

Eight photographs, exclusive to this template. The review of the first five
templates raised that they share one pool of twelve images in `shared/img/`;
nothing here is in that pool and nothing here is used by another template.

All eight are Unsplash stock under the [Unsplash
licence](https://unsplash.com/license), standing in for the merchant's own
photography. Each file is `<name>-lg.jpg` (1600px), `-md.jpg` (900px) and
`-sm.jpg` (480px), fetched from `images.unsplash.com/<id>?w=…&q=72&fm=jpg`.

| File | Unsplash id | What it shows |
|---|---|---|
| `counter` | `photo-1790156591751-5c3c96e0140f` | A marble counter under glass domes against dark blue panelling, tiled floor beyond |
| `obrador` | `photo-1738866299755-6ef45d3fc01e` | A bread and pastry counter, loaded |
| `croissant` | `photo-1623334044303-241021148842` | A tray of croissants |
| `pa-de-pages` | `photo-1549413468-cd78edb7e75c` | Round floured loaves on cloth |
| `pa-de-segol` | `photo-1626423642275-6d0df1662c96` | Slices of dark rye with walnuts |
| `barra` | `photo-1599819055803-717bba43890f` | Thin loaves in a paper bag |
| `bunyols` | `photo-1651802556013-22e60a3ff853` | Fried rings rolled in sugar |
| `crema-catalana` | `photo-1554371650-1f19f803c220` | Sugar on a terracotta dish being burnt with a torch |

Every one was looked at before it was kept. The `counter` shot was chosen
because its palette is already this template's: dark blue panelling against a
pale marble top, with a patterned floor behind it.

## Why only six of seventeen things have a photograph

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

So the eleven without an honest photograph show the hydraulic floor instead:
the same CSS pattern as the hero, no request, and not pretending to be a
picture of anything. It also happens to say something true — the things with
photographs are the ones on the counter every morning, and the things with
the floor are the ones you have to wait for.

**When the merchant supplies real photography, this inverts.** The calendar
items are the ones worth photographing; they are the reason anyone comes.
Add the files here, point `image` at them in
`data/products.forn-de-la-placa.json`, and `picture()` in
`js/components/calendar.js` will use them with no other change.
