/* ==========================================================================
   SHARED — store.js
   The commerce layer: dates, lead times, capacity, pricing, cart.

   This file holds no presentation. It is the part of the template that should
   survive unchanged into the other four creative directions.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Catalogue helpers
   -------------------------------------------------------------------------- */

/* Photography lives in shared/img at three stored widths. Templates sit at
   templates/<name>/, so the path is relative to that depth. */
function img(id, width = 900) {
  if (!id) return null;
  const bucket = width <= 320 ? 'sm' : width <= 900 ? 'md' : 'lg';
  return `../../shared/img/${id}-${bucket}.jpg`;
}

function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

/* --------------------------------------------------------------------------
   Formatting
   -------------------------------------------------------------------------- */
const money = (n) =>
  new Intl.NumberFormat(MERCHANT.locale, {
    style: 'currency',
    currency: MERCHANT.currency,
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);

const moneyExact = (n) =>
  new Intl.NumberFormat(MERCHANT.locale, {
    style: 'currency',
    currency: MERCHANT.currency,
  }).format(n);

const fmtDate = (d, opts) =>
  new Intl.DateTimeFormat(MERCHANT.locale, opts || { weekday: 'short', day: 'numeric', month: 'short' }).format(d);

const fmtDateLong = (d) =>
  new Intl.DateTimeFormat(MERCHANT.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);

/* --------------------------------------------------------------------------
   Dates
   -------------------------------------------------------------------------- */
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function today() {
  return startOfDay(new Date());
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return startOfDay(x);
}

function dateKey(d) {
  const x = startOfDay(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function keyToDate(key) {
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return null;
  return startOfDay(new Date(y, m - 1, d));
}

function sameDay(a, b) {
  return a && b && dateKey(a) === dateKey(b);
}

/* Past the cutoff, today no longer counts toward the lead time. This is the
   rule the countdown in the header is counting down to. */
function cutoffPassed() {
  return new Date().getHours() >= MERCHANT.cutoffHour;
}

/* Time to the next cutoff. Past today's, it rolls to tomorrow's rather than
   disappearing — the deadline is still real, it has simply moved, and the
   earliest date already reflects that. */
function msUntilCutoff() {
  const now = new Date();
  const cut = new Date(now);
  cut.setHours(MERCHANT.cutoffHour, 0, 0, 0);
  if (cut <= now) cut.setDate(cut.getDate() + 1);
  return cut - now;
}

function isClosed(d) {
  return MERCHANT.closedWeekdays.includes(startOfDay(d).getDay());
}

/* Capacity. A real shop has a finite number of cakes it can finish in a day.
   Deterministic from the date so the calendar does not reshuffle on reload. */
function capacityFor(d) {
  const key = dateKey(d);
  // FNV-1a. A naive polynomial hash clusters badly across date strings that
  // differ by one character, which made almost every day read as booked.
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const v = (h >>> 0) / 4294967296;
  const dow = startOfDay(d).getDay();
  // Weekends are the pinch point for a celebration-cake shop.
  const pressure = dow === 6 || dow === 0 ? 0.38 : 0.1;
  return v < pressure ? 0 : 1;
}

/* Lead time is a property of the product and its chosen options, not of the
   shop. A sculpted two-tier and a next-day cookies-and-cream cake cannot
   share one global rule. */
function leadDaysFor(product, selections) {
  let lead = product.leadDays || 0;
  if (selections) {
    for (const groupId of product.options || []) {
      const group = OPTION_GROUPS[groupId];
      if (!group) continue;
      const chosen = group.options.find((o) => o.id === selections[groupId]);
      if (chosen && chosen.leadDays) lead += chosen.leadDays;
    }
  }
  return lead;
}

function earliestFor(leadDays) {
  const start = addDays(today(), leadDays + (cutoffPassed() ? 1 : 0));
  let d = start;

  for (let i = 0; i <= MERCHANT.maxDaysAhead; i++) {
    if (!isClosed(d) && capacityFor(d)) return d;
    d = addDays(d, 1);
  }

  // Nothing open inside the booking window. Fall back to the first day the
  // shop is simply open, rather than handing back a date months away.
  d = start;
  for (let i = 0; i <= 14; i++) {
    if (!isClosed(d)) return d;
    d = addDays(d, 1);
  }
  return start;
}

/* The single source of truth for what a calendar cell means. */
function dayState(d, leadDays) {
  const day = startOfDay(d);
  const min = addDays(today(), (leadDays || 0) + (cutoffPassed() ? 1 : 0));
  const max = addDays(today(), MERCHANT.maxDaysAhead);
  if (day < today()) return 'past';
  if (day < min) return 'lead';
  if (day > max) return 'past';
  if (isClosed(day)) return 'closed';
  if (!capacityFor(day)) return 'full';
  return 'available';
}

const DAY_STATE_REASON = {
  past: 'In the past',
  lead: 'Not enough notice for this cake',
  closed: 'The atelier is closed',
  full: 'Fully booked',
  available: 'Available',
};

/* --------------------------------------------------------------------------
   Persisted state
   -------------------------------------------------------------------------- */
/* Storage is namespaced per merchant. Two templates served from the same
   origin are two different shops, and must not share a basket. */
const LS_NS = String(MERCHANT.shortName || 'shop').toLowerCase().replace(/[^a-z0-9]+/g, '');
const LS_CART = `${LS_NS}.cart.v1`;
const LS_DATE = `${LS_NS}.readyby.v1`;

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* Private browsing, or storage disabled. The page still works; the
       selection simply does not survive a reload. */
  }
}

/* --------------------------------------------------------------------------
   Ready-by date (global)
   -------------------------------------------------------------------------- */
function getReadyBy() {
  const stored = keyToDate(safeRead(LS_DATE, null));
  // A stored date that has since gone stale or sold out is silently replaced
  // rather than left to fail at checkout.
  if (stored && dayState(stored, 0) === 'available') return stored;
  return earliestFor(0);
}

function setReadyBy(d) {
  safeWrite(LS_DATE, dateKey(d));
  document.dispatchEvent(new CustomEvent('readyby:change', { detail: { date: d } }));
}

/* --------------------------------------------------------------------------
   Pricing
   -------------------------------------------------------------------------- */
function priceLine(product, selections, addons, qty) {
  let unit = product.price;
  const parts = [];

  for (const groupId of product.options || []) {
    const group = OPTION_GROUPS[groupId];
    if (!group) continue;
    const chosen = group.options.find((o) => o.id === (selections || {})[groupId]);
    if (!chosen) continue;
    unit += chosen.price || 0;
    parts.push({ group: group.label, label: chosen.label, price: chosen.price || 0 });
  }

  let addonTotal = 0;
  const addonParts = [];
  for (const id of addons || []) {
    const a = ADDONS.find((x) => x.id === id);
    if (!a) continue;
    addonTotal += a.price;
    addonParts.push({ label: a.label, price: a.price });
  }

  const quantity = Math.max(1, qty || 1);
  return {
    unit,
    addonTotal,
    quantity,
    total: (unit + addonTotal) * quantity,
    parts,
    addonParts,
  };
}

/* --------------------------------------------------------------------------
   Cart
   -------------------------------------------------------------------------- */
function getCart() {
  const cart = safeRead(LS_CART, { lines: [], fulfilment: null });
  if (!Array.isArray(cart.lines)) cart.lines = [];
  return cart;
}

function saveCart(cart) {
  safeWrite(LS_CART, cart);
  document.dispatchEvent(new CustomEvent('cart:change', { detail: { cart } }));
}

function cartCount(cart) {
  return (cart || getCart()).lines.reduce((n, l) => n + l.qty, 0);
}

function lineSignature(line) {
  return [
    line.productId,
    JSON.stringify(line.selections || {}),
    (line.addons || []).slice().sort().join(','),
    line.inscription || '',
    line.readyBy || '',
  ].join('|');
}

function addToCart(line) {
  const cart = getCart();
  const sig = lineSignature(line);
  const existing = cart.lines.find((l) => lineSignature(l) === sig);
  if (existing) {
    existing.qty += line.qty || 1;
  } else {
    cart.lines.push({
      id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      productId: line.productId,
      selections: line.selections || {},
      addons: line.addons || [],
      inscription: line.inscription || '',
      readyBy: line.readyBy,
      qty: line.qty || 1,
    });
  }
  saveCart(cart);
  return cart;
}

function updateLineQty(lineId, qty) {
  const cart = getCart();
  const line = cart.lines.find((l) => l.id === lineId);
  if (!line) return cart;
  if (qty <= 0) {
    cart.lines = cart.lines.filter((l) => l.id !== lineId);
  } else {
    line.qty = Math.min(qty, 20);
  }
  saveCart(cart);
  return cart;
}

function removeLine(lineId) {
  const cart = getCart();
  cart.lines = cart.lines.filter((l) => l.id !== lineId);
  saveCart(cart);
  return cart;
}

function clearCart() {
  saveCart({ lines: [], fulfilment: null });
}

/* The whole order is ready on the latest date any single cake can be ready.
   Surfacing this in the cart — rather than at checkout — is the point. */
function cartReadyBy(cart) {
  const dates = (cart || getCart()).lines.map((l) => keyToDate(l.readyBy)).filter(Boolean);
  if (!dates.length) return null;
  return new Date(Math.max.apply(null, dates));
}

function cartTotals(cart, fulfilment) {
  const c = cart || getCart();
  let subtotal = 0;

  for (const line of c.lines) {
    const product = getProduct(line.productId);
    if (!product) continue;
    subtotal += priceLine(product, line.selections, line.addons, line.qty).total;
  }

  const method = (fulfilment && fulfilment.method) || 'pickup';
  let shipping = 0;
  if (method === 'delivery' && subtotal > 0) {
    const zone = MERCHANT.delivery.zones.find((z) => z.label === (fulfilment && fulfilment.zone));
    shipping = zone ? zone.fee : MERCHANT.delivery.fee;
    if (subtotal >= MERCHANT.delivery.freeOver) shipping = 0;
  }

  const tax = Math.round((subtotal + shipping) * MERCHANT.tax * 100) / 100;
  return {
    subtotal,
    shipping,
    tax,
    total: Math.round((subtotal + shipping + tax) * 100) / 100,
    freeDeliveryGap: Math.max(0, MERCHANT.delivery.freeOver - subtotal),
  };
}

/* A readable one-line summary of a configured cake, used in the cart, the
   checkout review and the confirmation. */
function describeLine(line) {
  const product = getProduct(line.productId);
  if (!product) return '';
  const bits = [];
  for (const groupId of product.options || []) {
    const group = OPTION_GROUPS[groupId];
    const chosen = group && group.options.find((o) => o.id === line.selections[groupId]);
    if (chosen) bits.push(chosen.label);
  }
  return bits.join(' · ');
}
