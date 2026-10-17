/**
 * @file The builder. This is the page the template exists for.
 *
 * Every control writes into one `selections` object and then calls paint().
 * There is no partial update anywhere: a choice can change the price, the
 * lead time, the earliest possible day, which other options are legal, the
 * allergen list and the drawing, so recomputing all of it from one source is
 * both shorter and the only way those six things cannot disagree.
 *
 * The expensive part of paint() is one innerHTML of an SVG string, which is
 * well under a frame — measured at ~1.1ms for a three-tier sprinkle-coated
 * cake. Diffing it would be more code for no gain the user could feel.
 */

import { startPage, $, $$, esc, photo, link } from './_page.js';
import * as session from '../services/session.js';
import { cakeSVG, specFrom, describe, tierIcon } from '../components/cake.js';
import { productCard } from '../components/cards.js';
import { openDatePicker } from '../components/datepicker.js';
import { toast } from '../components/toast.js';
import { icons } from '../components/icons.js';
import { money } from '../../../../shared/core/format.js';
import { whenPhrase, whenPhraseMid } from '../../../../shared/core/format.js';
import { dayState, earliestFor } from '../../../../shared/core/fulfilment.js';
import {
  INSCRIPTION_MAX,
  leadDaysFor,
  reconcileSelections,
  validateInscription,
  allergensFor,
  optionAvailable,
  describeSelections,
} from '../../../../shared/core/rules.js';
import { dateKey } from '../../../../shared/core/dates.js';

await startPage({ nav: 'Build one' });

const { merchant, catalogue } = session.state;
const groups = session.groups();

/* -------------------------------------------------------------------------
   What are we building
   ------------------------------------------------------------------------- */
const wanted = new URLSearchParams(location.search).get('product');
const product =
  session.product(wanted) ??
  catalogue.products.find((p) => p.kind === 'custom') ??
  catalogue.products[0];

let selections = reconcileSelections(product, { ...product.defaults }, groups).selections;
let addons = [];
let inscription = '';
let qty = 1;

$('[data-home-link]').href = link('index.html');
$('[data-crumb]').textContent = product.name;
$('[data-name]').textContent = product.name;
$('[data-blurb]').textContent = product.description;
document.title = `${product.name} — ${merchant.name}`;

/* -------------------------------------------------------------------------
   The choice column

   Grouped into steps rather than listed as six fieldsets, because "inside"
   and "outside" are how someone thinks about a cake, and because six
   identical panels in a row is the rhythm problem Template 05 v1 had.
   ------------------------------------------------------------------------- */

const STEPS = [
  { title: 'How big', why: 'Pick by how many people, not by inches.', ids: ['tiers'] },
  { title: 'The inside', why: 'Sponge and what goes between the layers.', ids: ['sponge', 'filling'] },
  { title: 'The outside', why: 'The colour and how it is finished.', ids: ['icing', 'finish'] },
  { title: 'On top', why: 'And what it should say.', ids: ['topper'], inscribe: true },
  { title: 'How many', why: 'Boxes, not tiers.', ids: ['boxsize'] },
];

/** The tier chooser gets its own control: three drawings, not a swatch row. */
function tiersControl(group) {
  return `
    <fieldset class="swatches" style="display:block">
      <legend class="sr">${esc(group.label)}</legend>
      <div class="tiers">
        ${group.options
          .map(
            (o) => `
          <label class="tier">
            <input type="radio" name="opt-tiers" value="${esc(o.id)}" ${selections.tiers === o.id ? 'checked' : ''}>
            <span class="tier__face">
              ${tierIcon(Number(o.id))}
              <span class="tier__n">${esc(o.label)}</span>
              <span class="tier__serves">${esc(o.note ?? '')}</span>
              <span class="tier__serves">${o.price ? `+${money(o.price)}` : 'included'}</span>
            </span>
          </label>`
          )
          .join('')}
      </div>
    </fieldset>`;
}

/** Everything else: a row of swatches, coloured from the data. */
function swatchControl(group) {
  return `
    <fieldset class="swatches">
      <legend>${esc(group.label)}</legend>
      ${group.options
        .map((o) => {
          const { ok, reason } = optionAvailable(o, selections, groups);
          const dot = o.swatch
            ? `<span class="sw__dot" style="--dot:${esc(o.swatch)}"></span>`
            : '';
          return `
          <label class="sw">
            <input type="radio" name="opt-${esc(group.id)}" value="${esc(o.id)}"
              ${selections[group.id] === o.id ? 'checked' : ''} ${ok ? '' : 'disabled'}
              ${ok ? '' : `aria-describedby="why-${esc(group.id)}-${esc(o.id)}"`}>
            <span class="sw__face">
              ${dot}
              <span class="sw__name">${esc(o.label)}</span>
              <span class="sw__meta">${o.price ? `+${money(o.price)}` : 'included'}</span>
              ${o.note ? `<span class="sw__meta">${esc(o.note)}</span>` : ''}
              ${ok ? '' : `<span class="sw__meta" id="why-${esc(group.id)}-${esc(o.id)}">${esc(reason ?? '')}</span>`}
            </span>
          </label>`;
        })
        .join('')}
    </fieldset>`;
}

function inscriptionControl() {
  const { ok, reason } = validateInscription(inscription);
  return `
    <div class="inscription" style="margin-top:var(--s-4)">
      <label class="field__label" for="said">What should it say?</label>
      <span class="field__hint">Piped by hand, so keep it short. It appears on the cake as you type.</span>
      <input class="input" id="said" type="text" maxlength="${INSCRIPTION_MAX + 10}"
        value="${esc(inscription)}" placeholder="Happy Birthday Nour"
        aria-describedby="said-count" ${ok ? '' : 'aria-invalid="true"'}>
      <p class="counter" id="said-count" data-over="${inscription.length > INSCRIPTION_MAX}">
        ${inscription.length} / ${INSCRIPTION_MAX}
      </p>
      ${!ok && inscription ? `<p class="err">${icons.alert}<span>${esc(reason)}</span></p>` : ''}
    </div>`;
}

function addonsControl() {
  return `
    <div class="addons">
      ${catalogue.addons
        .map(
          (a) => `
        <label class="addon">
          <input type="checkbox" value="${esc(a.id)}" ${addons.includes(a.id) ? 'checked' : ''}>
          <span>
            ${esc(a.label)}
            <span class="sw__meta" style="display:block;font-weight:600">${esc(a.note)}</span>
          </span>
          <span class="addon__price">${a.price ? `+${money(a.price)}` : 'free'}</span>
        </label>`
        )
        .join('')}
    </div>`;
}

function renderChoices() {
  const mine = product.options ?? [];
  let n = 0;

  const cards = STEPS.filter((s) => s.ids.some((id) => mine.includes(id)) || (s.inscribe && product.inscribable))
    .map((step) => {
      n += 1;
      const controls = step.ids
        .filter((id) => mine.includes(id))
        .map((id) => (id === 'tiers' ? tiersControl(groups[id]) : swatchControl(groups[id])))
        .join('<div style="height:var(--s-4)"></div>');

      return `
        <section class="stepcard">
          <div class="stepcard__head">
            <p class="stepcard__n" aria-hidden="true">${n}</p>
            <div>
              <h2 class="stepcard__title">${esc(step.title)}</h2>
              <p class="stepcard__why">${esc(step.why)}</p>
            </div>
          </div>
          ${controls}
          ${step.inscribe && product.inscribable ? inscriptionControl() : ''}
        </section>`;
    })
    .join('');

  // Extras and the day are always last, and always in that order: people
  // decide what the cake is before they decide when they want it.
  const extras = `
    <section class="stepcard">
      <div class="stepcard__head">
        <p class="stepcard__n" aria-hidden="true">${n + 1}</p>
        <div>
          <h2 class="stepcard__title">Anything else</h2>
          <p class="stepcard__why">Added to the same box.</p>
        </div>
      </div>
      ${addonsControl()}
    </section>

    <section class="stepcard">
      <div class="stepcard__head">
        <p class="stepcard__n" aria-hidden="true">${n + 2}</p>
        <div>
          <h2 class="stepcard__title">When for</h2>
          <p class="stepcard__why" data-lead></p>
        </div>
      </div>
      <div class="row">
        <button class="btn" type="button" data-pick-day>
          ${icons.calendar}<span data-day-label>Choose a day</span>
        </button>
      </div>
      <p class="note" style="margin-top:var(--s-3)" data-day-note></p>
    </section>`;

  $('[data-choices]').innerHTML = cards + extras;
}

/* -------------------------------------------------------------------------
   The drawing and the numbers
   ------------------------------------------------------------------------- */

let lastTotal = null;

function paintStage() {
  const drawable = ['tiers', 'sponge', 'filling', 'icing', 'finish', 'topper'];
  const live = (product.options ?? []).filter((id) => drawable.includes(id));
  const spec = specFrom(product, selections, groups, inscription);

  // A photographed cake keeps its photograph — drawing a Rainbow as a plain
  // vanilla sponge would misrepresent what arrives. The drawing is shown
  // alongside it, small, for the parts that really are being chosen.
  if (product.image) {
    $('[data-stage-media]').innerHTML = `
      <img src="${photo(product.image, 'lg')}" alt="${esc(product.name)}"
           width="1200" height="900" decoding="async"
           style="border:var(--stroke);border-radius:var(--r-sm);aspect-ratio:4/3;object-fit:cover;width:100%">
      ${
        live.length
          ? `<div style="display:flex;gap:var(--s-3);align-items:center;margin-top:var(--s-3)">
               <div style="flex:none;width:92px;background:var(--surface);border:var(--stroke-2);border-radius:var(--r-sm)">
                 ${cakeSVG(spec, { compact: true, title: describe(spec) })}
               </div>
               <p class="sm" style="font-weight:700">Your version — ${esc(describeSelections(product, selections, groups) || 'as standard')}</p>
             </div>`
          : ''
      }`;
  } else {
    $('[data-stage-media]').innerHTML = cakeSVG(spec, { title: describe(spec), className: 'stage__svg' });
  }

  $('[data-caption]').textContent = describe(spec);

  const allergens = allergensFor(product, selections, groups);
  const note = $('[data-allergen-note]');
  if (allergens.length) {
    note.hidden = false;
    note.innerHTML = `${icons.info}<span>This cake contains <strong>${esc(allergens.join(', '))}</strong>.</span>`;
  } else {
    note.hidden = true;
  }
}

function paintPrice() {
  const price = session.priceOf(product, selections, addons, qty);
  const el = $('[data-price]');
  el.textContent = money(price.total);
  $('[data-commit-price]').textContent = money(price.total);

  // Flash the number when it moves, so a price rise is never silent.
  if (lastTotal !== null && price.total !== lastTotal) {
    el.removeAttribute('data-bumped');
    void el.offsetWidth; // forces the animation to restart
    el.setAttribute('data-bumped', '');
  }
  lastTotal = price.total;
}

/**
 * The day the commit bar is currently showing. The page falls forward to the
 * soonest possible date for display, so this is what the customer has
 * actually been promised — and the only honest thing to compare the basket's
 * answer against.
 */
let shownWhen = null;

function paintDay() {
  const lead = leadDaysFor(product, selections, groups);
  const earliest = earliestFor(merchant, lead);
  const chosen = session.state.when;
  const possible = dayState(merchant, chosen, lead) === 'available';
  const when = possible ? chosen : earliest;

  $('[data-lead]').textContent =
    lead === 0 ? 'Ready the same day.' : `This cake needs ${lead} ${lead === 1 ? 'day' : 'days'} of notice.`;

  shownWhen = when;
  $('[data-day-label]').textContent = whenPhrase(when);
  $('[data-commit-when]').textContent = `Ready ${whenPhraseMid(when)}`;

  const noteEl = $('[data-day-note]');
  if (!possible) {
    noteEl.className = 'note note--warn';
    noteEl.innerHTML = `${icons.alert}<span><strong>${esc(whenPhrase(chosen))} is too soon for this cake.</strong>
      The soonest we can do it is ${esc(whenPhraseMid(when))}.</span>`;
  } else {
    const cap = merchant.dailyCapacity;
    noteEl.className = 'note note--flat';
    noteEl.innerHTML = `${icons.info}<span>We make ${cap} cakes a day, so the day is held when you check out — not now.</span>`;
  }
}

/**
 * Falls any now-impossible group back to its default and says which, rather
 * than leaving a configuration the kitchen cannot make.
 * @returns {string[]} the labels of the groups that were changed
 */
function reconcile() {
  const { selections: next, changed } = reconcileSelections(product, selections, groups);
  selections = next;
  return changed;
}

function paint() {
  reconcile();
  paintStage();
  paintPrice();
  paintDay();
  $('[data-commit]').hidden = false;
}

/* -------------------------------------------------------------------------
   Wiring. Delegated, so re-rendering the choice column keeps working.
   ------------------------------------------------------------------------- */

const choices = $('[data-choices]');

choices.addEventListener('change', (e) => {
  const el = e.target;

  if (el.name?.startsWith('opt-')) {
    const groupId = el.name.slice(4);
    selections[groupId] = el.value;
    // A changed selection can make another option illegal, so the column is
    // rebuilt rather than patched — and the customer is told, because a
    // control that silently moves itself is worse than one that explains.
    const changed = reconcile();
    if (changed.length) {
      renderChoices();
      toast({
        title: 'Changed with it',
        detail: `${changed.join(' and ')} went back to the usual — the two do not go together.`,
        icon: icons.info,
      });
    }
    paint();
    return;
  }

  if (el.type === 'checkbox') {
    addons = $$('.addon input:checked', choices).map((i) => i.value);
    paint();
  }
});

// The inscription is painted on every keystroke. It is a text node swap in an
// already-built SVG string, so there is nothing to debounce.
choices.addEventListener('input', (e) => {
  if (e.target.id !== 'said') return;
  inscription = e.target.value;
  const counter = $('#said-count');
  counter.textContent = `${inscription.length} / ${INSCRIPTION_MAX}`;
  counter.dataset.over = String(inscription.length > INSCRIPTION_MAX);
  paintStage();
});

choices.addEventListener('click', (e) => {
  if (!e.target.closest('[data-pick-day]')) return;
  const lead = leadDaysFor(product, selections, groups);
  openDatePicker({
    leadDays: lead,
    selected: dayState(merchant, session.state.when, lead) === 'available'
      ? session.state.when
      : earliestFor(merchant, lead),
    title: `When do you need ${product.name.toLowerCase()}?`,
    onSelect: (when) => {
      session.setWhen(when);
      paintDay();
    },
  });
});

/* -------------------------------------------------------------------------
   Adding it
   ------------------------------------------------------------------------- */

$('[data-add]').addEventListener('click', () => {
  const check = validateInscription(inscription);
  if (!check.ok) {
    const field = $('#said');
    field?.focus();
    toast({ title: 'Have a look at the message', detail: check.reason, tone: 'bad', icon: icons.alert });
    return;
  }

  const { movedTo } = session.add({
    productId: product.id,
    selections: { ...selections },
    addons: [...addons],
    inscription: inscription.trim(),
    qty,
  });

  // `movedTo` only means the basket disagreed with the *stored* day. The page
  // has been showing the fallen-forward date all along, so saying "needs more
  // notice" for a date already on screen would contradict itself.
  const surprise = movedTo && shownWhen && dateKey(movedTo) !== dateKey(shownWhen);

  toast({
    title: `${product.name} added`,
    detail: surprise
      ? `Needs more notice, so it is set for ${whenPhraseMid(movedTo)}.`
      : `Ready ${whenPhraseMid(movedTo ?? session.state.when)}.`,
    icon: icons.check,
  });

  if (movedTo) paintDay();
});

/* -------------------------------------------------------------------------
   Goes well with it
   ------------------------------------------------------------------------- */

const also = catalogue.products
  .filter((p) => p.id !== product.id && p.kind === 'box')
  .slice(0, 3);

$('[data-also]').innerHTML = also
  .map((p) => productCard(p, { when: session.state.when }))
  .join('');

session.on('when:change', paintDay);

renderChoices();
paint();
