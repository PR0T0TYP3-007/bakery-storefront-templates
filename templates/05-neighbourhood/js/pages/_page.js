/**
 * @file Common page bootstrap. Every page entry module starts with this.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import { mountMobileTicket } from '../components/ticket.js';

/**
 * Boots the session and renders the shared chrome.
 * @param {{nav?:string, mobileTicket?:boolean}} [opts]
 */
export async function startPage({ nav, mobileTicket = true } = {}) {
  await session.boot();
  renderHeader(nav);
  renderFooter();
  if (mobileTicket) mountMobileTicket();
  // Namespaced deliberately: a bare `data-ready` on <body> would be matched
  // by any component querying `[data-ready]`, and document.body is the first
  // node in document order.
  document.body.dataset.pageReady = 'true';
  return session.state;
}

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
