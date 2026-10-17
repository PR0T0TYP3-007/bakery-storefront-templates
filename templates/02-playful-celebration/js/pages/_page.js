/**
 * @file Common page bootstrap. Every page entry module starts with this.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter, renderAllergens } from '../components/chrome.js';

/**
 * Boots the session and renders the shared chrome.
 * @param {{nav?:string|null}} [opts]
 */
export async function startPage({ nav = null } = {}) {
  await session.boot();
  renderHeader(nav);
  renderAllergens();
  renderFooter();
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
export function photo(id, bucket = 'md') {
  return `../../shared/img/${id}-${bucket}.jpg`;
}

/** Carries the merchant query across links. */
export function link(href) {
  const m = new URLSearchParams(location.search).get('merchant');
  if (!m) return href;
  return href + (href.includes('?') ? '&' : '?') + `merchant=${encodeURIComponent(m)}`;
}
