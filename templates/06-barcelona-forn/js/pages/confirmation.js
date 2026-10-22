/**
 * @file The confirmation.
 *
 * Everything it says comes from the query string the checkout handed over,
 * because by this point the basket has been cleared and there is nothing
 * else left to read. That also means the page survives a refresh and a
 * bookmark, which a page that read from session state would not.
 *
 * It states only what it was told. A reference it cannot see is not invented.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import { keyToDate } from '../../../../shared/core/dates.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader();
renderFooter();

const { merchant } = session.state;
const q = new URLSearchParams(location.search);

const ref = q.get('ref');
const whenKey = q.get('when');
const slot = q.get('slot');

/* Somebody who lands here without a reference did not come through the
   checkout — a shared link, a back button after clearing. Saying so is
   better than an empty page that looks broken. */
if (!ref) {
  $('[data-head]').textContent = 'Nothing to show here.';
  $('[data-say]').textContent =
    'This page shows an order just after it is placed. If you have one with us and want to check it, call 93 441 00 00.';
  $('[data-ref]').remove();
} else {
  const when = whenKey ? keyToDate(whenKey) : null;
  const day = when
    ? new Intl.DateTimeFormat(merchant.locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(when)
    : null;

  $('[data-head]').textContent = 'It is in the book.';

  $('[data-say]').textContent = day
    ? `Come in on ${day}${slot ? `, between ${slot}` : ''}. It will be waiting.`
    : 'It will be waiting for you.';

  $('[data-ref]').textContent = ref;
  if (when) {
    $('[data-ref]').insertAdjacentHTML(
      'afterend',
      `<p class="sm" style="margin-top:var(--s-3)"><time datetime="${whenKey}">${day}</time>${
        slot ? ` · ${slot}` : ''
      }</p>`
    );
  }
}
