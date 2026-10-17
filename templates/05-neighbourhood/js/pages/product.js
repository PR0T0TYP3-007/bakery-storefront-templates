/**
 * @file Product — configuring one item.
 *
 * Three rules: the price is always current, the earliest collection day is a
 * consequence of the options chosen, and an option that cannot be made says
 * so on itself rather than silently failing later.
 */

import { startPage, $, $$, esc } from './_page.js';
import * as session from '../services/session.js';
import { imgSrc, qsFirst } from '../components/board.js';
import { toast } from '../components/toast.js';
import { openDatePicker } from '../components/datepicker.js';
import { icons } from '../components/icons.js';
import { money, whenPhrase, dayWord, list } from '../core/format.js';
import { shelf, earliestFor, dayState } from '../core/fulfilment.js';
import {
  optionAvailable,
  reconcileSelections,
  validateInscription,
  allergensFor,
  INSCRIPTION_MAX,
} from '../core/rules.js';

await startPage({ nav: 'Shop' });

const q = qsFirst();
$('[data-home-link]').href = `index.html${q}`;
$$('[data-shop-link]').forEach((a) => (a.href = `shop.html${q}`));

const id = new URLSearchParams(location.search).get('id');
const product = session.product(id);

if (!product) {
  $('[data-missing]').hidden = false;
} else {
  run();
}

function run() {
  const { merchant, catalogue } = session.state;
  $('[data-pdp]').hidden = false;
  document.title = `${product.name} — ${merchant.name}`;

  const state = {
    selections: { ...product.defaults },
    addons: [],
    inscription: '',
    qty: 1,
    when: null,
  };

  /* --- static ---------------------------------------------------------- */
  $('[data-crumb]').textContent = product.name;
  $('[data-name]').textContent = product.name;
  $('[data-subtitle]').textContent = product.subtitle;
  $('[data-description]').innerHTML = `<p>${esc(product.description)}</p>`;
  $('[data-category]').textContent =
    catalogue.categories.find((c) => c.id === product.category)?.label ?? '';
  $('[data-allergen-statement]').innerHTML = `${icons.info} <span>${esc(merchant.allergenStatement)}</span>`;

  const src = imgSrc(product.image, 1600);
  $('[data-figure]').innerHTML = src
    ? `<img src="${src}" alt="${esc(product.name)} — ${esc(product.subtitle)}" width="1600" height="1200" fetchpriority="high" decoding="async">`
    : `<span class="monogram" aria-hidden="true">${esc(product.name.trim()[0])}</span>`;

  /* --- options --------------------------------------------------------- */
  const groups = session.groups();
  const hasOptions = (product.options ?? []).length > 0;

  if (hasOptions) {
    $('[data-options-block]').hidden = false;
    paintOptions();
    $('[data-options]').addEventListener('change', (e) => {
      const input = e.target.closest('input[type="radio"]');
      if (!input) return;
      state.selections[input.name] = input.value;

      // Choosing a smaller cake can invalidate a finish that needs a bigger
      // one. Fall those back and say so, rather than leaving an impossible
      // configuration in place.
      const { selections, changed } = reconcileSelections(product, state.selections, groups);
      state.selections = selections;
      if (changed.length) {
        toast({
          title: `${list(changed)} reset`,
          detail: 'That combination is not one we can make.',
          tone: 'bad',
        });
      }
      paintOptions();
      repaint({ bump: true });
    });
  }

  function paintOptions() {
    $('[data-options]').innerHTML = product.options
      .map((gid) => {
        const g = groups[gid];
        if (!g) return '';
        return `
          <div class="pdp__blockhead" style="margin-top:var(--s-4)">
            <h2 class="t-3">${esc(g.label)}</h2>
            <span class="sm" data-chosen="${g.id}"></span>
          </div>
          ${g.help ? `<p class="field__hint" style="margin:0 0 var(--s-2)">${esc(g.help)}</p>` : ''}
          <fieldset class="opts">
            <legend class="vh">${esc(g.label)}</legend>
            ${g.options
              .map((o) => {
                const avail = optionAvailable(o, state.selections, groups);
                return `
                <label class="opt">
                  <input type="radio" name="${g.id}" value="${o.id}"
                    ${state.selections[g.id] === o.id ? 'checked' : ''}
                    ${avail.ok ? '' : 'disabled'}>
                  <span class="opt__mark" aria-hidden="true"></span>
                  <span class="opt__body">
                    <span class="opt__name">${esc(o.label)}</span>
                    ${o.note || !avail.ok ? `<span class="opt__note">${esc(avail.ok ? o.note : avail.reason)}</span>` : ''}
                  </span>
                  <span class="opt__price money">${o.price ? `+${money(o.price)}` : 'Included'}</span>
                </label>`;
              })
              .join('')}
          </fieldset>`;
      })
      .join('');
  }

  /* --- inscription ----------------------------------------------------- */
  const canInscribe = product.inscribable && merchant.capabilities.inscriptions;
  if (canInscribe) {
    $('[data-inscription-block]').hidden = false;
    const input = $('[data-insc]');
    const preview = $('[data-insc-preview]');

    input.addEventListener('input', () => {
      state.inscription = input.value;
      $('[data-insc-count]').textContent = String(input.value.length);

      const empty = input.value.trim() === '';
      preview.dataset.empty = String(empty);
      preview.querySelector('p').textContent = empty
        ? 'We pipe exactly what you type here.'
        : input.value;

      const check = validateInscription(input.value);
      const field = $('[data-insc-field]');
      field.dataset.invalid = String(!check.ok);
      $('[data-insc-error]').innerHTML = check.ok
        ? ''
        : `${icons.alert}<span>${esc(check.reason)}</span>`;
      repaint();
    });
  }

  /* --- add-ons --------------------------------------------------------- */
  $('[data-addons]').innerHTML = catalogue.addons
    .map(
      (a) => `
      <label class="opt opt--check">
        <input type="checkbox" value="${a.id}">
        <span class="opt__mark" aria-hidden="true"></span>
        <span class="opt__body">
          <span class="opt__name">${esc(a.label)}</span>
          <span class="opt__note">${esc(a.note)}</span>
        </span>
        <span class="opt__price money">+${money(a.price)}</span>
      </label>`
    )
    .join('');

  $('[data-addons]').addEventListener('change', (e) => {
    const box = e.target.closest('input[type="checkbox"]');
    if (!box) return;
    state.addons = box.checked
      ? [...state.addons, box.value]
      : state.addons.filter((x) => x !== box.value);
    repaint({ bump: true });
  });

  /* --- collection day --------------------------------------------------- */
  $('[data-change-day]').addEventListener('click', () => {
    openDatePicker({
      leadDays: session.leadFor(product, state.selections),
      selected: state.when,
      title: `When do you need the ${product.name.toLowerCase()}?`,
      onSelect: (d) => {
        state.when = d;
        // Keep the header in step when the product allows that day generally.
        if (dayState(merchant, d, 0) === 'available') session.setWhen(d);
        repaint();
      },
    });
  });

  /* --- quantity + add --------------------------------------------------- */
  $$('[data-qty]').forEach((b) =>
    b.addEventListener('click', () => {
      state.qty = Math.max(1, Math.min(24, state.qty + (b.dataset.qty === '+' ? 1 : -1)));
      repaint();
    })
  );

  $('[data-add-configured]').addEventListener('click', () => {
    const check = validateInscription(state.inscription);
    if (!check.ok) {
      $('[data-insc]').focus();
      toast({ title: 'Check the message', detail: check.reason, tone: 'bad' });
      return;
    }

    session.add({
      productId: product.id,
      selections: { ...state.selections },
      addons: [...state.addons],
      inscription: state.inscription.trim(),
      qty: state.qty,
    });

    toast({
      title: `${state.qty > 1 ? `${state.qty} × ` : ''}${product.name} added`,
      detail: `Collect ${whenPhrase(state.when)}.`,
    });
  });

  /* --- repaint ---------------------------------------------------------- */
  let lastUnit = null;

  function repaint({ bump = false } = {}) {
    const lead = session.leadFor(product, state.selections);

    if (!state.when || dayState(merchant, state.when, lead) !== 'available') {
      state.when = earliestFor(merchant, lead);
    }

    const price = session.priceOf(product, state.selections, state.addons, state.qty);

    const priceEl = $('[data-price]');
    priceEl.textContent = money(price.unit);
    if (bump && lastUnit !== null && lastUnit !== price.unit) {
      priceEl.dataset.bumped = 'false';
      void priceEl.offsetWidth;
      priceEl.dataset.bumped = 'true';
    }
    lastUnit = price.unit;

    $('[data-price-note]').textContent = price.addons
      ? `each · +${money(price.addons)} of extras`
      : 'each';

    for (const gid of product.options ?? []) {
      const chosen = groups[gid]?.options.find((o) => o.id === state.selections[gid]);
      const el = $(`[data-chosen="${gid}"]`);
      if (el) el.textContent = chosen?.label ?? '';
    }

    const s = shelf(merchant, product, state.when);
    const shelfEl = $('[data-shelf]');
    shelfEl.dataset.state = s.state;
    shelfEl.textContent = s.label;

    $('[data-ready-note]').innerHTML = `${icons.clock} <span><strong>${esc(whenPhrase(state.when))}.</strong> ${
      lead === 0
        ? `Same day if you order before ${merchant.cutoffHour}am.`
        : `This needs ${lead} ${lead === 1 ? 'day' : 'days'} of notice.`
    }</span>`;

    const allergens = allergensFor(product, state.selections, groups);
    $('[data-allergens]').innerHTML = allergens.length
      ? allergens.map((a) => `<span class="allergen">${esc(a)}</span>`).join('')
      : '<span class="sm">None declared.</span>';

    $('[data-qty-out]').textContent = String(state.qty);
    $('[data-qty="-"]').disabled = state.qty <= 1;
    $('[data-qty="+"]').disabled = state.qty >= 24;

    const soldOut = s.state === 'out';
    const btn = $('[data-add-configured]');
    btn.disabled = soldOut;
    btn.textContent = soldOut
      ? 'Sold out for this day'
      : `Add to basket — ${money(price.total)}`;

    $('[data-buy-note]').textContent = merchant.capabilities.delivery
      ? 'Collection or local delivery, chosen at checkout. No payment is taken in this demonstration.'
      : 'Collection only. No payment is taken in this demonstration.';
  }

  session.on('when:change', () => {
    state.when = null;
    repaint();
  });

  repaint();
}
