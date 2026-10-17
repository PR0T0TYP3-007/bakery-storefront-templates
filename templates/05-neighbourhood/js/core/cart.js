/**
 * @file The basket. Pure data operations — no storage, no DOM.
 * The caller decides where it is persisted.
 */

/**
 * @typedef {object} CartLine
 * @property {string} id
 * @property {string} productId
 * @property {Record<string,string>} selections
 * @property {string[]} addons
 * @property {string} inscription
 * @property {string} readyBy      YYYY-MM-DD
 * @property {number} qty
 * @property {number} [addedPrice] unit price when it went in, for stale detection
 */

const MAX_QTY = 24;

/** Two lines are the same line if every choice about them matches. */
export function signature(line) {
  return [
    line.productId,
    JSON.stringify(line.selections ?? {}),
    [...(line.addons ?? [])].sort().join(','),
    line.inscription ?? '',
    line.readyBy ?? '',
  ].join('|');
}

export function emptyCart() {
  return { lines: [] };
}

/** @returns {object} a new cart — never mutates the one passed in */
export function addLine(cart, line) {
  const lines = [...cart.lines];
  const sig = signature(line);
  const existing = lines.findIndex((l) => signature(l) === sig);

  if (existing > -1) {
    lines[existing] = {
      ...lines[existing],
      qty: Math.min(MAX_QTY, lines[existing].qty + (line.qty ?? 1)),
    };
  } else {
    lines.push({
      id: `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      productId: line.productId,
      selections: line.selections ?? {},
      addons: line.addons ?? [],
      inscription: line.inscription ?? '',
      readyBy: line.readyBy,
      qty: Math.min(MAX_QTY, line.qty ?? 1),
      addedPrice: line.addedPrice,
    });
  }
  return { ...cart, lines };
}

export function setQty(cart, lineId, qty) {
  if (qty <= 0) return removeLine(cart, lineId);
  return {
    ...cart,
    lines: cart.lines.map((l) =>
      l.id === lineId ? { ...l, qty: Math.min(MAX_QTY, qty) } : l
    ),
  };
}

export function removeLine(cart, lineId) {
  return { ...cart, lines: cart.lines.filter((l) => l.id !== lineId) };
}

export function count(cart) {
  return cart.lines.reduce((n, l) => n + l.qty, 0);
}

/**
 * The whole order is ready on the latest day any single line can be.
 * @returns {string|null} date key
 */
export function readyBy(cart) {
  const keys = cart.lines.map((l) => l.readyBy).filter(Boolean).sort();
  return keys.length ? keys[keys.length - 1] : null;
}

/**
 * Lines whose price or availability has moved since they were added.
 * Catching this in the basket is far cheaper than catching it at payment.
 * @returns {Array<{line:CartLine, was:number, now:number}>}
 */
export function staleLines(cart, priceOf) {
  const out = [];
  for (const line of cart.lines) {
    if (line.addedPrice == null) continue;
    const now = priceOf(line);
    if (now != null && Math.abs(now - line.addedPrice) > 0.001) {
      out.push({ line, was: line.addedPrice, now });
    }
  }
  return out;
}
