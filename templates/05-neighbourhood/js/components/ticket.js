/**
 * @file The Ticket — the order as it builds.
 *
 * Sticky rail on desktop, a bar that opens a <dialog> sheet on mobile.
 * It is the reassurance mechanism: at every moment the customer can see
 * exactly what they are buying, when it is ready, and what it costs.
 */

import { money, moneyExact, whenPhrase } from '../core/format.js';
import { describeSelections } from '../core/rules.js';
import * as session from '../services/session.js';
import { icons } from './icons.js';
import { qsFirst } from './board.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

let lastSignatures = new Set();

/**
 * @param {HTMLElement} mount
 * @param {{showActions?:boolean, checkoutHref?:string}} [opts]
 */
export function renderTicket(mount, opts = {}) {
  if (!mount) return;
  const { cart, catalogue } = session.state;
  const {
    showActions = true,
    // On checkout the order summary owns the real total, so the ticket shows
    // only what is on it. Two rows both labelled "Total" is the ambiguity
    // this template exists to avoid.
    showTotal = true,
    checkoutHref = `checkout.html${qsFirst()}`,
  } = opts;

  if (!cart.lines.length) {
    mount.innerHTML = `
      <div class="ticket">
        <div class="ticket__head">
          <span class="label">Your ticket</span>
        </div>
        <div class="ticket__body">
          <p class="ticket__empty">Nothing on it yet.<br>Add something from the board.</p>
        </div>
      </div>`;
    lastSignatures = new Set();
    return;
  }

  const totals = session.priceOf;
  let subtotal = 0;
  const lines = cart.lines
    .map((line) => {
      const p = session.product(line.productId);
      if (!p) return '';
      const price = totals(p, line.selections, line.addons, line.qty);
      subtotal += price.total;

      const spec = describeSelections(p, line.selections, session.groups());
      const addonNames = (line.addons ?? [])
        .map((id) => catalogue.addons.find((a) => a.id === id)?.label)
        .filter(Boolean);

      // Mark genuinely new lines so the one short entrance animation in this
      // template fires only when something has actually just arrived.
      const sig = `${line.id}:${line.qty}`;
      const isNew = lastSignatures.size > 0 && !lastSignatures.has(sig);

      return `
        <div class="ticket__line" ${isNew ? 'data-new="true"' : ''}>
          <p class="ticket__name">${line.qty > 1 ? `${line.qty} × ` : ''}${esc(p.name)}</p>
          <p class="ticket__amount money">${moneyExact(price.total)}</p>
          <ul class="ticket__spec">
            ${spec ? `<li>${esc(spec)}</li>` : ''}
            ${line.inscription ? `<li class="ticket__inscription">“${esc(line.inscription)}”</li>` : ''}
            ${addonNames.length ? `<li>With ${esc(addonNames.join(', '))}</li>` : ''}
          </ul>
          ${
            showActions
              ? `<div class="ticket__actions">
                   <span class="qty qty--sm">
                     <button type="button" data-tq="-" data-line="${line.id}" aria-label="One fewer ${esc(p.name)}"${line.qty <= 1 ? ' disabled' : ''}>−</button>
                     <output aria-live="polite">${line.qty}</output>
                     <button type="button" data-tq="+" data-line="${line.id}" aria-label="One more ${esc(p.name)}">+</button>
                   </span>
                   <button class="ticket__remove" type="button" data-trm="${line.id}">Remove</button>
                 </div>`
              : ''
          }
        </div>`;
    })
    .join('');

  lastSignatures = new Set(cart.lines.map((l) => `${l.id}:${l.qty}`));

  const when = session.orderReadyBy();

  mount.innerHTML = `
    <div class="ticket">
      <div class="ticket__head">
        <span class="label">Your ticket</span>
        <span class="label">${session.count()} item${session.count() === 1 ? '' : 's'}</span>
      </div>
      <div class="ticket__body">
        ${lines}
        <div class="ticket__perf" aria-hidden="true"></div>
        ${
          showTotal
            ? `<div class="ticket__sum"><span>Subtotal</span><span class="money">${moneyExact(subtotal)}</span></div>
               <div class="ticket__sum ticket__sum--muted"><span>Collection or delivery</span><span>Chosen next</span></div>
               <div class="ticket__total">
                 <span>Total</span>
                 <strong class="money">${moneyExact(subtotal)}</strong>
               </div>`
            : `<div class="ticket__total">
                 <span>Items</span>
                 <strong class="money">${moneyExact(subtotal)}</strong>
               </div>`
        }
        ${
          when
            ? `<p class="ticket__when">${icons.clock} <strong>Ready ${esc(whenPhrase(when))}.</strong></p>`
            : ''
        }
        ${
          showActions
            ? `<p style="margin-top:var(--s-4)">
                 <a class="btn btn--lg btn--block" href="${checkoutHref}">Checkout</a>
               </p>`
            : ''
        }
      </div>
    </div>`;
}

/** Quantity and remove controls, delegated once per mount. */
export function bindTicket(mount) {
  if (!mount) return;
  mount.addEventListener('click', (e) => {
    const q = e.target.closest('[data-tq]');
    const rm = e.target.closest('[data-trm]');

    if (q) {
      const line = session.state.cart.lines.find((l) => l.id === q.dataset.line);
      if (line) session.setQty(line.id, line.qty + (q.dataset.tq === '+' ? 1 : -1));
      return;
    }
    if (rm) session.remove(rm.dataset.trm);
  });
}

/* -------------------------------------------------------------------------
   Mobile: summary bar + sheet
   ------------------------------------------------------------------------- */

export function mountMobileTicket() {
  if (document.querySelector('.ticketbar')) return;

  const bar = document.createElement('div');
  bar.className = 'ticketbar';
  bar.hidden = true;
  bar.innerHTML = `
    <span class="ticketbar__sum">
      <span class="ticketbar__count" data-tb-count></span>
      <span class="ticketbar__total money" data-tb-total></span>
    </span>
    <button class="btn btn--sm" type="button" data-tb-open>View ticket</button>
  `;

  const sheet = document.createElement('dialog');
  sheet.className = 'sheet';
  sheet.setAttribute('aria-label', 'Your ticket');
  sheet.innerHTML = `
    <div class="sheet__head">
      <h2 class="t-3">Your ticket</h2>
      <button class="dialog__close" type="button" data-tb-close aria-label="Close">${icons.close}</button>
    </div>
    <div class="sheet__body" data-tb-body></div>
  `;

  document.body.append(bar, sheet);

  bar.querySelector('[data-tb-open]').addEventListener('click', () => {
    renderTicket(sheet.querySelector('[data-tb-body]'));
    sheet.showModal();
  });
  sheet.querySelector('[data-tb-close]').addEventListener('click', () => sheet.close());
  bindTicket(sheet.querySelector('[data-tb-body]'));

  const paint = () => {
    const n = session.count();
    bar.hidden = n === 0;
    if (n === 0 && sheet.open) sheet.close();

    let subtotal = 0;
    for (const line of session.state.cart.lines) {
      const p = session.product(line.productId);
      if (p) subtotal += session.priceOf(p, line.selections, line.addons, line.qty).total;
    }
    bar.querySelector('[data-tb-count]').textContent = `${n} item${n === 1 ? '' : 's'}`;
    bar.querySelector('[data-tb-total]').textContent = money(subtotal);

    if (sheet.open) renderTicket(sheet.querySelector('[data-tb-body]'));
  };

  session.on('cart:change', paint);
  paint();
}
