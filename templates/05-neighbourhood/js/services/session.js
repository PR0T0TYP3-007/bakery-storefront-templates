/**
 * @file Session state: the merchant, its catalogue, the basket, and when the
 * customer is collecting. Everything the UI needs, in one place, with events.
 *
 * This is the only stateful module. `js/core/` stays pure beneath it.
 */

import * as api from './api.js';
import * as cartOps from '../../../../shared/core/cart.js';
import { namespaced } from '../../../../shared/core/storage.js';
import { configureFormat } from '../../../../shared/core/format.js';
import { dateKey, keyToDate } from '../../../../shared/core/dates.js';
import { earliestFor, dayState } from '../../../../shared/core/fulfilment.js';
import { leadDaysFor } from '../../../../shared/core/rules.js';
import { priceLine } from '../../../../shared/core/pricing.js';

/** @type {{merchant:object, catalogue:object, cart:object, when:Date, locationId:string, store:object}} */
export const state = {
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
export function on(type, fn) {
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
export async function boot() {
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

export const product = (id) => state.catalogue.products.find((p) => p.id === id) ?? null;

export const location = () =>
  state.merchant.locations.find((l) => l.id === state.locationId) ?? state.merchant.locations[0];

export const groups = () => state.catalogue.optionGroups ?? {};

/** Lead days for a product in a given configuration. */
export const leadFor = (p, selections) => leadDaysFor(p, selections ?? p.defaults, groups());

/** Price of one configured line. */
export const priceOf = (p, selections, addons, qty) =>
  priceLine(p, selections, addons, qty, state.catalogue);

/* -------------------------------------------------------------------------
   Collection day
   ------------------------------------------------------------------------- */

export function setWhen(d) {
  state.when = d;
  state.store.write('when', dateKey(d));
  emit('when:change', { when: d });
}

export function setLocation(id) {
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
export function add({ productId, selections, addons = [], inscription = '', qty = 1 }) {
  const p = product(productId);
  if (!p) throw new Error(`Unknown product: ${productId}`);

  const sel = selections ?? { ...p.defaults };
  const lead = leadFor(p, sel);
  const ok = dayState(state.merchant, state.when, lead) === 'available';
  const when = ok ? state.when : earliestFor(state.merchant, lead);

  const unit = priceOf(p, sel, addons, 1).unit;

  state.cart = cartOps.addLine(state.cart, {
    productId,
    selections: sel,
    addons,
    inscription,
    readyBy: dateKey(when),
    qty,
    addedPrice: unit,
  });

  persist();
  return { movedTo: ok ? null : when };
}

export function setQty(lineId, qty) {
  state.cart = cartOps.setQty(state.cart, lineId, qty);
  persist();
}

export function remove(lineId) {
  state.cart = cartOps.removeLine(state.cart, lineId);
  persist();
}

export function clear() {
  state.cart = cartOps.emptyCart();
  persist();
}

export const count = () => cartOps.count(state.cart);

export const orderReadyBy = () => {
  const key = cartOps.readyBy(state.cart);
  return key ? keyToDate(key) : null;
};

/** Lines whose price has moved since they were added. */
export const stale = () =>
  cartOps.staleLines(state.cart, (line) => {
    const p = product(line.productId);
    return p ? priceOf(p, line.selections, line.addons, 1).unit : null;
  });
