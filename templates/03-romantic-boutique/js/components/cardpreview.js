/**
 * @file The card, drawn.
 *
 * This is the template's signature component. The research is in the concept
 * doc §2: three real shops sell cakes whose whole purpose is to carry a
 * message, and all three take the message as a text input with a character
 * counter and no preview. One of them takes it on a different page, after
 * payment, inside a one-hour window.
 *
 * Two rules hold this component honest.
 *
 * **The script is never the only carrier.** The drawn sheet is aria-hidden,
 * and the <figcaption> beside it states the message, the number of lines, the
 * hand it will be written in and any problem — in the interface face, at
 * interface size. A screen reader gets one clean reading rather than a script
 * face it cannot see and a caption that repeats it.
 *
 * **The preview never flatters.** It breaks where `card.js` says the pen will
 * break, it shows the overflow lines rather than hiding them, and when the
 * message does not fit it says so on the sheet itself. A preview that quietly
 * tidied up would be worse than the character counter it replaces, because it
 * would be believed.
 */

import { layoutCard, layoutInscription, normalise } from '../card.js';
import { icons } from './icons.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/**
 * The card as it should be *read out*, which is not the card as it is set.
 *
 * The first version read the laid-out lines joined with full stops, so a
 * screen reader announced "Thirty years, and you still laugh. at exactly the
 * same joke." — turning the pen's line breaks into sentence breaks and
 * mangling the one piece of writing on the page that belongs to the
 * customer. The visual lines are where the pen will break; they are not
 * punctuation.
 *
 * @param {{to?:string, message?:string, from?:string}} card
 */
function spoken(card) {
  const to = normalise(card?.to);
  const message = normalise(card?.message);
  const from = normalise(card?.from);
  return [to ? `Dear ${to},` : '', message.replace(/\n+/g, ' '), from ? `from ${from}` : '']
    .filter(Boolean)
    .join(' ');
}

/**
 * @param {object} opts
 * @param {{to?:string, message?:string, from?:string}|null} opts.card
 * @param {object} opts.merchant
 * @param {boolean} [opts.compact]  no caption; for a basket row or a receipt
 * @returns {string}
 */
export function cardPreview({ card, merchant, compact = false }) {
  const laid = layoutCard(card, merchant);

  if (laid.state !== 'set') {
    return `
      <figure class="letter letter--blank">
        <div class="letter__sheet" aria-hidden="true">
          <p class="letter__waiting">${
            laid.state === 'none' ? 'No card with this one' : 'Nothing written yet'
          }</p>
        </div>
        ${
          compact
            ? ''
            : `<figcaption class="letter__read sm dim">${
                laid.state === 'none'
                  ? 'This cake goes out without a card. That is a complete order.'
                  : 'Start typing and the card sets itself, in the hand it will be written in.'
              }</figcaption>`
        }
      </figure>`;
  }

  // What the card holds goes on the card; what it does not goes *below* it,
  // marked. The first version drew every line on the sheet and let the
  // excess spill over the edge of the paper, which looked like a rendering
  // fault rather than a statement about the card — and the one thing this
  // component cannot afford is to look broken when it is telling the truth.
  const held = laid.hand.lines;
  const asLine = (line, over) =>
    `<p class="letter__line hand${over ? ' letter__line--over' : ''}${
      line === laid.signature ? ' letter__line--sign' : ''
    }">${line ? esc(line) : '&nbsp;'}</p>`;

  const sheet = laid.lines.slice(0, held).map((l) => asLine(l, false)).join('');
  const spill = laid.lines.slice(held);

  const caption = compact
    ? ''
    : `<figcaption class="letter__read">
         <p class="sr">The card reads: ${esc(spoken(card))}</p>
         <p class="sm dim">
           ${laid.lines.filter(Boolean).length} of ${held} lines · ${esc(laid.hand.label)}
         </p>
         ${laid.problems
           .map(
             (p) =>
               `<p class="note note--bad sm">${icons.alert}<span><strong>${esc(p.text)}</strong>${
                 p.detail ? ` ${esc(p.detail)}` : ''
               }</span></p>`
           )
           .join('')}
         ${laid.notes
           .map((n) => `<p class="note sm">${icons.info}<span>${esc(n.text)}</span></p>`)
           .join('')}
       </figcaption>`;

  return `
    <figure class="letter" data-fits="${laid.fits}">
      <div class="letter__stack" aria-hidden="true">
        <div class="letter__sheet" style="--per:${laid.hand.perLine}">
          ${sheet}
          <span class="letter__mark">${esc(merchant.shortName ?? merchant.name)}</span>
        </div>
        ${
          spill.length
            ? `<div class="letter__spill" style="--per:${laid.hand.perLine}">
                 <p class="letter__spill-head">Past the bottom of the card</p>
                 ${spill.map((l) => asLine(l, true)).join('')}
               </div>`
            : ''
        }
      </div>
      ${caption}
    </figure>`;
}

/**
 * The piped inscription, on the cake.
 *
 * A separate object from the card and deliberately a separate component: a
 * plaque holds two short lines in buttercream, a card holds six in ink, and
 * showing them with one renderer would have meant pretending they have the
 * same constraints. They are shown side by side on the card page because the
 * recipient sees both at once — that is the composition being made.
 *
 * @param {{text:string, product:object}} opts
 */
export function plaquePreview({ text, product }) {
  const laid = layoutInscription(text, product);

  if (!laid.lines.length) {
    return `
      <figure class="plaque plaque--blank">
        <p class="plaque__waiting sm dim" aria-hidden="true">Nothing piped on the cake</p>
        <figcaption class="sr">Nothing will be piped on the cake.</figcaption>
      </figure>`;
  }

  return `
    <figure class="plaque" data-fits="${laid.fits}">
      <div aria-hidden="true">
        ${laid.lines.map((l) => `<p class="plaque__line hand">${esc(l)}</p>`).join('')}
      </div>
      <figcaption class="plaque__read xs dim">
        <span class="sr">Piped on the cake: ${esc(laid.lines.join(' '))}. </span>
        ${esc(laid.plaque.note ?? 'Piped by hand')}${
          laid.fits ? '' : ` — too long for this cake, which takes ${laid.plaque.lines} short lines.`
        }
      </figcaption>
    </figure>`;
}
