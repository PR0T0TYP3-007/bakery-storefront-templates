/**
 * @file Product rules: lead time, option compatibility, inscriptions, allergens.
 * Pure. Every rule is data-driven from the catalogue so a merchant can change
 * what they offer without anyone editing code.
 */

export const INSCRIPTION_MAX = 40;

/**
 * "A", "A or B", "A, B or C" — written out rather than joined with a bare
 * " or ", which produced "8 inch or 10 inch or Two tier".
 * @param {string[]} items
 */
function joinOr(items) {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

/**
 * Days of notice a specific configuration needs.
 * Lead time is a property of the *configuration*, not the shop: fondant
 * figures add four days to whatever cake they go on.
 * @param {object} product
 * @param {Record<string,string>} selections
 * @param {Record<string,object>} groups
 * @returns {number}
 */
export function leadDaysFor(product, selections = {}, groups = {}) {
  let lead = product?.leadDays ?? 0;
  for (const groupId of product?.options ?? []) {
    const group = groups[groupId];
    if (!group) continue;
    const chosen = group.options.find((o) => o.id === selections[groupId]);
    if (chosen?.leadDays) lead += chosen.leadDays;
  }
  return lead;
}

/**
 * Whether an option can be chosen given what else is selected.
 * Returns a reason rather than a bare boolean so the UI can say *why* —
 * a disabled control with no explanation is a dead end.
 * @returns {{ok:boolean, reason?:string}}
 */
export function optionAvailable(option, selections = {}, groups = {}) {
  if (option.requiresServings) {
    const chosen = selections.servings;
    if (chosen && !option.requiresServings.includes(chosen)) {
      const group = groups.servings;
      const allowed = option.requiresServings
        .map((id) => group?.options.find((o) => o.id === id)?.label)
        .filter(Boolean);
      return { ok: false, reason: `Only on ${joinOr(allowed)}` };
    }
  }
  return { ok: true };
}

/**
 * After a change, some previously-valid selections may have become
 * impossible. Rather than silently keeping a configuration the kitchen
 * cannot make, fall those groups back to their default and report it.
 * @returns {{selections:Record<string,string>, changed:string[]}}
 */
export function reconcileSelections(product, selections, groups) {
  const next = { ...selections };
  const changed = [];

  for (const groupId of product?.options ?? []) {
    const group = groups[groupId];
    if (!group) continue;
    const chosen = group.options.find((o) => o.id === next[groupId]);
    if (!chosen) continue;
    if (!optionAvailable(chosen, next, groups).ok) {
      // The product's own default first — but only if it is itself possible.
      // Template 03's Ombré defaults to sugar roses, which need one of the
      // two larger sizes, so shrinking the cake fell the finish back to the
      // default and left it on an option the kitchen had just refused.
      // Falling back to something invalid is not a fallback.
      const preferred = group.options.find((o) => o.id === product.defaults?.[groupId]);
      const usable =
        (preferred && optionAvailable(preferred, next, groups).ok && preferred) ||
        group.options.find((o) => optionAvailable(o, next, groups).ok);

      if (!usable) continue; // nothing in this group is possible; leave it and let the UI say so
      next[groupId] = usable.id;
      changed.push(group.label);
    }
  }
  return { selections: next, changed };
}

/**
 * @param {string} text
 * @returns {{ok:boolean, reason?:string}}
 */
export function validateInscription(text) {
  const value = (text ?? '').trim();
  if (!value) return { ok: true };
  if (value.length > INSCRIPTION_MAX) {
    return { ok: false, reason: `Keep it to ${INSCRIPTION_MAX} characters — we pipe by hand.` };
  }
  // Emoji and symbols cannot be piped in buttercream. Saying so up front beats
  // a phone call from the kitchen the morning of someone's birthday.
  if (/[^\p{L}\p{N}\p{Zs}'’&,.!?()\-–—:+*"]/u.test(value)) {
    return { ok: false, reason: "We can only pipe letters, numbers and basic punctuation." };
  }
  return { ok: true };
}

/**
 * Every allergen present in a configured product, including those introduced
 * by a chosen option (carrot & walnut sponge brings nuts with it).
 * @returns {string[]}
 */
export function allergensFor(product, selections = {}, groups = {}) {
  const set = new Set(product?.allergens ?? []);
  for (const groupId of product?.options ?? []) {
    const group = groups[groupId];
    const chosen = group?.options.find((o) => o.id === selections[groupId]);
    for (const a of chosen?.allergens ?? []) set.add(a);
  }
  return [...set];
}

/**
 * Some products only exist on some days (doughnuts, Friday to Sunday).
 * @param {object} product @param {Date} date
 */
export function soldOnDay(product, date) {
  if (!product?.availableWeekdays) return true;
  return product.availableWeekdays.includes(date.getDay());
}

/** Human summary of a configuration — "8 inch · Vanilla · Fresh fruit top". */
export function describeSelections(product, selections = {}, groups = {}) {
  const bits = [];
  for (const groupId of product?.options ?? []) {
    const group = groups[groupId];
    const chosen = group?.options.find((o) => o.id === selections[groupId]);
    if (chosen) bits.push(chosen.label);
  }
  return bits.join(' · ');
}
