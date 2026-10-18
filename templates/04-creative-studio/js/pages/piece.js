/**
 * @file A single edition.
 *
 * Deliberately plain next to the commission page. An edition is a fixed
 * recipe at a fixed price — there is nothing to configure beyond how many,
 * and a page that pretended otherwise would be inventing decisions.
 */

import { startPage, $, $$, esc, photo, link } from './_page.js';
import * as session from '../services/session.js';
import { pieceTile, priceOf } from '../components/pieces.js';
import { toast } from '../components/toast.js';
import { icons } from '../components/icons.js';
import { money, dateLong, whenPhraseMid } from '../../../../shared/core/format.js';
import { shelf, earliestFor, dayState } from '../../../../shared/core/fulfilment.js';
import { allergensFor, describeSelections } from '../../../../shared/core/rules.js';
import { dateKey } from '../../../../shared/core/dates.js';

await startPage({ nav: 'Work' });

const { merchant, catalogue } = session.state;
const groups = session.groups();

for (const el of $$('[data-work-link], [data-work-link-2]')) el.href = link('work.html');
$('[data-commission-link]') && ($('[data-commission-link]').href = link('commission.html'));

const wanted = new URLSearchParams(location.search).get('id');
const product = catalogue.products.find((p) => p.id === wanted && p.kind === 'edition');

if (!product) {
  $('[data-missing]').hidden = false;
} else {
  $('[data-piece]').hidden = false;
  render();
}

function render() {
  let selections = { ...product.defaults };
  let qty = 1;
  let shownWhen = null;

  const index = catalogue.products.filter((p) => p.kind === 'edition').indexOf(product) + 1;

  document.title = `${product.name} — ${merchant.name}`;
  $('[data-crumb]').textContent = product.name;
  $('[data-n]').textContent = `Edition ${String(index).padStart(2, '0')}`;
  $('[data-name]').textContent = product.name;
  $('[data-sub]').textContent = product.subtitle;
  $('[data-desc]').textContent = product.description;

  $('[data-media]').innerHTML = product.image
    ? `<img src="${photo(product.image, 'lg')}"
         srcset="${photo(product.image, 'md')} 800w, ${photo(product.image, 'lg')} 1600w"
         sizes="(min-width: 60rem) 56vw, 92vw"
         alt="${esc(product.name)}" width="1600" height="1000" fetchpriority="high" decoding="async">`
    : '';

  /* ---- Options, if this edition has any --------------------------------- */
  const optionGroups = (product.options ?? []).map((id) => groups[id]).filter(Boolean);

  $('[data-options]').innerHTML = optionGroups
    .map(
      (g) => `
      <fieldset class="choices" style="margin-bottom:var(--s-4)">
        <legend class="label" style="padding-bottom:var(--s-2)">${esc(g.label)}</legend>
        ${g.options
          .map(
            (o) => `
          <label class="choice">
            <input type="radio" name="opt-${esc(g.id)}" value="${esc(o.id)}" ${selections[g.id] === o.id ? 'checked' : ''}>
            <span class="choice__face">
              <span class="choice__name">${esc(o.label)}</span>
              <span class="choice__meta">${o.price ? `+${money(o.price)}` : 'included'}</span>
            </span>
          </label>`
          )
          .join('')}
      </fieldset>`
    )
    .join('');

  $('[data-options]').addEventListener('change', (e) => {
    if (!e.target.name?.startsWith('opt-')) return;
    selections[e.target.name.slice(4)] = e.target.value;
    paint();
  });

  /* ---- Quantity ---------------------------------------------------------- */
  $('[data-more]').addEventListener('click', () => {
    qty += 1;
    paint();
  });
  $('[data-less]').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    paint();
  });

  /* ---- Paint ------------------------------------------------------------- */
  function paint() {
    const price = priceOf(product, selections, [], qty);
    const lead = session.leadFor(product, selections);
    const earliest = earliestFor(merchant, lead);
    const possible = dayState(merchant, session.state.when, lead) === 'available';
    const when = possible ? session.state.when : earliest;
    shownWhen = when;

    const state = shelf(merchant, product, when);

    $('[data-price]').textContent = qty > 1 ? `${money(price.total)} for ${qty}` : money(price.unit);
    $('[data-ready]').textContent = dateLong(when);
    $('[data-qty]').textContent = String(qty);
    $('[data-less]').disabled = qty <= 1;

    const allergens = allergensFor(product, selections, groups);
    $('[data-allergens-list]').textContent = allergens.length ? allergens.join(', ') : 'Nothing declared';

    const note = $('[data-state-note]');
    const out = state.state === 'out';
    note.className = `note ${out ? 'note--bad' : 'note--good'}`;
    // shelf() returns some labels already punctuated, so the trailing stop is
    // stripped rather than doubled.
    note.innerHTML = `${out ? icons.alert : icons.check}<span>${esc(state.label.replace(/\.$/, ''))}. ${
      lead === 0 ? 'Same day.' : `${lead} ${lead === 1 ? 'day' : 'days'} of notice.`
    }</span>`;

    $('[data-add]').disabled = out;
    $('[data-add]').textContent = out ? 'Gone for that day' : 'Add to basket';
  }

  /* ---- Adding ------------------------------------------------------------ */
  $('[data-add]').addEventListener('click', () => {
    const { movedTo } = session.add({
      productId: product.id,
      selections: { ...selections },
      addons: [],
      qty,
    });

    const surprise = movedTo && shownWhen && dateKey(movedTo) !== dateKey(shownWhen);
    const spec = describeSelections(product, selections, groups);

    toast({
      title: `${product.name} added`,
      detail: surprise
        ? `Needs more notice — set for ${whenPhraseMid(movedTo)}.`
        : [spec, `ready ${whenPhraseMid(movedTo ?? session.state.when)}`].filter(Boolean).join(' · '),
      icon: icons.check,
    });

    if (movedTo) paint();
  });

  /* ---- The others -------------------------------------------------------- */
  $('[data-others]').innerHTML = catalogue.products
    .filter((p) => p.kind === 'edition' && p.id !== product.id)
    .map((p) => `<div class="c-4">${pieceTile(p, { when: session.state.when })}</div>`)
    .join('');

  session.on('when:change', paint);
  paint();
}
