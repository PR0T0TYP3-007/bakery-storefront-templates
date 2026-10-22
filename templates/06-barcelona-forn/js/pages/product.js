/**
 * @file One thing, and where it sits in the year.
 *
 * The question this page has to answer is not "is it in stock" — it is
 * "when can I have it". For a calendar item those are different questions
 * and only the second one is useful: a tortell in March is not sold out,
 * it is March, and it comes back on the sixth of January. `seasonLine()`
 * says that, and it is the reason the template exists.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import { entryFor, seasonLine, dayMonth, isoDate, picture, esc } from '../components/calendar.js';
import { nextFor, daysBetween, addDays, startOfDay } from '../year.js';
import { toast } from '../components/toast.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader('shop');
renderFooter();

const { merchant, catalogue } = session.state;
const today = new Date();

const money = (n) =>
  new Intl.NumberFormat(merchant.locale, {
    style: 'currency',
    currency: merchant.currency,
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);

const id = new URLSearchParams(location.search).get('id');
const product = catalogue.products.find((p) => p.id === id) ?? null;

if (product) {
  render(product);
} else {
  /* A bad id is somebody's old bookmark, or a thing the forn stopped making.
     Both deserve the shop rather than a dead end. */
  document.title = `Not found — ${merchant.name}`;
  $('[data-crumb]').textContent = 'Not found';
  $('[data-thing]').innerHTML = `
    <h1 class="t-1" style="margin-top:var(--s-5)">We don't have anything by that name.</h1>
    <p class="lede" style="margin-top:var(--s-3)">
      It may have changed its name, or we may not make it any more.
    </p>
    <p style="margin-top:var(--s-5)"><a class="btn" href="shop.html">See the shop</a></p>`;
}

/* -------------------------------------------------------------------------
   Render
   ------------------------------------------------------------------------- */
function render(p) {
  document.title = `${p.name} — ${merchant.name}`;
  $('[data-crumb]').textContent = p.name;

  const entry = entryFor(merchant, p.id);
  const season = entry ? seasonLine(entry, { merchant, today }) : null;
  const groups = session.groups();
  const options = (p.options ?? []).map((key) => groups[key]).filter(Boolean);
  const addons = (p.addons ?? [])
    .map((key) => catalogue.addons.find((a) => a.id === key))
    .filter(Boolean);

  $('[data-thing]').innerHTML = `
    <div class="thing__grid">
      <div class="thing__say">
        <figure class="thing__shot">${picture(p, { eager: true, size: 'lg' })}</figure>

        ${stateLine(entry, season)}

        <h1 class="t-1" style="margin-top:var(--s-3)" lang="ca">${esc(p.name)}</h1>
        ${p.subtitle ? `<p class="lede" style="margin-top:var(--s-3)">${esc(p.subtitle)}</p>` : ''}

        ${seasonBlock(season)}

        ${
          p.description
            ? `<div class="prose" style="margin-top:var(--s-5)"><p>${esc(p.description)}</p></div>`
            : ''
        }

        ${allergenBlock(p)}
      </div>

      <form class="thing__buy panel panel--marble" data-buy>
        <p class="money thing__price" data-price>${esc(money(p.price))}</p>
        <p class="sm dim" data-lead></p>

        ${options.map((group) => optionGroup(group, p)).join('')}
        ${addons.length ? addonBlock(addons) : ''}

        <div class="qty">
          <label class="label" for="qty">How many</label>
          <input class="qty__in num" id="qty" name="qty" type="number"
                 inputmode="numeric" min="1" max="20" step="1" value="1">
        </div>

        ${buyButton(entry)}
      </form>
    </div>`;

  wire(p, options, entry);
}

/**
 * Whether orders are open for this yet.
 *
 * The bakery takes orders `maxDaysAhead` out — thirty days here. In October
 * a tortell de Reis is seventy-six days away, so it cannot be ordered and an
 * "add to basket" button would be a lie that only comes apart at checkout.
 * It is not sold out either. It is just too early, and the honest thing is
 * to say when it stops being too early.
 */
function ordering(entry) {
  if (!entry) return { open: true };

  const next = nextFor(entry, today);
  if (!next) return { open: true };
  if (next.status === 'on') return { open: true };

  const horizon = merchant.maxDaysAhead ?? 60;
  const opens = addDays(next.from, -horizon);
  const wait = daysBetween(startOfDay(today), opens);

  return wait > 0 ? { open: false, from: next.from, opens } : { open: true, from: next.from };
}

function buyButton(entry) {
  const order = ordering(entry);
  if (order.open) {
    return '<button class="btn btn--block" type="submit">Add to basket</button>';
  }
  return `
    <div class="tooearly">
      <p class="label">Not yet</p>
      <p class="sm" style="margin-top:var(--s-2)">
        We take orders for this from
        <time datetime="${esc(isoDate(order.opens))}">${esc(dayMonth(order.opens, merchant.locale))}</time>.
      </p>
    </div>`;
}

function stateLine(entry, season) {
  if (!season) return '';
  const words =
    season.state === 'on'
      ? 'On the counter now'
      : `<span lang="ca">${esc(entry.day)}</span>`;
  return `
    <p class="state state--${season.state}">
      <span class="state__dot" aria-hidden="true"></span>${words}
    </p>`;
}

/**
 * The sentence the whole template is for.
 *
 * It says the date, not "esgotat", because nothing sold out — it is simply
 * the wrong month. A `<time>` carries the machine-readable date so this is
 * a fact on the page rather than a phrase.
 */
function seasonBlock(season) {
  if (!season) return '';
  const inner = season.iso
    ? `<time datetime="${esc(season.iso)}">${esc(season.text)}</time>`
    : esc(season.text);
  return `<p class="season season--${season.state}">${inner}</p>`;
}

/**
 * The allergens.
 *
 * The merchant's own words, followed by the merchant's own statement — which
 * says the obrador shares everything, because it does. A tidy list without
 * that sentence would be the dishonest half of the truth.
 */
function allergenBlock(p) {
  if (!p.allergens?.length) return '';
  return `
    <div class="alrg">
      <p class="label dim">Contains</p>
      <ul class="alrg__list">
        ${p.allergens.map((a) => `<li>${esc(a)}</li>`).join('')}
      </ul>
      <p class="sm dim" style="margin-top:var(--s-3)">${esc(merchant.allergenStatement)}</p>
    </div>`;
}

/**
 * A size, with what that size actually costs.
 *
 * An option's `price` in the catalogue is a delta on the product's own
 * price, so printing it straight gives a row reading "4 a 6 — 0 €" and two
 * more that look like the whole thing is eight euros. What a customer wants
 * from this list is the price of each size, so that is what it shows.
 */
function optionGroup(group, p) {
  return `
    <fieldset class="opt">
      <legend class="label">${esc(group.label)}</legend>
      ${group.options
        .map(
          (o) => `
            <label class="opt__row">
              <input type="radio" name="${esc(group.id)}" value="${esc(o.id)}">
              <span class="opt__label">${esc(o.label)}${
                o.serves ? '<span class="opt__note sm dim"> people</span>' : ''
              }</span>
              <span class="opt__price money">${esc(money(p.price + (o.price ?? 0)))}</span>
            </label>`
        )
        .join('')}
    </fieldset>`;
}

function addonBlock(addons) {
  return `
    <fieldset class="opt">
      <legend class="label">If you'd like</legend>
      ${addons
        .map(
          (a) => `
            <label class="opt__row">
              <input type="checkbox" name="addon" value="${esc(a.id)}">
              <span class="opt__label">${esc(a.label)}${
                a.note ? `<span class="opt__note sm dim"> ${esc(a.note)}</span>` : ''
              }</span>
              <span class="opt__price money">${esc(money(a.price))}</span>
            </label>`
        )
        .join('')}
    </fieldset>`;
}

/* -------------------------------------------------------------------------
   Behaviour
   ------------------------------------------------------------------------- */
function wire(p, options, entry) {
  const form = $('[data-buy]');

  /* Defaults come from the product, not from "the first one". A tortell
     defaults to the size most people actually buy, which is the middle. */
  for (const group of options) {
    const want = p.defaults?.[group.id] ?? group.options[0].id;
    const input = form.querySelector(`input[name="${group.id}"][value="${want}"]`);
    if (input) input.checked = true;
  }

  const read = () => {
    const selections = {};
    for (const group of options) {
      const picked = form.querySelector(`input[name="${group.id}"]:checked`);
      if (picked) selections[group.id] = picked.value;
    }
    const addons = [...form.querySelectorAll('input[name="addon"]:checked')].map((i) => i.value);
    const qty = Math.max(1, Math.min(20, Number(form.qty.value) || 1));
    return { selections, addons, qty };
  };

  function repaint() {
    const { selections, addons, qty } = read();
    /* priceOf returns a LinePrice — unit, addons, total and a breakdown —
       not a number. Handing the object to Intl renders "NaN €". */
    form.querySelector('[data-price]').textContent = money(
      session.priceOf(p, selections, addons, qty).total
    );

    const lead = session.leadFor(p, selections);
    form.querySelector('[data-lead]').textContent =
      lead === 0
        ? 'Made every morning; no notice needed.'
        : lead === 1
          ? "We need a day's notice."
          : `We need ${lead} days' notice.`;
  }

  form.addEventListener('change', repaint);
  form.addEventListener('input', repaint);
  repaint();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { selections, addons, qty } = read();

    /* The shared fall-forward only knows about lead days and capacity — it
       has never heard of the calendar, so a tortell added in October was
       being put down for collection three days later. When the thing is out
       of season but inside the booking window, the collection day moves to
       the day the forn starts making them and `add` takes it from there. */
    const order = ordering(entry);
    if (order.from) session.setWhen(order.from);

    const { movedTo } = session.add({ productId: p.id, selections, addons, qty });

    /* `add` moves the collection day forward when the chosen one cannot take
       the order. Saying so here is the only reason it returns that. */
    toast({
      title: `${p.name}, in the basket.`,
      detail: movedTo
        ? `We couldn't make it in time, so it's down for ${new Intl.DateTimeFormat(
            merchant.locale,
            { day: 'numeric', month: 'long' }
          ).format(movedTo)}.`
        : null,
    });
  });
}
