/**
 * @file Toast.
 *
 * Confirmation of something that already happened, not a decision. So it is
 * polite rather than assertive — it must not interrupt whatever is being
 * read or typed — and it is never the only place a result appears: the
 * basket count changes too, and the basket page shows the line.
 */

const HOLD = 4200;

function layer() {
  let el = document.querySelector('.toasts');
  if (el) return el;
  el = document.createElement('div');
  el.className = 'toasts';
  // `polite` and not `alert`: an added cake is good news, not an emergency,
  // and interrupting someone mid-sentence to say so is worse than waiting.
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.append(el);
  return el;
}

/**
 * @param {{title:string, detail?:string, tone?:'good'|'bad', icon?:string}} opts
 */
export function toast({ title, detail = '', tone = 'good', icon = '' }) {
  const host = layer();

  const el = document.createElement('div');
  el.className = `toast${tone === 'bad' ? ' toast--bad' : ''}`;
  el.innerHTML = `${icon}<span><strong>${esc(title)}</strong>${detail ? esc(detail) : ''}</span>`;

  host.append(el);

  // Two or three at once is informative; six is a wall. The oldest goes.
  while (host.children.length > 3) host.firstElementChild.remove();

  const go = () => {
    el.dataset.leaving = 'true';
    el.addEventListener('animationend', () => el.remove(), { once: true });
    // A belt-and-braces removal, because animationend never fires when
    // prefers-reduced-motion has collapsed the duration to 1ms in a tab that
    // is in the background.
    setTimeout(() => el.remove(), 600);
  };

  const timer = setTimeout(go, HOLD);
  // Hovering holds it, so a long message can actually be read.
  el.addEventListener('pointerenter', () => clearTimeout(timer), { once: true });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}
