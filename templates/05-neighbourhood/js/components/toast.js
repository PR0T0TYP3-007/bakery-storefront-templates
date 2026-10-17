/**
 * @file Toasts. Announced politely to assistive tech, and never the only
 * confirmation that something happened — the ticket updates at the same time.
 */

import { icons } from './icons.js';

let host;

function ensureHost() {
  if (host) return host;
  host = document.createElement('div');
  host.className = 'toasts';
  host.setAttribute('role', 'status');
  host.setAttribute('aria-live', 'polite');
  document.body.appendChild(host);
  return host;
}

/**
 * @param {{title:string, detail?:string, tone?:'ok'|'bad'}} opts
 */
export function toast({ title, detail, tone = 'ok' }) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    ${tone === 'bad' ? icons.alert : icons.check}
    <p class="toast__body">${title}${detail ? `<small>${detail}</small>` : ''}</p>
  `;
  ensureHost().appendChild(el);

  setTimeout(() => {
    el.dataset.out = 'true';
    setTimeout(() => el.remove(), 240);
  }, 3600);
}
