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
 * @property {object|null} [meta] per-line data the commerce core does not interpret
 */

const MAX_QTY = 24;

/** Two lines are the same line if every choice about them matches. */
export function signature(line) {
  return [
    line.productId,
    JSON.stringify(line.selections ?? {}),
    [...(line.addons ?? [])].sort().join(','),
    line.inscription ?? '',
    // Two commissions with different briefs are two different lines. Without
    // this they would share a signature and silently merge into one line at
    // quantity two, which is a different cake ordered twice.
    JSON.stringify(line.meta ?? null),
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
      // Free-form, per line, for whatever a template needs to carry that the
      // commerce core has no opinion about — Template 04 puts the written
      // commission brief here. Anything not named in this object is dropped,
      // which is deliberate: a cart line is a contract, not a scratchpad.
      meta: line.meta ?? null,
      readyBy: line.readyBy,
      qty: Math.min(MAX_QTY, line.qty ?? 1),
      addedPrice: line.addedPrice,
    });
  }
  return { ...cart, lines };
}

/**
 * Change one line in place, keeping its id and its position.
 *
 * Template 03 writes the card after the cake is already in the basket, so a
 * line has to be editable without being removed and re-added — re-adding
 * would mint a new id, which breaks the `?line=` link the customer is on,
 * and move the row to the bottom of a basket they are looking at.
 *
 * A patch can change the signature, so two lines that were different can
 * become the same line. They are merged here rather than left as two
 * identical rows: clearing a card off one of two otherwise-identical cakes
 * should give you two of that cake, not a basket that looks broken.
 *
 * @param {object} cart
 * @param {string} lineId
 * @param {Partial<CartLine>} patch
 * @returns {object} a new cart
 */
export function updateLine(cart, lineId, patch) {
  const patched = cart.lines.map((l) => (l.id === lineId ? { ...l, ...patch, id: l.id } : l));

  const merged = [];
  for (const line of patched) {
    const twin = merged.find((m) => signature(m) === signature(line));
    if (twin) twin.qty = Math.min(MAX_QTY, twin.qty + line.qty);
    else merged.push({ ...line });
  }

  return { ...cart, lines: merged };
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
