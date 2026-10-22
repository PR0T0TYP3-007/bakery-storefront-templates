/**
 * @file "Your usual" — the last order, offered back.
 *
 * One implementation, used by the home page and the shop page. It was
 * written inline on the home page, moved wholesale to the shop page when the
 * board left home, and is now wanted on both — which is exactly the point at
 * which two copies start drifting apart. Template 05 v1 is the cautionary
 * tale the rest of this codebase keeps citing for that.
 *
 * The framing matters as much as the feature. This reads the last order out
 * of this browser's own storage; it is not a profile, nothing was collected,
 * and nobody else holds it. The markup says so and the button does nothing
 * until it is pressed.
 */

import * as session from '../services/session.js';
import { toast } from './toast.js';

/**
 * Fill the "Your usual" block, if there is one on the page and anything to
 * put in it.
 *
 * @param {ParentNode} [scope] where to look; defaults to the document
 * @returns {boolean} whether anything was shown
 */
export function paintUsual(scope = document) {
  const el = scope.querySelector('[data-usual]');
  if (!el) return false;

  const last = session.state.store.read('lastOrder', null);
  const lines = (last?.lines ?? [])
    .map((l) => ({ ...l, product: session.product(l.productId) }))
    /* A product can leave the catalogue between one order and the next. The
       line is dropped rather than rendered as a blank row, and if that empties
       the list the block stays hidden, which is the honest outcome. */
    .filter((l) => l.product);

  if (!lines.length) {
    el.hidden = true;
    return false;
  }

  el.hidden = false;
  const detail = el.querySelector('[data-usual-detail]');
  if (detail) {
    detail.textContent = lines
      .map((l) => `${l.qty > 1 ? `${l.qty} × ` : ''}${l.product.name}`)
      .join(', ');
  }

  const button = el.querySelector('[data-usual-add]');
  if (button) {
    button.onclick = () => {
      let n = 0;
      for (const l of lines) {
        session.add({ productId: l.productId, selections: l.selections, qty: l.qty });
        n += l.qty;
      }
      toast({ title: `${n} item${n === 1 ? '' : 's'} added`, detail: 'Same as last time.' });
    };
  }

  return true;
}
