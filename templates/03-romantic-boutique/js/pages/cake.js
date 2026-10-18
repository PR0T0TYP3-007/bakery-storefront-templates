/**
 * @file One cake.
 *
 * Size, what is inside, how the outside is finished, how many, and the day —
 * with the price moving as each is chosen, which is the brief's §7
 * requirement stated in its own words.
 *
 * The inscription is *not* here. It lives on the card page with the written
 * card, because the recipient sees both at once and choosing them apart is
 * how the market ends up with a cake that says one thing and a card that
 * says another. The second button goes straight there.
 */

import { startPage, $, $$, esc, photo, link } from './_page.js';
import * as session from '../services/session.js';
import { cakeTile, priceOf } from '../components/cakes.js';
import { plaquePreview } from '../components/cardpreview.js';
import { toast } from '../components/toast.js';
import { openDatePicker } from '../components/datepicker.js';
import { icons } from '../components/icons.js';
import { money, dateLong, whenPhraseMid } from '../../../../shared/core/format.js';
import { earliestFor, dayState } from '../../../../shared/core/fulfilment.js';
import {
  allergensFor,
  describeSelections,
  optionAvailable,
  reconcileSelections,
  soldOnDay,
} from '../../../../shared/core/rules.js';
import { dateKey } from '../../../../shared/core/dates.js';

await startPage({ nav: 'Cakes' });

const { merchant, catalogue } = session.state;
const groups = session.groups();

for (const el of $$('[data-home-link]')) el.href = link('index.html');
for (const el of $$('[data-cakes-link]')) el.href = link('cakes.html');

const wanted = new URLSearchParams(location.search).get('id');
const product = catalogue.products.find((p) => p.id === wanted && p.kind === 'cake');

if (!product) {
  $('[data-missing]').hidden = false;
} else {
  $('[data-cake]').hidden = false;
  render();
}

function render() {
  let selections = { ...product.defaults };
  let extras = [];
  let qty = 1;
  let shownWhen = null;

  document.title = `${product.name} — ${merchant.name}`;
  $('[data-crumb]').textContent = product.name;
  $('[data-name]').textContent = product.name;
  $('[data-sub]').textContent = product.subtitle;
  $('[data-desc]').textContent = product.description;

  $('[data-media]').innerHTML = product.image
    ? `<img src="${photo(product.image, 'lg')}"
         srcset="${photo(product.image, 'md')} 800w, ${photo(product.image, 'lg')} 1600w"
         sizes="(min-width: 62rem) 52vw, 92vw"
         alt="${esc(product.name)} — ${esc(product.subtitle)}"
         width="1600" height="2000" fetchpriority="high" decoding="async">`
    : `<span class="aperture--empty">${esc(product.name.slice(0, 1))}</span>`;

  /* ---- Options ---------------------------------------------------------- */
  function paintOptions() {
    const optionGroups = (product.options ?? []).map((id) => groups[id]).filter(Boolean);

    $('[data-options]').innerHTML = optionGroups
      .map(
        (g) => `
        <fieldset class="choices" style="margin-bottom:var(--s-5)">
          <legend class="label" style="padding-bottom:var(--s-3)">${esc(g.label)}</legend>
          ${g.options
            .map((o) => {
              // A disabled control with no explanation makes the customer
              // click it to find out why, which is the one question a
              // disabled control cannot answer.
              const can = optionAvailable(o, selections, groups);
              return `
            <label class="choice">
              <input type="radio" name="opt-${esc(g.id)}" value="${esc(o.id)}"
                ${selections[g.id] === o.id ? 'checked' : ''} ${can.ok ? '' : 'disabled'}>
              <span class="choice__face">
                <span class="choice__name">${esc(o.label)}</span>
                <span class="choice__meta">${o.price ? `+${money(o.price)}` : 'included'}</span>
                ${o.note ? `<span class="choice__note">${esc(o.note)}</span>` : ''}
                ${can.ok ? '' : `<span class="choice__why">${esc(can.reason)}</span>`}
              </span>
            </label>`;
            })
            .join('')}
        </fieldset>`
      )
      .join('');

    const available = (product.addons ?? [])
      .map((id) => catalogue.addons.find((a) => a.id === id))
      .filter(Boolean);

    if (available.length) {
      $('[data-options]').insertAdjacentHTML(
        'beforeend',
        `<fieldset class="choices" style="margin-bottom:var(--s-5)">
           <legend class="label" style="padding-bottom:var(--s-3)">Anything with it</legend>
           ${available
             .map(
               (a) => `
             <label class="choice">
               <input type="checkbox" data-extra value="${esc(a.id)}" ${extras.includes(a.id) ? 'checked' : ''}>
               <span class="choice__face">
                 <span class="choice__name">${esc(a.label)}</span>
                 <span class="choice__meta">+${money(a.price)}</span>
                 <span class="choice__note">${esc(a.note)}</span>
               </span>
             </label>`
             )
             .join('')}
         </fieldset>`
      );
    }
  }

  $('[data-options]').addEventListener('change', (e) => {
    if (e.target.name?.startsWith('opt-')) {
      selections[e.target.name.slice(4)] = e.target.value;

      // Choosing a smaller cake can make a finish impossible. Falling the
      // group back to its default and saying so beats keeping a
      // configuration the kitchen cannot make.
      const fixed = reconcileSelections(product, selections, groups);
      selections = fixed.selections;
      if (fixed.changed.length) {
        toast({
          title: `${fixed.changed.join(' and ')} changed`,
          detail: 'That one is not possible at this size, so it has gone back to the usual.',
          icon: icons.info,
        });
      }

      paintOptions();
      paint();
      return;
    }
    if (e.target.hasAttribute('data-extra')) {
      extras = $$('[data-extra]:checked').map((i) => i.value);
      paint();
    }
  });

  /* ---- The day ---------------------------------------------------------- */
  $('[data-pick-day]').addEventListener('click', () => {
    const lead = session.leadFor(product, selections);
    openDatePicker({
      leadDays: lead,
      selected:
        dayState(merchant, session.state.when, lead) === 'available'
          ? session.state.when
          : earliestFor(merchant, lead),
      title: `When do you want ${product.name}?`,
      note: `${lead === 0 ? 'No notice needed on this one' : `${lead} ${lead === 1 ? 'day' : 'days'} of notice as you have it configured`}.`,
      onSelect: (when) => {
        session.setWhen(when);
        paint();
      },
    });
  });

  /* ---- Quantity --------------------------------------------------------- */
  $('[data-more]').addEventListener('click', () => {
    qty += 1;
    paint();
  });
  $('[data-less]').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    paint();
  });

  /* ---- Paint ------------------------------------------------------------ */
  function paint() {
    const price = priceOf(product, selections, extras, qty);
    const lead = session.leadFor(product, selections);
    const earliest = earliestFor(merchant, lead);
    const possible = dayState(merchant, session.state.when, lead) === 'available';
    const when = possible ? session.state.when : earliest;
    shownWhen = when;

    // `unit` alone excludes the extras, so ticking candles would leave the
    // price unchanged — the brief's "clear price changes as selections are
    // made" failing in the most visible way available. Template 04 shipped
    // exactly that bug.
    $('[data-price]').textContent =
      qty > 1 ? `${money(price.total)} for ${qty}` : money(price.unit + price.addons);

    $('[data-ready]').textContent = dateLong(when);
    $('[data-qty]').textContent = String(qty);
    $('[data-less]').disabled = qty <= 1;

    const allergens = allergensFor(product, selections, groups);
    $('[data-allergens-line]').textContent = allergens.length
      ? `Contains ${allergens.join(', ')}.`
      : 'Nothing declared on this configuration.';

    const seasonal = !soldOnDay(product, when);
    const note = $('[data-state-note]');
    note.className = `note ${seasonal ? 'note--warn' : 'note--good'}`;
    note.innerHTML = `${seasonal ? icons.alert : icons.check}<span>${
      seasonal
        ? 'Not something we make at this time of year.'
        : `${lead === 0 ? 'We can do it the same day.' : `${lead} ${lead === 1 ? 'day' : 'days'} of notice on this one.`}`
    }</span>`;

    for (const b of $$('[data-add], [data-add-card]')) b.disabled = seasonal;

    // What would be piped on it, if anything is. Shown empty rather than
    // hidden, so the fact that this cake can carry words is visible before
    // anyone goes looking for where to type them.
    $('[data-plaque]').innerHTML = product.inscribable
      ? plaquePreview({ text: '', product })
      : `<p class="sm dimmer">${esc(product.name)} goes out plain — there is no good surface to write on. The card does the talking.</p>`;
  }

  /* ---- Adding ----------------------------------------------------------- */
  function addIt() {
    const { movedTo } = session.add({
      productId: product.id,
      selections: { ...selections },
      addons: [...extras],
      qty,
    });
    return movedTo;
  }

  $('[data-add]').addEventListener('click', () => {
    const movedTo = addIt();
    const surprise = movedTo && shownWhen && dateKey(movedTo) !== dateKey(shownWhen);
    const spec = describeSelections(product, selections, groups);

    toast({
      title: `${product.name} added`,
      detail: surprise
        ? `Needs more notice — set for ${whenPhraseMid(movedTo)}.`
        : [spec, `ready ${whenPhraseMid(movedTo ?? session.state.when)}`].filter(Boolean).join(' · '),
      icon: icons.check,
      action: { label: 'View basket', href: link('cart.html') },
    });

    if (movedTo) paint();
  });

  $('[data-add-card]').addEventListener('click', () => {
    addIt();
    const line = session.state.cart.lines[session.state.cart.lines.length - 1];
    location.href = link(`card.html?line=${encodeURIComponent(line.id)}`);
  });

  /* ---- The others ------------------------------------------------------- */
  $('[data-others]').innerHTML = catalogue.products
    .filter((p) => p.kind === 'cake' && p.id !== product.id)
    .slice(0, 4)
    .map((p) => cakeTile(p, { when: session.state.when }))
    .join('');

  session.on('when:change', paint);
  paintOptions();
  paint();
}
