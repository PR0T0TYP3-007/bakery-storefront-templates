/**
 * @file Home.
 *
 * The shopfront, not the shop. The board and the ticket moved to Our shop:
 * this page's job is to say what the place is and what it makes, and a
 * basket that follows you down a home page is a shop page wearing a
 * photograph. What is left is the claim, the morning, the cakes, and how it
 * works.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import { renderTile, bindAdd, imgSrc } from '../components/board.js';
import { mountMobileTicket } from '../components/ticket.js';
import { toast } from '../components/toast.js';
import { whenPhrase, dayWordMid, weekdayName } from '../../../../shared/core/format.js';
import { today } from '../../../../shared/core/dates.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader(null);
renderFooter();
mountMobileTicket();

// The homepage title describes the shop, so it has to come from the merchant.
// chrome.js only swaps the name in front of the dash, which left Corner Crumb
// advertising Hazel & Rye's bread. Trimmed at the first sentence, because a
// tagline may be two and a title should not be.
document.title = `${session.state.merchant.name} — ${session.state.merchant.tagline.split('.')[0]}`;

/* -------------------------------------------------------------------------
   Cakes — only if this merchant makes them
   ------------------------------------------------------------------------- */
function paintCakes() {
  const { merchant, catalogue } = session.state;
  const cakes = catalogue.products.filter((p) => p.kind === 'cake');

  if (!merchant.capabilities.customCakes || !cakes.length) {
    $('[data-cakes-section]').hidden = true;
    return;
  }
  $('[data-cakes-section]').hidden = false;
  $('[data-cakes]').innerHTML = cakes
    .map((p) => renderTile(p, { when: session.state.when }))
    .join('');
}

/* -------------------------------------------------------------------------
   Merchant voice + capability-driven copy
   The masthead is written in the HTML for the default merchant, so it is
   meaningful before JS runs, then replaced for any other one.
   ------------------------------------------------------------------------- */
function paintVoice() {
  const { voice } = session.state.merchant;
  if (!voice) return;
  const set = (sel, text) => {
    const el = $(sel);
    if (el && text) el.textContent = text;
  };
  set('[data-kicker]', voice.kicker);
  set('[data-headline]', voice.headline);
  set('[data-lede]', voice.lede);

  paintShopfront(voice.shopfront);
  paintMorning(voice.morning);
  paintOpenToday();
}

/**
 * Today's hours, under the lede.
 *
 * Read off `merchant.hours` rather than written into the markup — a shop
 * that is shut on Mondays should say so on a Monday, and a second merchant
 * keeping different hours should not need this sentence edited. The cutoff
 * is appended only where the merchant actually has one.
 */
function paintOpenToday() {
  const el = $('[data-open-today]');
  if (!el) return;

  const { merchant } = session.state;
  const name = weekdayName(today());
  const row = (merchant.hours ?? []).find((h) => h.day === name);

  if (!row || !row.open) {
    /* Closed today. The next day it opens is more use than the fact that it
       is shut, so say both. */
    const order = (merchant.hours ?? []).map((h) => h.day);
    const from = order.indexOf(name);
    const next =
      order.slice(from + 1).concat(order.slice(0, from + 1))
        .map((d) => (merchant.hours ?? []).find((h) => h.day === d))
        .find((h) => h && h.open);
    el.textContent = next
      ? `Closed today · open ${next.day} from ${next.open}`
      : 'Closed today';
    return;
  }

  const cutoff = merchant.cutoffHour;
  el.textContent =
    `Open today ${row.open}–${row.close}` +
    (cutoff ? ` · order by ${cutoff} for today` : '');
}

const escape = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/**
 * The photograph beside the headline.
 *
 * Hidden in the markup and shown only once a merchant has actually supplied
 * one. A shop with no photograph gets a band of flat wall colour and the
 * words on it, which is a composition rather than a gap — the scrim is
 * drawn over the media element, so with no media there is simply nothing to
 * scrim and the ground shows through.
 */
function paintShopfront(shot) {
  const el = $('[data-shopfront]');
  if (!el || !shot?.image) return;

  el.innerHTML = `
    <img src="${escape(imgSrc(shot.image, 1600))}"
         srcset="${escape(imgSrc(shot.image, 800))} 800w, ${escape(imgSrc(shot.image, 1600))} 1600w"
         sizes="(min-width: 60rem) 70vw, 100vw"
         alt="${escape(shot.alt)}"
         width="1600" height="1200" fetchpriority="high" decoding="async">
    ${shot.caption ? `<p class="masthead-band__cap">${escape(shot.caption)}</p>` : ''}`;
  el.hidden = false;
}

/**
 * The morning, in three photographs.
 *
 * An ordered list, because the whole point is that these happen in sequence
 * and before the shop opens — a reader who gets this page as a list of
 * headings should still get them in order and should still know it is an
 * order. The times are the list markers, so they are set as real content
 * rather than as generated counters.
 *
 * Not lazy. Measured on a 1320x1150 screen the strip starts at 731px, which
 * is inside the first screen, and `loading="lazy"` on an image that is
 * already in the viewport defers a request the page is waiting on rather
 * than saving one. The sheets would have shown as three empty panels of
 * `--surface-3` on anything slower than localhost — which is how this was
 * found: not here, but on the deployed site, where the same mistake in
 * Template 03's hero rendered the apertures as solid plum discs and made a
 * working page look broken.
 */
function paintMorning(steps) {
  const el = $('[data-morning]');
  if (!el) return;
  if (!Array.isArray(steps) || !steps.length) {
    el.closest('section')?.remove();
    return;
  }

  el.innerHTML = steps
    .map(
      (s) => `
      <li class="morning__step">
        <figure class="pinned">
          <img src="${escape(imgSrc(s.image, 800))}"
               srcset="${escape(imgSrc(s.image, 320))} 240w, ${escape(imgSrc(s.image, 800))} 800w"
               sizes="(min-width: 52rem) 30vw, 88vw"
               alt="${escape(s.alt)}"
               width="800" height="600" decoding="async">
          <figcaption class="pinned__cap">
            <span class="morning__at">${escape(s.at)}</span>
            <span>${escape(s.what)}</span>
          </figcaption>
        </figure>
      </li>`
    )
    .join('');

  /* The last time in the list is the moment the doors open, so the section's
     own note is read off the data rather than written twice. */
  const foot = $('[data-morning-foot]');
  if (foot) foot.textContent = `Open from ${steps[steps.length - 1].at}`;
}

function paintCapabilities() {
  const { merchant } = session.state;
  const copy = $('[data-delivery-copy]');
  if (!copy) return;
  copy.textContent = merchant.capabilities.delivery
    ? merchant.delivery.note
    : `Collection only, from ${merchant.locations.map((l) => l.name).join(' and ')}. We'd rather hand it to you over the counter.`;
  copy.previousElementSibling.textContent = merchant.capabilities.delivery
    ? '4 — Or we’ll bike it'
    : '4 — Collection only';
}

/* -------------------------------------------------------------------------
   Wiring
   ------------------------------------------------------------------------- */
bindAdd(document, (product, movedTo) => {
  toast({
    title: `${product.name} added`,
    detail: movedTo
      ? `Needs more notice — set for ${whenPhrase(movedTo)}.`
      : `Collect ${dayWordMid(session.state.when)}.`,
  });
});

session.on('when:change', paintCakes);

paintVoice();
paintCakes();
paintCapabilities();
