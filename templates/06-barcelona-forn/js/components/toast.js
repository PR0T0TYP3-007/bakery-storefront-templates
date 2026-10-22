/**
 * @file Toasts.
 *
 * Copied from Template 05 and then rewritten twice over.
 *
 * It imported `./icons.js`, which this template does not have and should not
 * get: the whole separation system here is one surface meeting another, and
 * a drawn tick in a circle is the one thing it never does. The tone is
 * carried by a panel of the right colour and by the words.
 *
 * It also built its markup by interpolating the caller's strings into
 * `innerHTML`. Every caller here passes a product name out of merchant
 * config, which is not hostile today, but a toast is not the place to be
 * relying on that. Text goes in as text.
 *
 * Announced politely, and never the only confirmation — the basket count in
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

/**
 * @param {{title:string, detail?:string|null, tone?:'ok'|'bad'}} opts
 */
export function toast({ title, detail, tone = 'ok' }) {
  const el = document.createElement('div');
  el.className = `toast toast--${tone}`;

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
