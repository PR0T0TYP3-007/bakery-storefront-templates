/* ==========================================================================
   TEMPLATE 05 — The Modern Neighbourhood Bakery
   Brand data: merchant configuration, option groups and catalogue.

   A deliberately different merchant from Template 01, to prove the shared
   commerce layer is configuration-driven rather than hard-coded:

     · Mostly everyday stock with no options at all, not made-to-order work
     · Same-day collection with an 11am cutoff, not multi-day lead times
     · Gifting switched OFF — a corner bakery does not do recipient delivery
     · No sales tax (Oregon), which exercises the zero case in the totals
   ========================================================================== */

const MERCHANT = {
  name: 'Bluebird Bakery',
  shortName: 'Bluebird',
  tagline: 'Your corner bakery',
  city: 'Portland, Oregon',
  address: '1142 SE Division St, Portland OR 97202',
  phone: '(503) 555-0118',
  email: 'hello@bluebirdbakery.com',
  currency: 'USD',
  currencySymbol: '$',
  locale: 'en-US',
  since: '2009',

  // --- Capability flags -----------------------------------------------------
  capabilities: {
    delivery: true,
    pickup: true,
    inscriptions: true,
    gifting: false, // a neighbourhood bakery does not run a gifting service
    giftPackaging: false,
    scheduledDelivery: false,
    guestCheckout: true,
  },

  // --- Fulfilment rules -----------------------------------------------------
  // Order by 11am and you can collect the same day. This is the single most
  // important number in the whole interface, so it is on every page.
  cutoffHour: 11,
  closedWeekdays: [1], // Monday
  maxDaysAhead: 60,

  hours: [
    { days: 'Tuesday – Friday', time: '7:00am – 5:00pm' },
    { days: 'Saturday – Sunday', time: '7:30am – 4:00pm' },
    { days: 'Monday', time: 'Closed' },
  ],

  delivery: {
    fee: 6,
    freeOver: 45,
    zones: [
      { label: 'Southeast Portland', postcodes: '97202, 97214, 97215', fee: 6 },
      { label: 'Inner Northeast & Downtown', postcodes: '97212, 97232, 97205', fee: 9 },
    ],
    note: 'By bike, within three miles of the shop, between 8am and noon.',
  },

  pickup: {
    location: '1142 SE Division St',
    windows: ['7:00 – 9:00', '9:00 – 11:00', '11:00 – 13:00', '13:00 – 15:00', '15:00 – 17:00'],
  },

  tax: 0, // Oregon has no sales tax
};

/* --------------------------------------------------------------------------
   Categories — a shop you walk around, not a catalogue you leaf through.
   -------------------------------------------------------------------------- */
const CATEGORIES = [
  { id: 'bread', label: 'Bread', note: 'Baked at four, out by seven' },
  { id: 'pastry', label: 'Pastry', note: 'Laminated the day before' },
  { id: 'cookies', label: 'Cookies', note: 'By the box' },
  { id: 'cakes', label: 'Cakes', note: 'Two days notice' },
];

/* Occasions still exist, but they are a smaller part of this shop. */
const OCCASIONS = [
  { id: 'birthday', label: 'Birthday', note: 'Candles in the drawer by the till' },
  { id: 'celebration', label: 'Celebration', note: 'Any excuse' },
  { id: 'everyday', label: 'Everyday', note: 'The reason we open at seven' },
];

/* --------------------------------------------------------------------------
   Option groups
   Most things here have none at all — that is the point of the template.
   -------------------------------------------------------------------------- */
const OPTION_GROUPS = {
  pack: {
    id: 'pack',
    label: 'How many',
    required: true,
    options: [
      { id: '4', label: 'Box of four', price: 0 },
      { id: '8', label: 'Box of eight', price: 9 },
      { id: '12', label: 'Box of twelve', price: 16 },
    ],
  },
  cakeSize: {
    id: 'cakeSize',
    label: 'Size',
    help: 'Slices are generous. Nobody has ever run out.',
    required: true,
    options: [
      { id: '6in', label: '6 inch', detail: 'Serves 8', price: 0 },
      { id: '8in', label: '8 inch', detail: 'Serves 14', price: 18 },
      { id: '10in', label: '10 inch', detail: 'Serves 22', price: 40, leadDays: 1 },
    ],
  },
  cakeSponge: {
    id: 'cakeSponge',
    label: 'Sponge',
    required: true,
    options: [
      { id: 'vanilla', label: 'Vanilla', price: 0 },
      { id: 'chocolate', label: 'Chocolate', price: 0 },
      { id: 'carrot', label: 'Carrot & walnut', price: 4 },
      { id: 'lemon', label: 'Lemon', price: 4 },
    ],
  },
  cakeFinish: {
    id: 'cakeFinish',
    label: 'Finish',
    required: true,
    options: [
      { id: 'classic', label: 'Classic buttercream', detail: 'What most people pick', price: 0 },
      { id: 'sprinkles', label: 'Sprinkle sides', detail: 'Children, mostly', price: 6 },
      { id: 'fruit', label: 'Fresh fruit top', detail: 'Adds a day', price: 12, leadDays: 1 },
    ],
  },
};

const ADDONS = [
  { id: 'candles', label: 'Birthday candles', detail: 'Pack of twenty-four', price: 3, image: null },
  { id: 'coffee', label: 'Bag of our house coffee', detail: '12oz, ground or whole', price: 16, image: null },
  { id: 'jam', label: 'Jar of marionberry jam', detail: 'Made by Ruth down the road', price: 9, image: null },
];

/* --------------------------------------------------------------------------
   The shop
   `kind` separates one-tap everyday stock from made-to-order cakes. The two
   need genuinely different purchase flows, and the template serves both.
   -------------------------------------------------------------------------- */
const PRODUCTS = [
  {
    id: 'sourdough',
    kind: 'everyday',
    category: 'bread',
    name: 'Country Sourdough',
    subtitle: 'Naturally leavened, 48-hour ferment',
    price: 9,
    leadDays: 0,
    stockBase: 16,
    image: 'photo-1549931319-a545dcf3bc73',
    occasions: ['everyday'],
    story:
      'The loaf we built the shop on. Flour, water, salt and a starter that has been going since the week we opened. Out of the oven at four, on the shelf by seven, gone by eleven on a Saturday.',
    notes: ['Out at 7am', 'Contains wheat', 'Whole or half'],
    options: [],
    defaults: {},
    inscribable: false,
    popular: true,
  },
  {
    id: 'rye',
    kind: 'everyday',
    category: 'bread',
    name: 'Dark Rye & Seed',
    subtitle: 'Sunflower, pumpkin, caraway',
    price: 10,
    leadDays: 0,
    stockBase: 9,
    image: 'photo-1509440159596-0249088772ff',
    occasions: ['everyday'],
    story:
      'Dense, dark and faintly sour. Keeps for the best part of a week, which is just as well because very few people get through one in a day.',
    notes: ['Out at 7am', 'Keeps 5–6 days', 'Contains wheat & seeds'],
    options: [],
    defaults: {},
    inscribable: false,
  },
  {
    id: 'baguette',
    kind: 'everyday',
    category: 'bread',
    name: 'Baguette',
    subtitle: 'Thin, blistered, slightly scorched',
    price: 4.5,
    leadDays: 0,
    stockBase: 24,
    image: 'photo-1608198093002-ad4e005484ec',
    occasions: ['everyday'],
    story:
      'Baked twice a day, at six and again at two, because a baguette is only really a baguette for about four hours.',
    notes: ['Two bakes daily', 'Best within the day'],
    options: [],
    defaults: {},
    inscribable: false,
    popular: true,
  },
  {
    id: 'croissant',
    kind: 'everyday',
    category: 'pastry',
    name: 'Butter Croissant',
    subtitle: 'Laminated with Oregon butter',
    price: 4.75,
    leadDays: 0,
    stockBase: 30,
    image: 'photo-1555507036-ab1f4038808a',
    occasions: ['everyday'],
    story:
      'Three days from first fold to the counter. We make about thirty a day and we have never once had any left at closing.',
    notes: ['Out at 7am', 'Contains dairy & wheat'],
    options: [],
    defaults: {},
    inscribable: false,
    popular: true,
  },
  {
    id: 'pastry-box',
    kind: 'everyday',
    category: 'pastry',
    name: 'Morning Pastry Box',
    subtitle: "Six pastries, baker's choice",
    price: 22,
    leadDays: 0,
    stockBase: 7,
    image: 'photo-1530610476181-d83430b64dcd',
    occasions: ['everyday', 'celebration'],
    story:
      'Whatever came out best that morning — usually two croissants, two pains au chocolat, and two things we were experimenting with. The office-meeting order.',
    notes: ['Six pastries', "Baker's choice", 'Order by 11am'],
    options: [],
    defaults: {},
    inscribable: false,
    popular: true,
  },
  {
    id: 'doughnuts',
    kind: 'everyday',
    category: 'pastry',
    name: 'Sprinkle Doughnuts',
    subtitle: 'Raised, glazed, extremely bright',
    price: 3.5,
    leadDays: 0,
    stockBase: 20,
    image: 'photo-1551024601-bec78aea704b',
    occasions: ['everyday', 'birthday'],
    story:
      'Not sophisticated and not trying to be. Fridays and weekends only, because they are a treat and we would like them to stay that way.',
    notes: ['Fri – Sun only', 'Contains egg & dairy'],
    options: [],
    defaults: {},
    inscribable: false,
  },
  {
    id: 'choc-cookies',
    kind: 'everyday',
    category: 'cookies',
    name: 'Chocolate Chunk Cookies',
    subtitle: 'Brown butter, sea salt, 70% chocolate',
    price: 14,
    leadDays: 0,
    stockBase: 12,
    image: 'photo-1499636136210-6f4ee915583e',
    occasions: ['everyday', 'celebration'],
    story:
      'The dough rests for 36 hours before it goes anywhere near an oven. It makes more difference than it sounds like it should.',
    notes: ['36-hour dough', 'Contains nuts', 'Box of 4, 8 or 12'],
    options: ['pack'],
    defaults: { pack: '4' },
    inscribable: false,
    popular: true,
  },
  {
    id: 'oat-cookies',
    kind: 'everyday',
    category: 'cookies',
    name: 'Salted Oat Cookies',
    subtitle: 'Oats, dark chocolate, flaky salt',
    price: 14,
    leadDays: 0,
    stockBase: 10,
    image: 'photo-1558961363-fa8fdf82db35',
    occasions: ['everyday'],
    story:
      'Chewier than the chunk cookie and slightly less sweet. The one the regulars quietly prefer.',
    notes: ['Contains oats & dairy', 'Box of 4, 8 or 12'],
    options: ['pack'],
    defaults: { pack: '4' },
    inscribable: false,
  },
  {
    id: 'cupcakes',
    kind: 'everyday',
    category: 'cakes',
    name: 'Cookies & Cream Cupcakes',
    subtitle: 'Chocolate sponge, vanilla buttercream',
    price: 18,
    leadDays: 0,
    stockBase: 8,
    image: 'photo-1612203985729-70726954388c',
    occasions: ['birthday', 'celebration', 'everyday'],
    story:
      'The thing to bring to a classroom, an office, or a Tuesday. No notice needed if we have them, and we usually do.',
    notes: ['Box of 4, 8 or 12', 'Same day if in stock'],
    options: ['pack'],
    defaults: { pack: '4' },
    inscribable: false,
  },
  {
    id: 'birthday-cake',
    kind: 'cake',
    category: 'cakes',
    name: 'Birthday Cake',
    subtitle: 'Six layers, naturally coloured',
    price: 52,
    leadDays: 2,
    stockBase: null,
    image: 'photo-1464349095431-e9a21285b5f3',
    occasions: ['birthday', 'celebration'],
    story:
      'The one we make most. Colour comes from beetroot, turmeric and butterfly pea rather than a bottle, so the shades are a little quieter than you might expect. We will write on it.',
    notes: ['Two days notice', 'No artificial colour', 'Message included'],
    options: ['cakeSize', 'cakeSponge', 'cakeFinish'],
    defaults: { cakeSize: '8in', cakeSponge: 'vanilla', cakeFinish: 'sprinkles' },
    inscribable: true,
  },
  {
    id: 'chocolate-cake',
    kind: 'cake',
    category: 'cakes',
    name: 'Chocolate Celebration',
    subtitle: 'Piped, drizzled, unrestrained',
    price: 58,
    leadDays: 2,
    stockBase: null,
    image: 'photo-1578985545062-69928b1d9587',
    occasions: ['birthday', 'celebration'],
    story:
      'For people who, when asked what kind of cake they want, say "chocolate" and then stop talking.',
    notes: ['Two days notice', 'Contains nuts', 'Message included'],
    options: ['cakeSize', 'cakeSponge', 'cakeFinish'],
    defaults: { cakeSize: '8in', cakeSponge: 'chocolate', cakeFinish: 'classic' },
    inscribable: true,
  },
  {
    id: 'berry-cake',
    kind: 'cake',
    category: 'cakes',
    name: 'Berry Celebration',
    subtitle: 'Vanilla sponge under whatever is in season',
    price: 64,
    leadDays: 3,
    stockBase: null,
    image: 'photo-1535141192574-5d4897c12636',
    occasions: ['celebration', 'birthday'],
    story:
      'Dressed with fruit from the Hollywood farmers market on Saturday morning, which is why it needs three days and why no two have ever matched.',
    notes: ['Three days notice', 'Fruit varies', 'Message included'],
    options: ['cakeSize', 'cakeSponge', 'cakeFinish'],
    defaults: { cakeSize: '8in', cakeSponge: 'vanilla', cakeFinish: 'fruit' },
    inscribable: true,
  },
];

/* --------------------------------------------------------------------------
   "Your usual" — the repeat-purchase mechanic.
   A real shop would read this from the customer's order history; here it is
   a fixed example so the pattern is visible in the template.
   -------------------------------------------------------------------------- */
const LAST_ORDER = {
  when: 'Saturday',
  lines: [
    { productId: 'sourdough', selections: {}, qty: 1 },
    { productId: 'croissant', selections: {}, qty: 2 },
    { productId: 'choc-cookies', selections: { pack: '4' }, qty: 1 },
  ],
};

/* --------------------------------------------------------------------------
   What is on the shelf

   The honest answer depends on which day is being asked about, and the
   interface should not pretend otherwise:

     · Today  — a real count, falling through the day, and able to reach zero.
     · Later  — there is no shelf yet. All the shop can truthfully state is
                the size of that morning's batch, and whether it is already
                mostly pre-ordered.

   Claiming "15 left" for next Tuesday would be invented precision, and the
   board stops being worth reading the moment a customer catches it out.
   Deterministic from product and date so nothing reshuffles on reload; a real
   shop would read this from the morning's production sheet.
   -------------------------------------------------------------------------- */
function hash01(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function shelf(product, date) {
  if (!product || product.stockBase == null) {
    const lead = product ? product.leadDays : 0;
    return {
      mode: 'made',
      state: 'made',
      label: `${lead} ${lead === 1 ? 'day' : 'days'} notice`,
    };
  }

  const ahead = Math.round((startOfDay(date) - today()) / 86400000);
  const v = hash01(`${product.id}:${dateKey(date)}`);
  const lowAt = Math.max(2, Math.round(product.stockBase * 0.16));

  if (ahead <= 0) {
    const n = Math.max(0, Math.round(product.stockBase * (v * 0.55 - 0.03)));
    const state = n === 0 ? 'out' : n <= lowAt ? 'low' : 'in';
    return {
      mode: 'live',
      n,
      state,
      label: state === 'out' ? 'Sold out today' : `${n} left today`,
      short: state === 'out' ? 'Sold out' : `${n} left`,
    };
  }

  // Occasionally a future day is already spoken for by standing orders.
  if (v < 0.14) {
    return {
      mode: 'capacity',
      state: 'low',
      label: 'Mostly pre-ordered',
      short: 'Limited',
    };
  }

  return {
    mode: 'capacity',
    state: 'in',
    label: `${product.stockBase} baked that morning`,
    short: `${product.stockBase} a day`,
  };
}
