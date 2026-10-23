/**
 * @file Checkout.
 *
 * Collection only — `capabilities.delivery` is false and a delivery control
 * that cannot be chosen is worse than none.
 *
 * Validation messages are bilingual and they repaint with the switch,
 * including messages already on screen: somebody who cannot read the
 * language is exactly the person most likely to be stuck on a form error,
 * and leaving the complaint in the old language would strand them.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter, esc } from '../components/chrome.js';
import { money } from '../components/plates.js';
import { lang, onLang, t, bcp47 } from '../services/locale.js';
import { bothFaces } from '../lang.js';
import * as api from '../services/api.js';
import { orderTotals } from '../../../../shared/core/pricing.js';
import { slotsFor, dayState } from '../../../../shared/core/fulfilment.js';
import { dateKey, today as startOfToday } from '../../../../shared/core/dates.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader();
renderFooter();

const { merchant, catalogue } = session.state;
const { lines } = session.state.cart;

const COPY = {
  skip: { fr: 'Aller au formulaire', en: 'Skip to the form' },
  head: { fr: 'Caisse', en: 'Checkout' },
  basket: { fr: 'Votre panier', en: 'Your basket' },
  collecting: { fr: 'À ramasser', en: 'Collecting' },
  changeDay: { fr: 'Changer la journée', en: 'Change the day' },
  slot: { fr: 'Vers quelle heure', en: 'What time' },
  slotHint: { fr: 'À peu près. Personne ne compte.', en: 'Roughly. Nobody is counting.' },
  slotBad: { fr: 'Choisissez une heure.', en: 'Pick a time.' },
  full: { fr: 'Plein', en: 'Full' },
  left: { fr: 'places', en: 'left' },
  who: { fr: 'À quel nom', en: 'Who we should ask for' },
  name: { fr: 'Nom', en: 'Name' },
  phone: { fr: 'Téléphone', en: 'Phone' },
  phoneHint: {
    fr: 'Pour vous appeler si quelque chose cloche.',
    en: 'So we can call if something goes wrong.',
  },
  email: { fr: 'Courriel', en: 'Email' },
  emailHint: { fr: 'Pour le reçu, rien d’autre.', en: 'For the receipt, and nothing else.' },
  note: { fr: 'Quelque chose à nous dire', en: 'Anything we should know' },
  noteHint: {
    fr: 'Allergies, un nom à écrire dessus, l’heure où vous venez vraiment.',
    en: 'Allergies, a name to pipe, the time you are really coming.',
  },
  paying: { fr: 'Paiement', en: 'Paying' },
  card: { fr: 'Numéro de carte', en: 'Card number' },
  cardHint: {
    fr: 'Rien n’est facturé — c’est une démonstration. 4242 4242 4242 4242 passe ; 4000 0000 0000 0002 est refusée.',
    en: 'Nothing is charged — this is a demonstration. 4242 4242 4242 4242 goes through; 4000 0000 0000 0002 is declined.',
  },
  submit: { fr: 'Passer la commande', en: 'Place the order' },
  sending: { fr: 'Envoi…', en: 'Sending…' },
  order: { fr: 'Votre commande', en: 'Your order' },
  toPay: { fr: 'À payer', en: 'To pay' },
  empty: { fr: 'Il n’y a rien à payer.', en: 'There is nothing to pay for.' },
  emptyLink: { fr: 'Voir la boutique', en: 'See the shop' },
  declinedHead: { fr: 'Ça n’a pas passé.', en: 'That did not go through.' },
  declinedTail: {
    fr: 'Votre panier est resté comme il était.',
    en: 'Your basket is where you left it.',
  },
  bad: {
    name: { fr: 'On a besoin d’un nom à appeler.', en: 'We need a name to call out.' },
    phone: {
      fr: 'Un numéro où on peut vraiment vous joindre.',
      en: 'A number we can actually reach you on.',
    },
    email: { fr: 'Ce courriel-là a l’air croche.', en: 'That email does not look right.' },
    card: { fr: 'Un numéro de carte au complet.', en: 'A full card number, please.' },
  },
};

const RULES = {
  name: (v) => v.trim().length >= 2,
  phone: (v) => v.replace(/[^\d]/g, '').length >= 6,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  card: (v) => v.replace(/\s+/g, '').length >= 15,
};

/* Which fields are currently complained about. Kept so the complaints can
   be repainted in the other language when the switch is pressed — a form
   error stranded in a language the reader cannot read is the worst possible
   place for one. */
const bad = new Set();

/* -------------------------------------------------------------------------
   Guard
   ------------------------------------------------------------------------- */
$('[data-order]').hidden = lines.length === 0;
$('[data-empty]').hidden = lines.length > 0;

let ok = lines.length > 0;

if (ok) {
  const when = session.state.when ?? startOfToday();
  const lead = Math.max(
    0,
    ...lines.map((l) => {
      const p = session.product(l.productId);
      return p ? session.leadFor(p, l.selections) : 0;
    })
  );

  /* A stale tab whose day has since gone past, or an edited URL. */
  if (dayState(merchant, when, lead) !== 'available') {
    location.replace('basket.html');
    ok = false;
  }
}

/* -------------------------------------------------------------------------
   Paint
   ------------------------------------------------------------------------- */
function draw() {
  const which = lang();
  const when = session.state.when ?? startOfToday();

  document.title = `${t(COPY.head, which)} — ${merchant.name}`;

  const set = (sel, value) => {
    const el = $(sel);
    if (el) el.textContent = value;
  };

  set('[data-skip]', t(COPY.skip, which));
  set('[data-head]', t(COPY.head, which));
  set('[data-crumb-basket]', t(COPY.basket, which));
  set('[data-crumb]', t(COPY.head, which));
  set('[data-empty-text]', t(COPY.empty, which));
  set('[data-empty-link]', t(COPY.emptyLink, which));
  $('[data-crumbs]')?.setAttribute('aria-label', which === 'fr' ? "Fil d'Ariane" : 'Breadcrumb');

  if (!ok) return;

  set('[data-when-label]', t(COPY.collecting, which));
  set('[data-change-day]', t(COPY.changeDay, which));
  set('[data-slot-label]', t(COPY.slot, which));
  set('[data-slot-hint]', t(COPY.slotHint, which));
  set('[data-who-label]', t(COPY.who, which));
  set('[data-l-name]', t(COPY.name, which));
  set('[data-l-phone]', t(COPY.phone, which));
  set('[data-h-phone]', t(COPY.phoneHint, which));
  set('[data-l-email]', t(COPY.email, which));
  set('[data-h-email]', t(COPY.emailHint, which));
  set('[data-l-note]', t(COPY.note, which));
  set('[data-h-note]', t(COPY.noteHint, which));
  set('[data-pay-label]', t(COPY.paying, which));
  set('[data-l-card]', t(COPY.card, which));
  set('[data-card-hint]', t(COPY.cardHint, which));
  set('[data-submit]', t(COPY.submit, which));
  set('[data-sum-label]', t(COPY.order, which));

  set(
    '[data-when-day]',
    new Intl.DateTimeFormat(bcp47(which), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(when)
  );
  set('[data-where]', session.location().address);

  paintSlots(when, which);
  paintSummary(which);

  /* Any complaint already on screen moves language with everything else. */
  for (const field of Object.keys(RULES)) {
    complain(field, bad.has(field) ? t(COPY.bad[field], which) : null);
  }

  const slotBad = $('[data-slot-bad]');
  if (!slotBad.hidden) slotBad.textContent = t(COPY.slotBad, which);
}

function paintSlots(when, which) {
  const slots = slotsFor(merchant, session.location(), when);

  /* Remember the chosen time across a repaint, like the product page
     remembers its options. */
  const current = $('[data-slots] input:checked')?.value ?? null;

  $('[data-slots]').innerHTML = slots
    .map((s, i) => {
      const checked = current ? s.time === current : i === 0 && !s.full;
      return `
        <label class="slot plate">
          <input type="radio" name="slot" value="${esc(s.time)}"
                 ${s.full ? 'disabled' : ''} ${checked && !s.full ? 'checked' : ''}>
          <span class="slot__time sign">${esc(s.time)}</span>
          <span class="slot__left sm">${
            s.full ? esc(t(COPY.full, which)) : `${s.left} ${esc(t(COPY.left, which))}`
          }</span>
        </label>`;
    })
    .join('');
}

function paintSummary(which) {
  $('[data-sum]').innerHTML = lines
    .map((l) => {
      const p = session.product(l.productId);
      if (!p) return '';
      const [face] = bothFaces(p, which);
      const price = session.priceOf(p, l.selections, l.addons, l.qty);
      return `
        <li class="sum__row">
          <span class="sum__n num">${esc(String(l.qty))}×</span>
          <span class="sum__name" lang="${esc(bcp47(face.lang))}">${esc(face.name)}</span>
          <span class="sum__price money">${esc(money(price.total, merchant, which))}</span>
        </li>`;
    })
    .join('');

  const t0 = orderTotals(lines, merchant, catalogue, { method: 'pickup' });

  $('[data-totals]').innerHTML = `
    <div class="totals__row totals__row--sum">
      <dt>${esc(t(COPY.toPay, which))}</dt>
      <dd class="money">${esc(money(t0.total, merchant, which))}</dd>
    </div>`;

  $('[data-tax]').textContent = t(merchant.taxNote, which);
}

/* -------------------------------------------------------------------------
   Validation
   ------------------------------------------------------------------------- */
function complain(field, message) {
  const el = $(`[data-bad-for="${field}"]`);
  const input = document.getElementById(field);
  if (!el || !input) return;

  el.textContent = message ?? '';
  el.hidden = !message;
  input.closest('.field')?.classList.toggle('field--bad', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function validate(form, which) {
  let first = null;
  bad.clear();

  for (const [field, rule] of Object.entries(RULES)) {
    const good = rule(form[field].value);
    if (!good) bad.add(field);
    complain(field, good ? null : t(COPY.bad[field], which));
    if (!good && !first) first = form[field];
  }

  const slot = form.querySelector('input[name="slot"]:checked');
  const slotBad = $('[data-slot-bad]');
  slotBad.textContent = slot ? '' : t(COPY.slotBad, which);
  slotBad.hidden = Boolean(slot);
  if (!slot && !first) first = form.querySelector('input[name="slot"]:not(:disabled)');

  return { valid: !first, first, slot };
}

/* -------------------------------------------------------------------------
   Submit
   ------------------------------------------------------------------------- */
const form = $('[data-pay]');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const which = lang();

  const { valid, first, slot } = validate(form, which);
  if (!valid) {
    first?.focus();
    return;
  }

  const button = $('[data-submit]');
  button.disabled = true;
  button.textContent = t(COPY.sending, which);
  $('[data-declined]').innerHTML = '';

  const when = session.state.when ?? startOfToday();
  const t0 = orderTotals(lines, merchant, catalogue, { method: 'pickup' });

  try {
    const receipt = await api.placeOrder({
      merchantId: merchant.id,
      fulfilment: {
        method: 'pickup',
        locationId: session.location().id,
        date: dateKey(when),
        slot: slot.value,
      },
      customer: {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
      },
      note: form.note.value.trim(),
      lines: lines.map((l) => ({
        productId: l.productId,
        selections: l.selections,
        addons: l.addons,
        qty: l.qty,
      })),
      payment: { card: form.card.value },
      total: t0.total,
    });

    /* Cleared only once the order exists — a declined card must not leave
       somebody with nothing. */
    session.clear();

    const q = new URLSearchParams({
      ref: receipt.reference,
      when: dateKey(when),
      slot: slot.value,
      lang: which,
    });
    location.href = `confirmation.html?${q}`;
  } catch (err) {
    $('[data-declined]').innerHTML = `
      <div class="declined plate" role="alert">
        <p class="declined__head sign">${esc(t(COPY.declinedHead, which))}</p>
        <p>${esc(err.message)}</p>
        <p>${esc(t(COPY.declinedTail, which))}</p>
      </div>`;
    $('[data-declined]').scrollIntoView({ block: 'nearest' });
  } finally {
    button.disabled = false;
    button.textContent = t(COPY.submit, lang());
  }
});

/* Clear a complaint as soon as the field is fixed, rather than making them
   submit again to find out they got it right. */
form?.addEventListener('input', (e) => {
  const field = e.target.name;
  if (!RULES[field]) return;
  const good = RULES[field](e.target.value);
  if (good) bad.delete(field);
  else bad.add(field);
  complain(field, good ? null : t(COPY.bad[field], lang()));
});

draw();
onLang(draw);
