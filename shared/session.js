import * as cartOps from './core/cart.js';
import { namespaced } from './core/storage.js';
import { configureFormat } from './core/format.js';
import { dateKey, keyToDate, startOfDay } from './core/dates.js';
import { earliestFor, dayState } from './core/fulfilment.js';
import { leadDaysFor } from './core/rules.js';
import { priceLine } from './core/pricing.js';

/**
 * @file The session factory.
 *
 * This was Template 05's services/session.js. Template 02 needed the same
 * thing — merchant, catalogue, basket, chosen day, events — and the only
 * template-specific line in it was the relative import of the template's own
 * api.js. So it takes that as an argument now and lives here instead.
 *
 * decisions.md D3 promoted the pure commerce rules to shared/core before a
 * third template could copy them. This is the same move one layer up: the
 * stateful layer is shared, the swappable data seam (api.js) stays per
 * template, and shared/core stays pure beneath both.
 *
 * Unlike shared/core/, this module does touch the DOM — it sets `lang` and
 * `data-brand` on <html> once the merchant is known. That is why it is here
 * and not in core/.
 *
 * @param {object} api  the template's own services/api.js module
 * @returns {object} the session API, destructured and re-exported by each
 *   template's services/session.js
 */
export function createSession(api) {

  /** @type {{merchant:object, catalogue:object, cart:object, when:Date, locationId:string, store:object}} */
  const state = {
    merchant: null,
    catalogue: null,
    cart: cartOps.emptyCart(),
    when: null,
    locationId: null,
    store: null,
    ready: false,
  };

  const bus = new EventTarget();

  /** @param {string} type @param {(e:CustomEvent)=>void} fn */
  function on(type, fn) {
    bus.addEventListener(type, fn);
    return () => bus.removeEventListener(type, fn);
  }

  function emit(type, detail = {}) {
    bus.dispatchEvent(new CustomEvent(type, { detail }));
  }

  /**
   * Loads the merchant and catalogue and restores anything saved locally.
   * Every page calls this once before rendering.
   */
  async function boot() {
    const [merchant, catalogue] = await Promise.all([api.getMerchant(), api.getCatalogue()]);

    state.merchant = merchant;
    state.catalogue = catalogue;
    state.store = namespaced(merchant.id);

    configureFormat({ locale: merchant.locale, currency: merchant.currency });
    document.documentElement.lang = merchant.locale;
    document.documentElement.dataset.brand = merchant.id;

    // Restore the basket, dropping anything no longer in the catalogue.
    const saved = state.store.read('cart', null);
    if (saved?.lines) {
      state.cart = {
        lines: saved.lines.filter((l) => catalogue.products.some((p) => p.id === l.productId)),
      };
    }

    // Restore the collection day, but never a stale or now-impossible one.
    const savedWhen = keyToDate(state.store.read('when', null));
    state.when =
      savedWhen && dayState(merchant, savedWhen, 0) === 'available'
        ? savedWhen
        : earliestFor(merchant, 0);

    state.locationId =
      state.store.read('location', null) ??
      (merchant.locations.find((l) => l.default) ?? merchant.locations[0]).id;

    state.ready = true;
    emit('ready');
    emit('cart:change');
    emit('when:change');
    return state;
  }

  /* -------------------------------------------------------------------------
     Lookups
     ------------------------------------------------------------------------- */

  const product = (id) => state.catalogue.products.find((p) => p.id === id) ?? null;

  const location = () =>
    state.merchant.locations.find((l) => l.id === state.locationId) ?? state.merchant.locations[0];

  const groups = () => state.catalogue.optionGroups ?? {};

  /** Lead days for a product in a given configuration. */
  const leadFor = (p, selections) => leadDaysFor(p, selections ?? p.defaults, groups());

  /** Price of one configured line. */
  const priceOf = (p, selections, addons, qty) =>
    priceLine(p, selections, addons, qty, state.catalogue);

  /* -------------------------------------------------------------------------
     Collection day
     ------------------------------------------------------------------------- */

  function setWhen(d) {
    state.when = d;
    state.store.write('when', dateKey(d));
    emit('when:change', { when: d });
  }

  function setLocation(id) {
    state.locationId = id;
    state.store.write('location', id);
    emit('when:change', { when: state.when });
  }

  /* -------------------------------------------------------------------------
     Basket
     ------------------------------------------------------------------------- */

  function persist() {
    state.store.write('cart', state.cart);
    emit('cart:change', { cart: state.cart });
  }

  /**
   * Adds a configured product. Falls forward to the soonest possible day when
   * the chosen collection day cannot accommodate it, rather than failing later.
   * @returns {{line:object, movedTo:Date|null}}
   */
  function add({
    productId,
    selections,
    addons = [],
    inscription = '',
    qty = 1,
    meta = null,
    when: wanted = null,
  }) {
    const p = product(productId);
    if (!p) throw new Error(`Unknown product: ${productId}`);

    const sel = selections ?? { ...p.defaults };
    const lead = leadFor(p, sel);

    /* A celebration cake is ordered FOR a day — a birthday, a réveillon —
       so the line can name its own day instead of taking the session's.
       Everything else keeps the old behaviour exactly: no `when`, no
       change. The day is still checked, because a cake wanted tomorrow
       that needs three days' notice is not an order, it is a
       disappointment with a date on it. */
    const requested = wanted instanceof Date ? wanted : keyToDate(wanted);
    const asked = requested ? startOfDay(requested) : null;
    const target = asked ?? state.when;

    const ok = dayState(state.merchant, target, lead) === 'available';
    const when = ok ? target : earliestFor(state.merchant, lead);

    const unit = priceOf(p, sel, addons, 1).unit;

    state.cart = cartOps.addLine(state.cart, {
      productId,
      selections: sel,
      addons,
      inscription,
      // Passed through untouched. The session layer has no opinion about what
      // a template keeps here — Template 04 carries the written commission
      // brief — but it must not be the place the data quietly disappears.
      meta,
      readyBy: dateKey(when),
      qty,
      addedPrice: unit,
    });

    // A requested celebration date is also the collection day. An order with
    // several lines can only be collected once, so it must use the latest
    // per-line ready date rather than whichever product happened to be added
    // last.
    const orderDay = cartOps.readyBy(state.cart);
    if (wanted && orderDay) setWhen(keyToDate(orderDay));

    persist();
    return { movedTo: ok ? null : when };
  }

  /**
   * Change one line that is already in the basket — its card, its piped
   * inscription, its selections. Keeps the line's id and position.
   * @param {string} lineId
   * @param {object} patch
   */
  function updateLine(lineId, patch) {
    state.cart = cartOps.updateLine(state.cart, lineId, patch);
    persist();
    return state.cart.lines.find((l) => l.id === lineId) ?? null;
  }

  function setQty(lineId, qty) {
    state.cart = cartOps.setQty(state.cart, lineId, qty);
    persist();
  }

  function remove(lineId) {
    state.cart = cartOps.removeLine(state.cart, lineId);
    persist();
  }

  function clear() {
    state.cart = cartOps.emptyCart();
    persist();
  }

  const count = () => cartOps.count(state.cart);

  const orderReadyBy = () => {
    const key = cartOps.readyBy(state.cart);
    return key ? keyToDate(key) : null;
  };

  /** Lines whose price has moved since they were added. */
  const stale = () =>
    cartOps.staleLines(state.cart, (line) => {
      const p = product(line.productId);
      return p ? priceOf(p, line.selections, line.addons, 1).unit : null;
    });

  return { state, on, boot, product, location, groups, leadFor, priceOf, setWhen, setLocation, add, updateLine, setQty, remove, clear, count, orderReadyBy, stale };
}
