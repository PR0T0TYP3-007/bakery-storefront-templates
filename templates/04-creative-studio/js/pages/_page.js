/**
 * @file Common page bootstrap. Every page entry module starts with this.
 */

import * as session from '../services/session.js';
import { renderMasthead, renderAllergens, renderColophon, link } from '../components/chrome.js';

/**
 * @param {{nav?:string|null, grid?:boolean}} [opts]
 */
export async function startPage({ nav = null, grid = true } = {}) {
  await session.boot();

  // The visible column grid is the template's separation method, so it is
  // drawn once here rather than written into nine HTML files.
  if (grid && !document.querySelector('.grid-lines')) {
    const lines = document.createElement('div');
    lines.className = 'grid-lines';
    lines.setAttribute('aria-hidden', 'true');
    lines.innerHTML = '<span></span>'.repeat(12);
    document.body.prepend(lines);
  }

  renderMasthead(nav);
  renderAllergens();
  renderColophon();

  // Namespaced deliberately. A bare `data-ready` on <body> is matched by any
  // component querying `[data-ready]`, and document.body comes first in
  // document order — which in Template 05 silently wiped a whole page.
  document.body.dataset.pageReady = 'true';
  return session.state;
}

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/** Photograph path at a given width bucket. */
export const photo = (id, bucket = 'md') => `../../shared/img/${id}-${bucket}.jpg`;

export { link };
