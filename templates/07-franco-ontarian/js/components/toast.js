/**
 * @file Toasts.
 *
 * Icon-free, like Template 06's: the separation system here is a rim and a
 * fill, and a drawn tick in a circle belongs to neither. Text goes in as
 * text rather than through innerHTML — a product name out of config is not
 * hostile today, but a toast is not the place to rely on that.
 *
 * Announced politely, and never the only confirmation: the basket count in
 * the header moves at the same time.
 */

let host;

function ensureHost() {
  if (host?.isConnected) return host;
  host = document.createElement('div');
  host.className = 'toasts';
  host.setAttribute('role', 'status');
  host.setAttribute('aria-live', 'polite');
  document.body.append(host);
  return host;
}

/** @param {{title:string, detail?:string|null, tone?:'ok'|'bad'}} opts */
export function toast({ title, detail, tone = 'ok' }) {
  const el = document.createElement('div');
  el.className = `toast plate toast--${tone}`;

  const body = document.createElement('p');
  body.className = 'toast__body';
  body.textContent = title;

  if (detail) {
    const small = document.createElement('small');
    small.textContent = detail;
    body.append(small);
  }

  el.append(body);
  ensureHost().append(el);

  setTimeout(() => {
    el.dataset.out = 'true';
    setTimeout(() => el.remove(), 240);
  }, 4200);
}
