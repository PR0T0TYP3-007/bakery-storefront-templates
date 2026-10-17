# API contract — Template 05

Every function in `templates/05-neighbourhood/js/services/api.js`, with the request and
response shapes a backend must match. No other module in the template touches data, so
replacing each function body with a real `fetch()` is the whole integration.

All functions are `async` and return plain JSON. Errors throw `ApiError` with a `.status`.

---

## Where the logic must move

Three things are computed **client-side today and must not be in production**:

| Today | Why it has to move |
|---|---|
| `fulfilment.capacityFor()` | The client can lie about how many slots are left. Capacity is the shop's inventory. |
| `fulfilment.shelf()` | Same — stock is a server fact. |
| `fulfilment.dayState()` | Lead times and closures are policy, and policy belongs on the server. |

The client may keep these as an *optimistic* copy for instant feedback, but the server
must re-check everything at `placeOrder`. Assume the request is hostile.

---

## `getMerchant(id?) → Merchant`

`GET /api/merchants/:id`

```jsonc
{
  "id": "hazel-and-rye",
  "name": "Hazel & Rye",
  "shortName": "Hazel & Rye",
  "tagline": "Bread, cake and good coffee on Bellevue Road",
  "since": "2014",
  "locale": "en-GB",            // BCP-47; drives Intl formatting
  "currency": "GBP",            // ISO 4217
  "timeZone": "Europe/London",  // IANA; the shop's local day
  "taxRate": 0,                 // decimal, e.g. 0.0875
  "taxNote": "Most bakery food is zero-rated for VAT in the UK.",

  "capabilities": {
    "pickup": true, "delivery": true, "customCakes": true,
    "inscriptions": true, "gifting": true, "giftPackaging": true,
    "guestCheckout": true
  },

  "locations": [{
    "id": "bellevue",
    "name": "Bellevue Road",
    "address": "68 Bellevue Road, London SW17 7EQ",
    "phone": "020 7946 0712",
    "default": true,
    "slots": ["07:30–09:30", "09:30–11:30"]   // display strings
  }],

  "email": "hello@hazelandrye.co.uk",
  "hours": [{ "day": "Monday", "open": null },
            { "day": "Tuesday", "open": "07:30", "close": "17:30" }],

  "closedWeekdays": [1],                       // 0 = Sunday
  "closedDates": ["2026-12-25"],               // YYYY-MM-DD
  "cutoffHour": 11,                            // local hour, 0–23
  "maxDaysAhead": 60,
  "dailyCapacity": 40,

  "delivery": {                                // null when delivery is off
    "note": "By bike, within three miles.",
    "freeOver": 40,
    "zones": [{ "id": "sw17", "label": "Tooting & Balham",
                "prefixes": ["SW17", "SW12"], "fee": 3.5 }]
  },

  "allergens": ["gluten", "dairy"],
  "allergenStatement": "Everything is made in one small kitchen that…",
  "voice": { "kicker": "…", "headline": "…", "lede": "…" }
}
```

**Contract notes.** `capabilities` is load-bearing — the UI removes whole sections from
the DOM when a flag is false, it does not merely hide them. `delivery: null` and
`capabilities.delivery: false` must agree. `voice` is the masthead copy; omit it and the
page falls back to the copy written in the HTML.

---

## `getCatalogue(id?) → Catalogue`

`GET /api/merchants/:id/catalogue`

```jsonc
{
  "categories": [{ "id": "bread", "label": "Bread", "note": "Out by half seven" }],
  "occasions":  [{ "id": "birthday", "label": "Birthday" }],

  "optionGroups": {
    "servings": {
      "id": "servings", "label": "How many people?", "required": true,
      "help": "Slices are generous.",
      "options": [
        { "id": "m", "label": "8 inch", "note": "Serves 14–16", "price": 16 },
        { "id": "fondant", "label": "Fondant figures", "price": 28,
          "leadDays": 4,                      // adds to the product's own lead time
          "allergens": ["nuts"],              // merged into the product's allergens
          "requiresServings": ["m", "l"] }    // incompatibility rule
      ]
    }
  },

  "addons": [{ "id": "candles", "label": "Birthday candles",
               "note": "Pack of 24", "price": 2 }],

  "products": [{
    "id": "birthday-cake",
    "kind": "cake",                 // "cake" = made to order | "everyday" = stocked
    "category": "cakes",
    "name": "Birthday Cake",
    "subtitle": "Six layers, naturally coloured",
    "price": 34,                    // major units; "from" price when options exist
    "leadDays": 2,
    "batchSize": null,              // null = made to order; a number = daily batch
    "image": "photo-1464349095431-e9a21285b5f3",   // null is valid → monogram
    "occasions": ["birthday"],
    "popular": true,
    "allergens": ["gluten", "dairy", "egg"],
    "description": "The one we make most…",
    "options": ["servings", "sponge", "finish"],   // keys into optionGroups
    "defaults": { "servings": "m" },
    "inscribable": true,
    "availableWeekdays": [5, 6, 0]  // optional; omit for "every open day"
  }]
}
```

**Contract notes.** `price` is in major units with at most 2 decimals; the client converts
to minor units before arithmetic. `batchSize: null` is the signal for "made to order" and
changes the whole UI treatment — rows become photo tiles. `image: null` is explicitly
supported and must not be treated as an error.

---

## `getProducts(filter?) → Product[]`

`GET /api/merchants/:id/products?category=&occasion=&q=`

Filtering and search are client-side today. A server implementation should keep the same
shape and the same forgiving search (prefix, then one-character typo tolerance).

## `getProduct(productId) → Product | null`

`GET /api/merchants/:id/products/:productId` — `null` rather than a 404 throw, so the page
can render its own "we don't have that one" state.

---

## `getAvailability(date, locationId?) → Availability`

`GET /api/merchants/:id/availability?date=YYYY-MM-DD&location=bellevue`

```jsonc
{
  "date": "2026-10-20",
  "state": "available",           // available | lead | closed | holiday | full | past
  "capacity": { "cap": 40, "taken": 12, "left": 28 },
  "slots": [{ "time": "09:30–11:30", "left": 4, "full": false }],
  "location": "bellevue"
}
```

**Contract notes.** `state` must be authoritative. `left` on a slot may be approximate for
display, but `full` must be correct — the UI disables a full slot and a customer who gets
past it will be turned away at the counter.

---

## `checkDeliveryZone(postcode) → ZoneResult`

`POST /api/merchants/:id/delivery-check` · `{ "postcode": "SW17 7EQ" }`

```jsonc
// 200 — in range
{ "ok": true, "zone": { "id": "sw17", "label": "Tooting & Balham", "fee": 3.5 } }

// 200 — out of range. Not an error: it has a useful answer.
{ "ok": false, "reason": "We don't deliver to EC1A yet — but you can collect from the shop." }
```

**Contract notes.** Out of range returns `200`, not `4xx`. `reason` is shown to the
customer verbatim, so it must be written for them and should offer the alternative.

---

## `placeOrder(order) → Receipt`

`POST /api/orders`

```jsonc
{
  "merchantId": "hazel-and-rye",
  "fulfilment": {
    "method": "pickup",              // pickup | delivery
    "locationId": "bellevue",
    "date": "2026-10-20",
    "slot": "09:30–11:30",           // required when method is pickup
    "zone": "sw17",                  // required when method is delivery
    "address": "12 Example Road",
    "postcode": "SW17 7EQ"
  },
  "customer": { "name": "Ada Mensah", "email": "ada@example.com", "phone": "07700 900123" },
  "gift": { "isGift": true, "message": "Happy birthday",
            "recipientName": "Sam", "hidePrices": true },
  "notes": "Nut allergy — please bag separately.",
  "lines": [{
    "productId": "birthday-cake",
    "selections": { "servings": "m", "sponge": "vanilla", "finish": "fondant" },
    "addons": ["candles"],
    "inscription": "Happy Birthday Sam",
    "qty": 1,
    "readyBy": "2026-10-24"
  }],
  "total": 78.00,                    // client's figure, for cross-checking only
  "payment": { "card": "4242…" }     // replace with a provider token before production
}
```

```jsonc
// 201
{ "reference": "HR-4821", "placedAt": "2026-10-17T09:14:22.000Z", "total": 78.00 }

// 402 — declined
{ "error": "card_declined", "message": "Your bank declined the payment. No money has been taken." }

// 409 — slot or stock went while they were typing
{ "error": "slot_taken", "message": "That collection time has just gone. Pick another." }

// 422 — the client's total disagrees with the server's
{ "error": "total_mismatch", "message": "Prices have changed. Please review your ticket." }
```

**Contract notes.** The server must recompute the total and reject on mismatch rather than
trusting `total`. `message` is displayed verbatim, so it is customer-facing copy, not a
developer string. The client keeps the basket intact on any failure — do not expect it to
have been consumed.

**Payment.** `payment.card` is a raw number only because this is a simulation. In
production this field becomes a provider token (Stripe PaymentIntent or equivalent) and
no card data touches this template.

### Simulated failures

| Card | Result |
|---|---|
| `4000 0000 0000 0002` | 402 declined |
| `4000 0000 0000 0119` | 503 provider unreachable |
| anything else | 201 success |

---

## Things the template assumes

- **Money** is major units in JSON, minor units in arithmetic. Never send floats you have
  already rounded.
- **Dates** are `YYYY-MM-DD` in the shop's local calendar, never ISO instants. `dates.js`
  deliberately avoids `toISOString()`, which shifts the day west of Greenwich.
- **Ordering** of `products` is the display order; the client does not re-sort except to
  sink sold-out items.
- **Unknown fields** are ignored, so the API may add to these shapes freely.
