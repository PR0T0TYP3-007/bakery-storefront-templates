/**
 * @file The spec sheet — the thing the commission page actually produces.
 *
 * Template 02 answers "what should it look like?" by drawing the cake.
 * This one answers a different question — "how ambitious is this, and what
 * does that cost?" — so its output is a document, not a picture: the brief
 * typeset as a studio job sheet, with the number set large and its working
 * underneath it.
 *
 * That is the template's expressive typography doing real work rather than
 * decorating. It is also the deliverable: the sheet prints, and the print
 * stylesheet flips the whole template to paper so it can be taken to a
 * meeting.
 *
 * Nothing in here invents a figure. Every line comes from priceCommission(),
 * and the lines sum to the quoted total — there is a test for that, because
 * a quote a customer cannot check by adding up is just a different kind of
 * guess.
 */

import { esc } from '../pages/_page.js';
import { icons } from './icons.js';
import { money, moneyExact, dateLong } from '../../../../shared/core/format.js';

/**
 * A stable reference for a brief, so the same brief always carries the same
 * number and a customer can quote it back. Not random: re-opening the page
 * with the same choices must produce the same sheet.
 */
export function reference(selections, techniqueIds) {
  const seed = [selections?.scale, selections?.ambition, selections?.palette, ...[...techniqueIds].sort()].join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `FB-${String(h % 10000).padStart(4, '0')}`;
}

/**
 * @param {object} opts
 * @param {object} opts.merchant
 * @param {object} opts.priced        result of priceCommission()
 * @param {object} opts.selections
 * @param {string[]} opts.techniqueIds
 * @param {object} opts.groups        catalogue.optionGroups
 * @param {Date} opts.earliest        soonest day the studio can take it
 * @param {string} [opts.notes]
 * @returns {string} markup
 */
export function specSheet({ merchant, priced, selections, techniqueIds, groups, earliest, notes = '' }) {
  const cfg = merchant.commission ?? {};
  const opt = (g, id) => groups?.[g]?.options.find((o) => o.id === id);

  const scale = opt('scale', selections.scale);
  const ambition = opt('ambition', selections.ambition);
  const palette = opt('palette', selections.palette);

  const valid = new Date();
  valid.setDate(valid.getDate() + (cfg.quoteValidDays ?? 14));

  const brief = [
    ['Scale', scale ? `${scale.label} people` : '—', scale?.note],
    ['Taken to', ambition?.label ?? '—', ambition?.note],
    ['Colour', palette?.label ?? '—', palette?.note],
    [
      'Techniques',
      priced.techniques.length ? priced.techniques.map((t) => t.label).join(', ') : 'None — the form does the work',
      priced.techniques.length ? `${priced.techniques.length} of ${ambition?.allows ?? 0} allowed at this level` : undefined,
    ],
    ...(selections.setup ? [['On the day', 'We deliver it and set it up', merchant.delivery.note]] : []),
    ...(notes.trim() ? [['Your note', notes.trim(), undefined]] : []),
  ];

  return `
    <article class="sheet" data-sheet>
      <header class="sheet__head">
        <div>
          <p class="label">${esc(merchant.name)} — commission brief</p>
          <p class="sheet__ref num">${esc(reference(selections, techniqueIds))}</p>
        </div>
        <p class="label" style="text-align:right">
          Drawn up<br><span class="num">${esc(dateLong(new Date()))}</span>
        </p>
      </header>

      <dl class="sheet__brief">
        ${brief
          .map(
            ([k, v, note]) => `
          <div>
            <dt class="label">${esc(k)}</dt>
            <dd>${esc(v)}${note ? `<span class="sheet__note">${esc(note)}</span>` : ''}</dd>
          </div>`
          )
          .join('')}
      </dl>

      <hr class="rule">

      <table class="sheet__lines">
        <caption class="sr">How the price is made up</caption>
        <tbody>
          ${priced.lines
            .map(
              (l) => `
            <tr>
              <th scope="row">${esc(l.label)}${l.detail ? ` <span class="sheet__note sheet__note--inline">${esc(l.detail)}</span>` : ''}</th>
              <td class="num">${l.amount === 0 ? '—' : moneyExact(l.amount)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>

      <hr class="rule">

      <div class="sheet__total">
        <p class="label">This brief</p>
        <p class="sheet__amount num" data-amount>${money(priced.subtotal)}</p>
        <p class="sm dim">${esc(merchant.taxNote)}</p>
      </div>

      ${
        priced.belowMinimum
          ? `<p class="note note--warn">${icons.alert}<span>
               <strong>Commissions start at ${money(priced.minimum)}.</strong>
               This brief is ${money(priced.shortfall)} under. Take it further, make it bigger,
               or have a look at the editions instead — they start at €28.</span></p>`
          : ''
      }

      <dl class="sheet__terms">
        <div>
          <dt class="label">Earliest we can do it</dt>
          <dd class="num">${esc(dateLong(earliest))}</dd>
          <dd class="sheet__note">${priced.leadDays} days of bench time, and ${cfg.perWeek} commissions a week</dd>
        </div>
        <div>
          <dt class="label">To book it</dt>
          <dd class="num">${money(priced.deposit)}</dd>
          <dd class="sheet__note">${Math.round((cfg.depositPct ?? 0) * 100)}% deposit, ${money(priced.balance)} on collection</dd>
        </div>
        <div>
          <dt class="label">This price holds until</dt>
          <dd class="num">${esc(dateLong(valid))}</dd>
          <dd class="sheet__note">Firm, not a range. Nobody will email you a different number.</dd>
        </div>
      </dl>
    </article>`;
}
