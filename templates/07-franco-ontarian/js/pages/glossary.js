/**
 * @file Les deux noms / Both names.
 *
 * The page where the template's premise is argued rather than asserted, and
 * the only page in the whole set that cites anything.
 *
 * It cites because it makes checkable claims about history, and D13 says do
 * not state a checkable thing you have not checked. Each claim here was
 * checked against the source named beside it, and where a source hedges —
 * "the earliest printed recipe anyone has found" is not "the first ever" —
 * the hedge is carried into the copy rather than smoothed away.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter, esc } from '../components/chrome.js';
import { lang, onLang, t, bcp47 } from '../services/locale.js';
import { other } from '../lang.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader('glossary');
renderFooter();

const { merchant } = session.state;

const glossary = await fetch(
  new URL(`../../data/glossary.${merchant.id}.json`, import.meta.url)
).then((r) => r.json());

const COPY = {
  skip: { fr: 'Aller aux mots', en: 'Skip to the terms' },
  head: { fr: 'Les deux noms', en: 'Both names' },
  lede: {
    fr: "Une tarte au sucre et une butter tart, ce n'est pas la même chose dite dans deux langues. Elles ont un ancêtre commun et elles ont pris des chemins différents. Voici ce qui est vrai, et d'où ça vient.",
    en: 'A tarte au sucre and a butter tart are not one thing said in two languages. They share an ancestor and they diverged. Here is what is true, and where it comes from.',
  },
  sources: { fr: "D'où ça vient", en: 'Where this comes from' },
  but: { fr: 'Mais', en: 'But' },
};

function termHTML(entry, which) {
  const first = which === 'fr' ? entry.fr : entry.en;
  const second = which === 'fr' ? entry.en : entry.fr;
  const firstLang = bcp47(which);
  const secondLang = bcp47(other(which));

  /* One word, not two, when both languages use the same one. Showing
     "Tourtière | Tourtière" with a rule between would be the page working
     against its own point. */
  const same = first === second;

  const source = entry.source ? glossary.sources[entry.source] : null;
  const also = entry.also ? glossary.sources[entry.also] : null;

  const secondName = same
    ? ''
    : `<span class="names__rule" aria-hidden="true"></span>
       <span class="names__${other(which)} names__other" lang="${esc(secondLang)}">${esc(
         second
       )}</span>`;

  const caveat = entry.caveat
    ? `<p class="term__caveat">
         <span class="label">${esc(t(COPY.but, which))}</span>
         ${esc(t(entry.caveat, which))}
       </p>`
    : '';

  const cite = source
    ? `<p class="term__source sm">
         <a href="${esc(source.url)}" rel="noopener noreferrer">${esc(source.where)}</a>${
           also
             ? `, <a href="${esc(also.url)}" rel="noopener noreferrer">${esc(also.where)}</a>`
             : ''
         }
       </p>`
    : '';

  return `
    <div class="term plate">
      <dt class="term__names names t-2">
        <span class="names__${which}" lang="${esc(firstLang)}">${esc(first)}</span>
        ${secondName}
      </dt>

      <dd class="term__body" lang="${esc(firstLang)}">
        <p>${esc(t(entry.note, which))}</p>
        ${caveat}
        ${cite}
      </dd>
    </div>`;
}

function draw() {
  const which = lang();

  document.title = `${t(COPY.head, which)} — ${merchant.name}`;
  $('[data-skip]').textContent = t(COPY.skip, which);
  $('[data-head]').textContent = t(COPY.head, which);
  $('[data-lede]').textContent = t(COPY.lede, which);
  $('[data-sources-label]').textContent = t(COPY.sources, which);

  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', t(COPY.lede, which));

  $('[data-terms]').innerHTML = glossary.entries
    .map((e) => termHTML(e, which))
    .join('');

  /* The sources again at the foot, in full, so they read as a list rather
     than having to be hunted for inline. */
  $('[data-sources]').innerHTML = Object.values(glossary.sources)
    .map(
      (s) => `
        <li>
          <a href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.title)}</a>
          — ${esc(s.where)}
        </li>`
    )
    .join('');
}

draw();
onLang(draw);
