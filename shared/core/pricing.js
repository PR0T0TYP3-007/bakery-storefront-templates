/**
 * @file Pricing. Pure, and the only place money is calculated.
 * Every figure the customer sees traces back to a function here, so the
 * itemised breakdown and the total can never disagree.
 */

/** Money is held in minor units internally to avoid float drift. */
const toMinor = (n) => Math.round(n * 100);
const toMajor = (n) => n / 100;

/**
 * @typedef {object} LinePrice
 * @property {number} unit        one item, as configured
 * @property {number} addons      extras, per item
 * @property {number} total       (unit + addons) × qty
 * @property {Array<{label:string, amount:number}>} breakdown
 */

/**
 * @param {object} product
 * @param {Record<string,string>} selections
 * @param {string[]} addonIds
 * @param {number} qty
 * @param {{optionGroups:object, addons:object[]}} catalogue
 * @returns {LinePrice}
 */
export function priceLine(product, selections = {}, addonIds = [], qty = 1, catalogue) {
  const groups = catalogue?.optionGroups ?? {};
  const allAddons = catalogue?.addons ?? [];

  let unit = toMinor(product.price);
  const breakdown = [{ label: product.name, amount: toMinor(product.price) }];

  for (const groupId of product.options ?? []) {
    const group = groups[groupId];
    const chosen = group?.options.find((o) => o.id === selections[groupId]);
    if (!chosen?.price) continue;
    unit += toMinor(chosen.price);
    breakdown.push({ label: chosen.label, amount: toMinor(chosen.price) });
  }

  let addons = 0;
  for (const id of addonIds) {
    const a = allAddons.find((x) => x.id === id);
    if (!a) continue;
    addons += toMinor(a.price);
    breakdown.push({ label: a.label, amount: toMinor(a.price) });
  }

  const quantity = Math.max(1, qty | 0);

  return {
    unit: toMajor(unit),
    addons: toMajor(addons),
    total: toMajor((unit + addons) * quantity),
    breakdown: breakdown.map((b) => ({ label: b.label, amount: toMajor(b.amount) })),
  };
}

/**
 * @typedef {object} Totals
 * @property {number} subtotal
 * @property {number} fulfilment   delivery fee, or 0
 * @property {number} tax
 * @property {number} total
 * @property {number} freeDeliveryGap  how much more for free delivery, 0 if none
 */

/**
 * @param {object[]} lines        cart lines
 * @param {object} merchant
 * @param {object} catalogue
 * @param {{method:'pickup'|'delivery', zone?:object}} fulfilment
 * @returns {Totals}
 */
export function orderTotals(lines, merchant, catalogue, fulfilment = { method: 'pickup' }) {
  let subtotal = 0;

  for (const line of lines) {
    const product = catalogue.products.find((p) => p.id === line.productId);
    if (!product) continue;
    subtotal += toMinor(
      priceLine(product, line.selections, line.addons, line.qty, catalogue).total
    );
  }

  let fee = 0;
  const delivery = merchant.delivery;
  if (fulfilment.method === 'delivery' && delivery && subtotal > 0) {
    fee = toMinor(fulfilment.zone?.fee ?? delivery.zones[0]?.fee ?? 0);
    if (delivery.freeOver != null && subtotal >= toMinor(delivery.freeOver)) fee = 0;
  }

  const tax = Math.round((subtotal + fee) * (merchant.taxRate ?? 0));

  const gap =
    delivery?.freeOver != null ? Math.max(0, toMinor(delivery.freeOver) - subtotal) : 0;

  return {
    subtotal: toMajor(subtotal),
    fulfilment: toMajor(fee),
    tax: toMajor(tax),
    total: toMajor(subtotal + fee + tax),
    freeDeliveryGap: toMajor(gap),
  };
}
