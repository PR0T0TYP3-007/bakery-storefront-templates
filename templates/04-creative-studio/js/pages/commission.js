/**
 * @file The commission page. This is what the template is for.
 *
 * Every control writes into one brief object and then calls paint(). There is
 * no partial update: a choice can change the price, the lead time, the
 * earliest possible day, which techniques are still legal and what the spec
 * sheet says, so recomputing all of it from one source is both shorter and
 * the only way those five things cannot disagree.
 *
 * The expensive part of paint() is one innerHTML of the sheet, which is a
 * few hundred bytes of markup. Diffing it would be more code for no gain
 * anyone could feel.
 */

import { startPage, $, $$, esc, link, photo } from './_page.js';
import * as session from '../services/session.js';
import {
  priceCommission,
  techniqueAvailable,
  techniqueAllowance,
} from '../commission.js';
import { specSheet } from '../components/specsheet.js';
import { openDatePicker } from '../components/datepicker.js';
import { toast } from '../components/toast.js';
import { icons } from '../components/icons.js';
import { money, dateLong, whenPhraseMid } from '../../../../shared/core/format.js';
import { earliestFor, dayState } from '../../../../shared/core/fulfilment.js';
import { dateKey } from '../../../../shared/core/dates.js';

await startPage({ nav: 'Commission' });

const { merchant, catalogue } = session.state;
const groups = catalogue.optionGroups;
const product = catalogue.products.find((p) => p.kind === 'commission');

$('[data-valid-days]').textContent = merchant.commission.quoteValidDays;
$('[data-editions-link]').href = link('work.html');

/* -------------------------------------------------------------------------
   The brief
   ------------------------------------------------------------------------- */
let selections = { ...product.defaults, setup: false };
let techniques = [];
/**
 * The written brief.
 *
 * The six options fix the scale, the ambition, the techniques and the colour
 * direction. They do not describe the *idea* — and once they are answered,
 * what the cake actually looks like is down to whoever builds it. This is
 * where the customer says what they are picturing. It used to be one
 * textarea at the bottom of the delivery step, which is why nobody found it.
 */
let brief = { occasion: '', idea: '', avoid: '' };
let touched = false;
let lastTotal = null;
let shownWhen = null;

/* -------------------------------------------------------------------------
   The controls

   Grouped into numbered steps. The ambition step comes before the techniques
   step on purpose: ambition caps how many techniques the brief may carry, so
   choosing it second would mean watching options switch off behind you.
   ------------------------------------------------------------------------- */

function choiceRow({ name, value, checked, disabled, title, meta, note, why }) {
  return `
    <label class="choice">
      <input type="radio" name="${esc(name)}" value="${esc(value)}"
        ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
      <span class="choice__face">
        <span class="choice__name">${esc(title)}</span>
        <span class="choice__meta">${meta ?? ''}</span>
        ${note ? `<span class="choice__note">${esc(note)}</span>` : ''}
        ${why ? `<span class="choice__why">${esc(why)}</span>` : ''}
      </span>
    </label>`;
}

function checkRow({ id, checked, disabled, title, meta, note, why }) {
  return `
    <label class="choice">
      <input type="checkbox" value="${esc(id)}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
      <span class="choice__face">
        <span class="choice__name">${esc(title)}</span>
        <span class="choice__meta">${meta ?? ''}</span>
        ${note ? `<span class="choice__note">${esc(note)}</span>` : ''}
        ${why ? `<span class="choice__why">${esc(why)}</span>` : ''}
      </span>
    </label>`;
}

/**
 * The ambition control, shown as photographs.
 *
 * This is the decision that moves the price most — it multiplies the base —
 * and it was four abstract words with abstract notes under them. Nobody can
 * choose between "Composed" and "Sculptural" from prose. Each level now shows
 * what it looks like, which is how a studio would answer the question in
 * person: by pointing at something it has made.
 */
function ambitionRow(o) {
  const { ok } = { ok: true };
  return `
    <label class="look">
      <input type="radio" name="ambition" value="${esc(o.id)}" ${selections.ambition === o.id ? 'checked' : ''}>
      <span class="look__face">
        <span class="look__media">
          <img src="${photo(o.image, 'md')}"
               srcset="${photo(o.image, 'sm')} 240w, ${photo(o.image, 'md')} 800w"
               sizes="(min-width: 60rem) 22vw, 45vw"
               alt="A ${o.label.toLowerCase()} commission" loading="lazy" decoding="async"
               width="800" height="1000">
        </span>
        <span class="look__body">
          <span class="look__name">${esc(o.label)}</span>
          <span class="look__meta num">from ${money(Math.round(baseFor() * o.factor))} &middot; ${o.leadDays} days</span>
          <span class="look__note">${esc(o.note)}</span>
          <span class="look__meta">Up to ${o.allows} ${o.allows === 1 ? 'technique' : 'techniques'}</span>
        </span>
      </span>
    </label>`;
}

/** The base this brief currently sits on, so each level can show a real figure. */
function baseFor() {
  return groups.scale.options.find((o) => o.id === selections.scale)?.price ?? 0;
}

function step(n, title, why, body) {
  return `
    <section class="sec--tight">
      <div class="marker">
        <span class="marker__n">${String(n).padStart(2, '0')}</span>
        <span class="marker__name label">${esc(title)}</span>
        ${why ? `<span class="sm dim marker__why">${esc(why)}</span>` : ''}
      </div>
      ${body}
    </section>`;
}

/**
 * The brief opens on a sensible default rather than an empty form, the way
 * Template 02's builder does: an empty configurator gives the customer
 * nothing to react to, and a studio that cannot show a starting point looks
 * like it has no opinion. What it must not do is let that default pass for
 * the customer's own choice, so it says so, once, above the first step.
 */
function startingNote() {
  if (touched) return '';
  const scale = groups.scale.options.find((o) => o.id === selections.scale);
  const amb = groups.ambition.options.find((o) => o.id === selections.ambition);
  return `<p class="note" style="margin-bottom:var(--s-5)">${icons.info}<span>
      Starting from <strong>${esc(amb.label.toLowerCase())}, ${esc(scale.label.toLowerCase())}</strong>
      &mdash; the brief we are asked for most. Change any of it; the figure follows.
    </span></p>`;
}

/** How long the idea box accepts. Enough for a paragraph, not an essay. */
const IDEA_MAX = 600;

/**
 * Three short questions rather than one open box. "Anything we should know"
 * gets you nothing; "what is it for" gets you an answer.
 */
function ideaFields() {
  return `
    <div class="stack">
      <label class="field" style="margin:0">
        <span class="field__label label" for="occasion">What is it for?</span>
        <span class="field__hint">A wedding, a launch, a fortieth. It changes how we read everything else.</span>
        <input class="input" id="occasion" type="text" data-brief="occasion" maxlength="80"
          placeholder="A gallery opening, 60 people, evening">
      </label>

      <label class="field" style="margin:0">
        <span class="field__label label" for="idea">The idea, in your words</span>
        <span class="field__hint">
          What are you picturing? A shape, a feeling, something you have seen. As much or as
          little as you like &mdash; this is what we design from.
        </span>
        <textarea class="textarea" id="idea" data-brief="idea" maxlength="${IDEA_MAX}"
          style="min-height:9rem"
          placeholder="Something that looks carved rather than iced. The room is white and very bright. I keep coming back to Brutalist stairwells."></textarea>
        <span class="counter num" data-idea-count>0 / ${IDEA_MAX}</span>
      </label>

      <label class="field" style="margin:0">
        <span class="field__label label" for="avoid">Anything to avoid</span>
        <span class="field__hint">A colour, a flavour, a style you hate. Allergies go at checkout, not here.</span>
        <input class="input" id="avoid" type="text" data-brief="avoid" maxlength="120"
          placeholder="Nothing pink, no fresh flowers">
      </label>

      <p class="note">${icons.info}<span>
        <strong>We design it from this.</strong> The choices above set the size, the amount of
        work and the palette. This is where the idea comes from. Expect us to come back with
        questions within two working days &mdash; and sometimes with a better idea than the one
        you sent.
      </span></p>
    </div>`;
}

function renderChoices() {
  const allowance = techniqueAllowance(catalogue, selections);

  const scale = groups.scale.options
    .map((o) =>
      choiceRow({
        name: 'scale',
        value: o.id,
        checked: selections.scale === o.id,
        title: o.label,
        meta: money(o.price),
        note: o.note,
      })
    )
    .join('');

  const ambition = `<div class="looks">${groups.ambition.options.map(ambitionRow).join('')}</div>`;

  const palette = groups.palette.options
    .map((o) =>
      choiceRow({
        name: 'palette',
        value: o.id,
        checked: selections.palette === o.id,
        title: o.label,
        meta: '',
        note: o.note,
      })
    )
    .join('');

  // The product's own list, not the whole catalogue: editions' extras
  // (candles, a card, a gift box) are add-ons too and are not techniques.
  const tech = (product.addons ?? [])
    .map((id) => catalogue.addons.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => {
      const { ok, reason } = techniqueAvailable(catalogue, selections, techniques, a.id);
      return checkRow({
        id: a.id,
        checked: techniques.includes(a.id),
        disabled: !ok,
        title: a.label,
        meta: `${money(a.price)} &middot; +${a.leadDays}d`,
        note: a.note,
        why: ok ? '' : reason,
      });
    })
    .join('');

  $('[data-choices]').innerHTML =
    startingNote() +
    step(1, 'How many it has to feed', 'People. Scale sets the base.', `<fieldset class="choices"><legend class="sr">Scale</legend>${scale}</fieldset>`) +
    step(2, 'How far we take it', `Each step is more work on the bench, so it multiplies the ${money(baseFor())} above rather than adding to it.`, `<fieldset style="border:0;padding:0;margin:0"><legend class="sr">How far we take it</legend>${ambition}</fieldset>`) +
    step(3, 'The idea', 'The part the options cannot describe.', ideaFields()) +
    step(
      4,
      'Our techniques',
      `${techniques.length} of ${allowance} used at this level.`,
      `<fieldset class="choices"><legend class="sr">Techniques</legend>${tech}</fieldset>`
    ) +
    step(5, 'Where the colour goes', 'No charge either way.', `<fieldset class="choices"><legend class="sr">Palette</legend>${palette}</fieldset>`) +
    step(
      6,
      'The day, and getting it there',
      '',
      `<div class="stack">
         <div class="row">
           <button class="btn" type="button" data-pick-day>${icons.calendar}<span data-day-label>Choose a day</span></button>
           <p class="sm dim" data-day-note></p>
         </div>
         <fieldset class="choices"><legend class="sr">Delivery</legend>
           ${checkRow({
             id: 'setup',
             checked: selections.setup,
             title: 'Deliver it and set it up',
             meta: money(merchant.commission.setupFee),
             note: merchant.delivery.note,
           }).replace('type="checkbox"', 'type="checkbox" data-setup')}
         </fieldset>
       </div>`
    );
}

/* -------------------------------------------------------------------------
   The sheet
   ------------------------------------------------------------------------- */

function priced() {
  return priceCommission(merchant, catalogue, selections, techniques, { setup: selections.setup });
}

function paintSheet(p, earliest) {
  $('[data-sheet-hold]').innerHTML = specSheet({
    merchant,
    priced: p,
    selections,
    techniqueIds: techniques,
    groups,
    earliest,
    brief,
  });

  const el = $('[data-amount]');
  if (lastTotal !== null && p.subtotal !== lastTotal) {
    el.removeAttribute('data-bumped');
    void el.offsetWidth; // restarts the animation
    el.setAttribute('data-bumped', '');
  }
  lastTotal = p.subtotal;
}

function paint() {
  const p = priced();

  // The diary respects the bench time this brief actually needs, so the
  // earliest date moves as techniques are added.
  const earliest = earliestFor(merchant, p.leadDays);
  const chosen = session.state.when;
  const possible = dayState(merchant, chosen, p.leadDays) === 'available';
  const when = possible ? chosen : earliest;
  shownWhen = when;

  paintSheet(p, when);

  $('[data-day-label]').textContent = dateLong(when);
  $('[data-day-note]').textContent = possible
    ? `${p.leadDays} days on the bench.`
    : `Soonest we can take it: ${p.leadDays} days of bench time.`;

  $('[data-commit-price]').textContent = money(p.subtotal);
  $('[data-commit-when]').textContent = `${money(p.deposit)} to book &middot; ready ${dateLong(when)}`
    .replace('&middot;', '·');

  const book = $('[data-book]');
  book.disabled = p.belowMinimum;
  $('[data-book-label]').textContent = p.belowMinimum
    ? `${money(p.shortfall)} under the minimum`
    : `Book it — ${money(p.deposit)} now`;

  $('[data-commit]').hidden = false;
}

/* -------------------------------------------------------------------------
   Wiring. Delegated, so rebuilding the controls keeps everything working.
   ------------------------------------------------------------------------- */

const host = $('[data-choices]');

host.addEventListener('change', (e) => {
  const el = e.target;

  if (el.type === 'radio') {
    touched = true;
    selections[el.name] = el.value;
    // Dropping to a lower ambition can make chosen techniques illegal. Say
    // so and drop them rather than quietly charging for something the level
    // does not allow.
    const allowance = techniqueAllowance(catalogue, selections);
    if (techniques.length > allowance) {
      const dropped = techniques.slice(allowance);
      techniques = techniques.slice(0, allowance);
      const names = dropped
        .map((id) => catalogue.addons.find((a) => a.id === id)?.label)
        .filter(Boolean);
      toast({
        title: `${names.length} technique${names.length === 1 ? '' : 's'} came off`,
        detail: `${names.join(' and ')} — a ${groups.ambition.options.find((o) => o.id === selections.ambition).label} brief takes ${allowance}.`,
        icon: icons.info,
      });
    }
    renderChoices();
    restoreNotes();
    paint();
    return;
  }

  if (el.hasAttribute('data-setup')) {
    selections.setup = el.checked;
    paint();
    return;
  }

  if (el.type === 'checkbox') {
    touched = true;
    techniques = $$('.choice input[type="checkbox"]:not([data-setup]):checked', host).map((i) => i.value);
    // Re-rendering switches the remaining techniques on or off as the
    // allowance fills up, which is the whole point of the cap being visible.
    renderChoices();
    restoreNotes();
    paint();
  }
});

host.addEventListener('input', (e) => {
  const field = e.target.getAttribute('data-brief');
  if (!field) return;
  brief[field] = e.target.value;
  if (field === 'idea') $('[data-idea-count]').textContent = `${brief.idea.length} / ${IDEA_MAX}`;
  paintSheet(priced(), shownWhen);
});

host.addEventListener('click', (e) => {
  if (!e.target.closest('[data-pick-day]')) return;
  const p = priced();
  openDatePicker({
    leadDays: p.leadDays,
    selected: dayState(merchant, session.state.when, p.leadDays) === 'available'
      ? session.state.when
      : earliestFor(merchant, p.leadDays),
    title: 'When is it for?',
    note: `${p.leadDays} days on the bench, and we take ${merchant.commission.perWeek} commissions a week.`,
    onSelect: (when) => {
      session.setWhen(when);
      paint();
    },
  });
});

/** The brief fields are destroyed by every re-render, so they are put back. */
function restoreNotes() {
  for (const [field, value] of Object.entries(brief)) {
    const el = $(`[data-brief="${field}"]`);
    if (el) el.value = value;
  }
  const count = $('[data-idea-count]');
  if (count) count.textContent = `${brief.idea.length} / ${IDEA_MAX}`;
}

/* -------------------------------------------------------------------------
   Booking it
   ------------------------------------------------------------------------- */
$('[data-book]').addEventListener('click', () => {
  const p = priced();
  if (p.belowMinimum) return;

  const { movedTo } = session.add({
    productId: product.id,
    selections: { ...selections },
    addons: [...techniques],
    // The brief is design intent, not an inscription. It travels on the
    // line's `meta`, which the commerce core carries without interpreting.
    meta: {
      brief: {
        occasion: brief.occasion.trim(),
        idea: brief.idea.trim(),
        avoid: brief.avoid.trim(),
      },
    },
    qty: 1,
  });

  const surprise = movedTo && shownWhen && dateKey(movedTo) !== dateKey(shownWhen);

  toast({
    title: 'Brief added',
    detail: surprise
      ? `Needs more bench time — set for ${whenPhraseMid(movedTo)}.`
      : `${money(p.deposit)} to book, ${money(p.balance)} on collection.`,
    icon: icons.check,
  });

  if (movedTo) paint();
});

/* -------------------------------------------------------------------------
   What happens after
   ------------------------------------------------------------------------- */
const c = merchant.commission;
$('[data-after]').innerHTML = [
  ['Deposit', `${Math.round(c.depositPct * 100)}% holds the slot in the diary. Nothing else is charged until you collect.`],
  ['A conversation', 'We call you within two working days. If the brief and the budget have drifted apart, we say so then, not on the day.'],
  ['The bench', 'One of us builds the whole piece. That is why the notice is long and why the price does not move.'],
  ['Collection', `${esc(c.note)}`],
]
  .map(
    ([t, b], i) => `
    <li class="c-3">
      <p class="label label--acid">${String(i + 1).padStart(2, '0')}</p>
      <p class="t-3" style="margin-top:var(--s-3)">${esc(t)}</p>
      <p class="sm dim" style="margin-top:var(--s-2)">${b}</p>
    </li>`
  )
  .join('');

session.on('when:change', paint);

renderChoices();
restoreNotes();
paint();
