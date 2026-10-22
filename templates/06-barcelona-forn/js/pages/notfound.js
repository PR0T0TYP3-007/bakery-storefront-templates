/**
 * @file 404.
 *
 * Says the one true thing — we never made that one — and then shows what is
 * actually on the counter today, because a dead end that hands somebody a
 * croissant is better than one that only apologises.
 *
 * It reuses `renderShelf`, so the 404 is never out of date with the shop.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import { renderShelf } from '../components/calendar.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader();
renderFooter();

const { merchant, catalogue } = session.state;
const today = new Date();

$('[data-today]').textContent = new Intl.DateTimeFormat(merchant.locale, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(today);

renderShelf($('[data-now]'), { merchant, catalogue, today });
