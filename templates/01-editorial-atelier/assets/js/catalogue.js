/* ==========================================================================
   TEMPLATE 01 — The Editorial Atelier
   Brand data: merchant configuration, option groups and catalogue.

   The commerce logic in shared/js/store.js reads MERCHANT, PRODUCTS,
   OPTION_GROUPS and ADDONS as globals, so this file is the only thing that
   has to change to re-brand the template.

   Everything a merchant can switch on or off lives in MERCHANT. The brief is
   explicit that not every bakery offers delivery, custom cakes, or every
   personalisation option — so the interface reads these flags rather than
   assuming a full-service shop.
   ========================================================================== */

const MERCHANT = {
  name: 'Crumb Atelier',
  shortName: 'Crumb',
  tagline: 'A cake atelier',
  city: 'Brooklyn, New York',
  address: '114 Wythe Avenue, Brooklyn NY 11249',
  phone: '(718) 555-0142',
  email: 'studio@crumbatelier.com',
  currency: 'USD',
  currencySymbol: '$',
  locale: 'en-US',

  // --- Capability flags -----------------------------------------------------
  capabilities: {
    delivery: true,
    pickup: true,
    inscriptions: true,
    gifting: true,
    giftPackaging: true,
    scheduledDelivery: true,
    guestCheckout: true,
  },

  // --- Fulfilment rules -----------------------------------------------------
  // Orders placed after the cutoff roll forward a day. Baymard's checkout
  // research recommends showing a cutoff as a live countdown rather than a
  // static time, which is what the header does with this value.
  cutoffHour: 14, // 2:00pm local
  closedWeekdays: [1], // Monday — 0 = Sunday
  maxDaysAhead: 90,

  delivery: {
    fee: 12,
    freeOver: 150,
    zones: [
      { label: 'Brooklyn & Lower Manhattan', postcodes: '112xx, 100xx', fee: 12 },
      { label: 'Greater Manhattan & Queens', postcodes: '101xx, 111xx', fee: 18 },
    ],
    note: 'Delivered chilled by our own couriers between 9am and 2pm.',
  },

  pickup: {
    location: '114 Wythe Avenue, Brooklyn',
    windows: ['9:00 – 11:00', '11:00 – 13:00', '13:00 – 15:00', '15:00 – 17:00'],
  },

  tax: 0.08875, // NYC combined rate
};

/* --------------------------------------------------------------------------
   Occasions — occasion-first navigation is the established pattern across the
   best UK cake retailers (Konditor, Cake Box, Bettys) and it is how customers
   actually arrive: they have an event, not a flavour, in mind.
   -------------------------------------------------------------------------- */
const OCCASIONS = [
  { id: 'birthday', label: 'Birthday', note: 'Candles optional, sprinkles encouraged' },
  { id: 'celebration', label: 'Celebration', note: 'Promotions, engagements, good news' },
  { id: 'anniversary', label: 'Anniversary', note: 'Years counted in layers' },
  { id: 'thank-you', label: 'Thank You', note: 'Better than a card' },
  { id: 'just-because', label: 'Just Because', note: 'The best reason there is' },
];

/* --------------------------------------------------------------------------
   Option groups. Each product references the groups that apply to it, so a
   merchant selling only fixed cakes simply omits them.
   -------------------------------------------------------------------------- */
const OPTION_GROUPS = {
  size: {
    id: 'size',
    label: 'Size',
    help: 'Servings are generous slices, not catering portions.',
    required: true,
    options: [
      { id: '6in', label: '6 inch', detail: '8–10 servings', price: 0, leadDays: 0 },
      { id: '8in', label: '8 inch', detail: '14–16 servings', price: 28, leadDays: 0 },
      { id: '10in', label: '10 inch', detail: '22–26 servings', price: 62, leadDays: 1 },
      { id: 'tiered', label: 'Two tier', detail: '40–50 servings', price: 145, leadDays: 4 },
    ],
  },
  sponge: {
    id: 'sponge',
    label: 'Sponge',
    required: true,
    options: [
      { id: 'vanilla', label: 'Tahitian vanilla', price: 0 },
      { id: 'chocolate', label: 'Valrhona chocolate', price: 0 },
      { id: 'pistachio', label: 'Pistachio & olive oil', price: 9 },
      { id: 'lemon', label: 'Lemon & poppyseed', price: 6 },
      { id: 'red-velvet', label: 'Red velvet', price: 6 },
    ],
  },
  filling: {
    id: 'filling',
    label: 'Filling',
    required: true,
    options: [
      { id: 'buttercream', label: 'Vanilla bean buttercream', price: 0 },
      { id: 'ganache', label: 'Dark chocolate ganache', price: 8 },
      { id: 'raspberry', label: 'Raspberry compote & cream', price: 10 },
      { id: 'salted-caramel', label: 'Salted caramel', price: 10 },
      { id: 'mascarpone', label: 'Coffee mascarpone', price: 12 },
    ],
  },
  finish: {
    id: 'finish',
    label: 'Finish',
    required: true,
    options: [
      { id: 'swept', label: 'Swept buttercream', detail: 'Our house finish', price: 0 },
      { id: 'bare', label: 'Bare & dusted', detail: 'Layers left visible', price: 0 },
      { id: 'drip', label: 'Ganache drip', detail: 'Poured to the edge', price: 14 },
      { id: 'florals', label: 'Hand-piped florals', detail: 'Adds 2 days', price: 46, leadDays: 2 },
    ],
  },
};

/* --------------------------------------------------------------------------
   Add-ons. Complementary, not manipulative — the brief is specific that these
   opportunities should feel helpful.
   -------------------------------------------------------------------------- */
const ADDONS = [
  {
    id: 'candles',
    label: 'Beeswax candles',
    detail: 'Set of twelve, hand-dipped',
    price: 9,
    image: 'photo-1519869325930-281384150729',
  },
  {
    id: 'cupcakes',
    label: 'Six matching cupcakes',
    detail: 'Same sponge, same finish',
    price: 24,
    image: 'photo-1486427944299-d1955d23e34d',
  },
  {
    id: 'card',
    label: 'Letterpress card',
    detail: 'Printed with your message',
    price: 6,
    image: null,
  },
  {
    id: 'knife',
    label: 'Serving knife & plates',
    detail: 'For twelve',
    price: 14,
    image: null,
  },
];

/* --------------------------------------------------------------------------
   The catalogue. Plate numbers are the organising idea: each cake is a
   catalogued work, with a maker and a provenance.
   -------------------------------------------------------------------------- */
const PRODUCTS = [
  {
    id: 'noir',
    plate: '01',
    name: 'Noir',
    subtitle: 'Valrhona ganache, poured warm',
    price: 78,
    leadDays: 2,
    image: 'photo-1588195538326-c5b1e9f80a1b',
    occasions: ['birthday', 'celebration', 'thank-you'],
    maker: 'Ines Okonkwo',
    year: '2021',
    story:
      'The cake we are asked for most, and the one we have changed least. A dark chocolate sponge soaked in espresso, three layers of ganache whipped until it holds a ribbon, and a pour of the same ganache warm enough to find its own edge. It is not decorated. It does not need to be.',
    notes: ['Valrhona Guanaja 70%', 'Espresso soak', 'No added colour'],
    options: ['size', 'sponge', 'filling', 'finish'],
    defaults: { size: '8in', sponge: 'chocolate', filling: 'ganache', finish: 'drip' },
    inscribable: true,
    featured: true,
  },
  {
    id: 'framboise',
    plate: '02',
    name: 'Framboise',
    subtitle: 'Raspberry, white chocolate, cream',
    price: 82,
    leadDays: 2,
    image: 'photo-1565958011703-44f9829ba187',
    occasions: ['anniversary', 'celebration', 'just-because'],
    maker: 'Ines Okonkwo',
    year: '2022',
    story:
      'Raspberries are picked at the point where they are almost too soft to travel, then folded through a compote that is cooked for four minutes and no longer. White chocolate cream between the layers keeps the acidity in check. Best eaten the day it is made, which is why we will not ship it.',
    notes: ['Pickup & local delivery only', 'Contains dairy', 'Seasonal — May to October'],
    options: ['size', 'sponge', 'filling', 'finish'],
    defaults: { size: '8in', sponge: 'vanilla', filling: 'raspberry', finish: 'bare' },
    inscribable: true,
    featured: true,
  },
  {
    id: 'winterberry',
    plate: '03',
    name: 'Winterberry',
    subtitle: 'Two tier, dressed in fruit',
    price: 240,
    leadDays: 7,
    image: 'photo-1535141192574-5d4897c12636',
    occasions: ['celebration', 'anniversary'],
    maker: 'Daniel Vasquez',
    year: '2020',
    story:
      'Built for rooms with more than forty people in them. Two tiers of vanilla sponge under a swept white buttercream, then dressed — not decorated — with whatever the market has that morning. No two have ever matched, and we have stopped trying.',
    notes: ['Seven days notice', 'Fruit varies by season', 'Serves 40–50'],
    options: ['size', 'sponge', 'filling', 'finish'],
    defaults: { size: 'tiered', sponge: 'vanilla', filling: 'buttercream', finish: 'swept' },
    inscribable: false,
    featured: true,
  },
  {
    id: 'jardin',
    plate: '04',
    name: 'Jardin',
    subtitle: 'Hand-piped buttercream florals',
    price: 148,
    leadDays: 5,
    image: 'photo-1562777717-dc6984f65a63',
    occasions: ['birthday', 'anniversary', 'thank-you'],
    maker: 'Mei Lin Soh',
    year: '2023',
    story:
      'Every flower is piped by hand in Swiss meringue buttercream, one petal at a time, in the two hours before the shop opens. Mei trained as a botanical illustrator before she trained as a pastry chef, which is why the roses have the right number of petals.',
    notes: ['Five days notice', 'Colours matched on request', 'Entirely edible'],
    options: ['size', 'sponge', 'filling', 'finish'],
    defaults: { size: '8in', sponge: 'lemon', filling: 'buttercream', finish: 'florals' },
    inscribable: true,
    featured: false,
  },
  {
    id: 'caffe',
    plate: '05',
    name: 'Caffè',
    subtitle: 'Coffee, mascarpone, cocoa',
    price: 74,
    leadDays: 2,
    image: 'photo-1571115177098-24ec42ed204d',
    occasions: ['thank-you', 'just-because', 'celebration'],
    maker: 'Daniel Vasquez',
    year: '2019',
    story:
      'A tiramisù that has been persuaded to stand up on its own. Six thin layers of coffee-soaked sponge, mascarpone cream between each, and enough cocoa on top that the first slice always makes a mess. We consider that part of it.',
    notes: ['Contains raw egg', 'Cut cold, serve at room temperature'],
    options: ['size', 'sponge', 'filling', 'finish'],
    defaults: { size: '8in', sponge: 'chocolate', filling: 'mascarpone', finish: 'bare' },
    inscribable: true,
    featured: false,
  },
  {
    id: 'midnight',
    plate: '06',
    name: 'Midnight',
    subtitle: 'Cookies, cream, dark cocoa',
    price: 68,
    leadDays: 1,
    image: 'photo-1557925923-cd4648e211a0',
    occasions: ['birthday', 'just-because'],
    maker: 'Ines Okonkwo',
    year: '2024',
    story:
      'The one the staff eat. Dark cocoa sponge, cookies crushed coarse enough that you can still tell what they were, and a cream that is barely sweet. It takes a day, not a week, which makes it the cake for the celebration you forgot about until Thursday.',
    notes: ['Next-day available', 'Our fastest cake', 'Serves 8–10'],
    options: ['size', 'sponge', 'filling', 'finish'],
    defaults: { size: '6in', sponge: 'chocolate', filling: 'buttercream', finish: 'swept' },
    inscribable: true,
    featured: false,
  },
  {
    id: 'prism',
    plate: '07',
    name: 'Prism',
    subtitle: 'Six colours, naturally dyed',
    price: 96,
    leadDays: 3,
    image: 'photo-1464349095431-e9a21285b5f3',
    occasions: ['birthday', 'celebration'],
    maker: 'Mei Lin Soh',
    year: '2023',
    story:
      'Colour from beetroot, turmeric, butterfly pea, spirulina, raspberry and nothing else. The shades are quieter than the ones you get from a bottle, and they change a little depending on the week. Children do not notice. Their parents always do.',
    notes: ['No artificial colour', 'Three days notice', 'Six layers'],
    options: ['size', 'sponge', 'filling', 'finish'],
    defaults: { size: '8in', sponge: 'vanilla', filling: 'buttercream', finish: 'swept' },
    inscribable: true,
    featured: false,
  },
  {
    id: 'grand',
    plate: '08',
    name: 'Grand Chocolat',
    subtitle: 'Piped, drizzled, unrestrained',
    price: 92,
    leadDays: 3,
    image: 'photo-1578985545062-69928b1d9587',
    occasions: ['birthday', 'celebration', 'anniversary'],
    maker: 'Daniel Vasquez',
    year: '2018',
    story:
      'The oldest cake in the book and the least subtle. Chocolate sponge, chocolate buttercream piped in a crown around the top, chocolate sauce over the lot. Daniel made the first one for his mother and has not been allowed to take it off the menu since.',
    notes: ['Serves 14–16 at 8 inch', 'Contains nuts', 'House favourite since 2018'],
    options: ['size', 'sponge', 'filling', 'finish'],
    defaults: { size: '8in', sponge: 'chocolate', filling: 'ganache', finish: 'swept' },
    inscribable: true,
    featured: false,
  },
];

/* --------------------------------------------------------------------------
   Editorial content
   -------------------------------------------------------------------------- */
const PRESS = [
  { quote: 'The most considered cake in the city, and the least showy about it.', source: 'The New Yorker' },
  { quote: 'Ines Okonkwo is doing something closer to still-life than to baking.', source: 'Cherry Bombe' },
  { quote: 'You will queue. It is worth queuing.', source: 'Eater NY' },
  { quote: 'A shop that treats a birthday cake with the seriousness of a commission.', source: 'Kinfolk' },
];

const JOURNAL = [
  {
    title: 'On the correct amount of cocoa',
    standfirst: 'Which is: slightly more than looks sensible.',
    date: 'October 2026',
  },
  {
    title: 'Why we stopped taking orders on Mondays',
    standfirst: 'A short note about rest, and about the quality of a Tuesday cake.',
    date: 'September 2026',
  },
  {
    title: 'Six colours from a vegetable garden',
    standfirst: 'How Prism gets its palette without a single bottle of food dye.',
    date: 'August 2026',
  },
];
