/**
 * @file The commission model. Pure, DOM-free, and the reason this template
 * exists.
 *
 * Why it is here and not in shared/core/
 * --------------------------------------
 * One template uses it. D3 and D9 set the rule the hard way: promote a
 * module when a *second* template needs it, not in anticipation. If Template
 * 03 ever prices bespoke work too, this moves to shared/core and the two
 * templates import it. Until then it lives next to the only thing that calls
 * it, and it stays pure so it can be tested the same way.
 *
 * Why it is not shared/core/pricing.js
 * ------------------------------------
 * `priceLine()` is additive: a base price plus the price of each chosen
 * option. That is right for a cake with a size and a sponge. It cannot
 * express how a studio actually quotes, which is a base for the *scale* of
 * the thing multiplied by how far you are taking it, and only then the
 * techniques added on top. Taking a brief from Clean to Editorial does not
 * add a fixed sum — it changes what the whole job costs.
 *
 * What the research found
 * -----------------------
 * Checked against two real studios at opposite ends of the market. ECBG
 * Studio (Chicago) publishes "custom cakes start at $300" and takes an
 * enquiry; a named manager quotes later. Yevnig (London) asks you to pick a
 * budget *band* — below £1,500, £1,500–3,000, above £3,000 — and books a
 * consultation. Neither lets you buy. The budget band is the honest
 * admission that they cannot price it on the page.
 *
 * So this module's whole job is to produce a firm number from a brief, and
 * to show its working, because a number nobody can check is just a different
 * kind of guess.
 */

/** Money in minor units internally, as in shared/core/pricing.js. */
import { applyTax } from '../../../shared/core/pricing.js';

const toMinor = (n) => Math.round(n * 100);
const toMajor = (n) => n / 100;

export const COMMISSION_KIND = 'commission';

/** @returns {boolean} whether a product is priced by this module. */
export const isCommission = (product) => product?.kind === COMMISSION_KIND;

function lookup(catalogue, groupId, optionId) {
  const group = catalogue?.optionGroups?.[groupId];
  if (!group) return null;
  return group.options.find((o) => o.id === optionId) ?? group.options[0] ?? null;
}

/**
 * How many techniques a brief at this ambition may carry.
 * A Clean brief with six techniques on it is not a clean brief, and a studio
 * that accepted one would be agreeing to something it cannot deliver.
 */
export function techniqueAllowance(catalogue, selections) {
  return lookup(catalogue, 'ambition', selections?.ambition)?.allows ?? 0;
}

/**
 * Whether a technique can go on this brief, and if not, why — so the control
 * can say so instead of being dead.
 * @returns {{ok:boolean, reason?:string}}
 */
export function techniqueAvailable(catalogue, selections, chosenIds, techniqueId) {
  if (chosenIds.includes(techniqueId)) return { ok: true };

  const ambition = lookup(catalogue, 'ambition', selections?.ambition);
  const allows = ambition?.allows ?? 0;
  if (chosenIds.length < allows) return { ok: true };

  const next = (catalogue.optionGroups.ambition.options ?? []).find((o) => (o.allows ?? 0) > allows);
  return {
    ok: false,
    reason: next
      ? `${ambition.label} briefs take ${allows}. Move to ${next.label} for more.`
      : `A brief takes ${allows} techniques.`,
  };
}

/**
 * Prices a commission brief and shows its working.
 *
 * @param {object} merchant
 * @param {object} catalogue
 * @param {{scale:string, ambition:string, palette:string}} selections
 * @param {string[]} techniqueIds
 * @param {{setup?:boolean}} [opts]
 * @returns {{
 *   base:number, factor:number, factored:number,
 *   techniques:Array<{id:string,label:string,price:number,leadDays:number}>,
 *   techniqueTotal:number, setup:number, subtotal:number,
 *   leadDays:number, deposit:number, balance:number,
 *   minimum:number, belowMinimum:boolean, shortfall:number,
 *   lines:Array<{label:string, detail?:string, amount:number}>
 * }}
 */
export function priceCommission(merchant, catalogue, selections, techniqueIds = [], opts = {}) {
  const cfg = merchant?.commission ?? {};
  const scale = lookup(catalogue, 'scale', selections?.scale);
  const ambition = lookup(catalogue, 'ambition', selections?.ambition);

  const base = toMinor(scale?.price ?? 0);
  const factor = ambition?.factor ?? 1;

  // Rounded here rather than at the end, so the figure shown on the "how far
  // we take it" line is the figure that was actually used.
  const factored = Math.round(base * factor);

  const all = catalogue?.addons ?? [];
  const techniques = techniqueIds
    .map((id) => all.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => ({ id: a.id, label: a.label, price: a.price, leadDays: a.leadDays ?? 0 }));

  const techniqueTotal = techniques.reduce((n, t) => n + toMinor(t.price), 0);
  const setup = opts.setup ? toMinor(cfg.setupFee ?? 0) : 0;

  const subtotal = factored + techniqueTotal + setup;

  // Lead time is additive, not the longest. One person builds the whole
  // piece, so drying the sugar flowers and building the armature happen one
  // after the other, not at once. It is why an ambitious brief genuinely
  // takes six weeks, and why saying so up front is the point.
  const leadDays = (ambition?.leadDays ?? 0) + techniques.reduce((n, t) => n + t.leadDays, 0);

  const minimum = toMinor(cfg.minimum ?? 0);
  const belowMinimum = subtotal < minimum;

  const depositPct = cfg.depositPct ?? 0;
  const deposit = Math.round(subtotal * depositPct);

  const lines = [
    { label: scale?.label ? `Scale — ${scale.label}` : 'Scale', detail: scale?.serves, amount: toMajor(base) },
    {
      label: `Taken to ${ambition?.label ?? '—'}`,
      detail: `× ${factor.toFixed(2)}`,
      amount: toMajor(factored - base),
    },
    ...techniques.map((t) => ({
      label: t.label,
      detail: t.leadDays ? `+${t.leadDays} ${t.leadDays === 1 ? 'day' : 'days'}` : undefined,
      amount: t.price,
    })),
    ...(setup ? [{ label: 'Delivery and set-up on site', amount: toMajor(setup) }] : []),
  ];

  return {
    base: toMajor(base),
    factor,
    factored: toMajor(factored),
    techniques,
    techniqueTotal: toMajor(techniqueTotal),
    setup: toMajor(setup),
    subtotal: toMajor(subtotal),
    leadDays,
    deposit: toMajor(deposit),
    balance: toMajor(subtotal - deposit),
    minimum: toMajor(minimum),
    belowMinimum,
    shortfall: toMajor(Math.max(0, minimum - subtotal)),
    lines,
  };
}

/**
 * Prices any line in this template's basket, dispatching on kind so the UI
 * does not have to care which of the two models applies. Returns the same
 * shape as shared/core/pricing.js `priceLine`, so a cart row or a summary
 * line is written once.
 *
 * The shared `priceLine` is passed in rather than imported, which keeps this
 * module free of a dependency on the layer above it and makes it trivial to
 * test in isolation.
 *
 * @param {Function} priceLine shared/core/pricing.js `priceLine`
 */
export function priceAnyWith(priceLine, product, selections, addonIds, qty, catalogue, merchant) {
  return isCommission(product)
    ? commissionAsLine(product, selections, addonIds, qty, catalogue, merchant)
    : priceLine(product, selections, addonIds, qty, catalogue);
}

function commissionAsLine(product, selections, addonIds = [], qty = 1, catalogue, merchant) {
  const q = Math.max(1, qty | 0);
  const p = priceCommission(merchant, catalogue, selections, addonIds, {
    setup: Boolean(selections?.setup),
  });

  return {
    unit: p.factored,
    addons: p.techniqueTotal + p.setup,
    total: p.subtotal * q,
    breakdown: p.lines.map((l) => ({ label: l.label, amount: l.amount })),
    commission: p,
  };
}

/**
 * Order totals for a basket that may hold both commissions and editions.
 * Same shape as shared/core/pricing.js `orderTotals`.
 *
 * @param {Function} priceLine shared/core/pricing.js `priceLine`
 */
export function orderTotalsWith(priceLine, lines, merchant, catalogue, fulfilment = { method: 'pickup' }) {
  let subtotal = 0;

  for (const line of lines) {
    const product = catalogue.products.find((p) => p.id === line.productId);
    if (!product) continue;
    subtotal += toMinor(
      priceAnyWith(priceLine, product, line.selections, line.addons, line.qty, catalogue, merchant).total
    );
  }

  let fee = 0;
  const delivery = merchant.delivery;
  if (fulfilment.method === 'delivery' && delivery && subtotal > 0) {
    fee = toMinor(fulfilment.zone?.fee ?? delivery.zones[0]?.fee ?? 0);
    if (delivery.freeOver != null && subtotal >= toMinor(delivery.freeOver)) fee = 0;
  }

  // Same rule as the shared model, imported rather than reimplemented — two
  // copies of a tax calculation is how a basket and a checkout end up
  // disagreeing by a few cents.
  const { tax, total: gross } = applyTax(subtotal + fee, merchant);
  const gap = delivery?.freeOver != null ? Math.max(0, toMinor(delivery.freeOver) - subtotal) : 0;

  // The deposit is taken across the whole order, not per line: a basket with
  // a commission in it is a commission order.
  const hasCommission = lines.some(
    (l) => catalogue.products.find((p) => p.id === l.productId)?.kind === COMMISSION_KIND
  );
  const total = gross;
  const depositPct = merchant.commission?.depositPct ?? 0;
  const dueNow = hasCommission ? Math.round(total * depositPct) : total;

  return {
    subtotal: toMajor(subtotal),
    fulfilment: toMajor(fee),
    tax: toMajor(tax),
    total: toMajor(total),
    taxIncluded: (merchant.taxMode ?? 'exclusive') === 'inclusive',
    freeDeliveryGap: toMajor(gap),
    hasCommission,
    dueNow: toMajor(dueNow),
    dueLater: toMajor(total - dueNow),
  };
}
