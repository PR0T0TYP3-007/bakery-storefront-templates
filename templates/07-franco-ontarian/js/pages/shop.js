/**
 * @file The shop.
 *
 * Filters live in the URL (`?c=tartes&q=sucre`), so a filtered shop is a
 * link somebody can send and the back button walks it.
 *
 * Search looks in BOTH languages regardless of which is showing. Somebody
 * reading the English page who types "tourtière" should find it, and
 * somebody reading French who types "blueberry" should too — the whole
 * premise is that the reader lives in both.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter, esc } from '../components/chrome.js';
import { stack } from '../components/plates.js';
import { lang, onLang, t } from '../services/locale.js';
import { LANGS } from '../lang.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader('shop');
renderFooter();

const { merchant, catalogue } = session.state;

const ALL = { id: '', label: { fr: 'Tout', en: 'Everything' }, note: { fr: null, en: null } };
const categories = [ALL, ...catalogue.categories];

const COPY = {
  head: { fr: 'La boutique', en: 'The shop' },
  lede: {
    fr: 'Tout ce qu’on fait. Chaque chose porte ses deux noms — quand elle en a deux.',
    en: 'Everything we make. Each thing carries both its names — when it has two.',
  },
  skip: { fr: 'Aller à la liste', en: 'Skip to the list' },
  findLabel: { fr: 'Chercher', en: 'Search' },
  findGo: { fr: 'Chercher', en: 'Search' },
  placeholder: { fr: 'tarte, pain, tourtière…', en: 'tart, bread, tourtière…' },
  filterNav: { fr: 'Filtrer par sorte', en: 'Filter by kind' },
  empty: { fr: 'Rien de ce nom-là.', en: 'Nothing by that name.' },
  emptyAll: { fr: 'Rien dans ce tiroir.', en: 'Nothing in this drawer.' },
  tryAll: { fr: 'toute la boulangerie', en: 'the whole bakery' },
};

/* -------------------------------------------------------------------------
   Filter state, which lives in the URL and nowhere else
   ------------------------------------------------------------------------- */
const read = () => {
  const p = new URLSearchParams(location.search);
  return { c: p.get('c') ?? '', q: p.get('q') ?? '' };
};

function write(next, { replace = false } = {}) {
  const p = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(next)) {
    if (v) p.set(k, v);
    else p.delete(k);
  }
  const url = `${location.pathname}${p.toString() ? `?${p}` : ''}`;
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  paint();
}

/* -------------------------------------------------------------------------
   Matching
   ------------------------------------------------------------------------- */
function match(products, { c, q }) {
  let items = c ? products.filter((p) => p.category === c) : products.slice();
  if (!q) return items;

  const needle = q.trim().toLowerCase();

  /* Both faces, every time. A bilingual reader does not search in one
     language at a time, and making them would be the one thing this
     template is least allowed to do. */
  return items.filter((p) =>
    LANGS.some((l) =>
      [p[l]?.name, p[l]?.subtitle, p[l]?.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle)
    )
  );
}

function countLine(n, { c, q }, which) {
  if (!n) return t(q ? COPY.empty : COPY.emptyAll, which);

  const cat = categories.find((x) => x.id === c);
  const where = c && cat ? String(t(cat.label, which)).toLowerCase() : null;

  if (which === 'fr') {
    const thing = n === 1 ? '1 chose' : `${n} choses`;
    if (q) return `${thing} pour « ${q} ».`;
    return where ? `${thing} dans ${where}.` : `${thing}, toute l’année.`;
  }

  const thing = n === 1 ? '1 thing' : `${n} things`;
  if (q) return `${thing} for “${q}”.`;
  return where ? `${thing} under ${where}.` : `${thing}, all year.`;
}

/* -------------------------------------------------------------------------
   Paint
   ------------------------------------------------------------------------- */
function paintFilters(which) {
  const { c } = read();
  $('[data-filters]').setAttribute('aria-label', t(COPY.filterNav, which));

  $('[data-filters]').innerHTML = categories
    .map((cat) => {
      const on = cat.id === c;
      const note = t(cat.note, which);
      return `
        <button class="plate filter${on ? ' plate--blueberry is-on' : ''}" type="button"
                data-c="${esc(cat.id)}" aria-pressed="${on}">
          <span class="filter__label sign">${esc(t(cat.label, which))}</span>
          ${note ? `<span class="filter__note sm">${esc(note)}</span>` : ''}
        </button>`;
    })
    .join('');
}

function paint() {
  const which = lang();
  const filter = read();

  $('[data-skip]').textContent = t(COPY.skip, which);
  $('[data-head]').textContent = t(COPY.head, which);
  $('[data-lede]').textContent = t(COPY.lede, which);
  $('[data-find-label]').textContent = t(COPY.findLabel, which);
  $('[data-find-go]').textContent = t(COPY.findGo, which);

  const input = $('[data-find] input');
  input.placeholder = t(COPY.placeholder, which);
  input.value = filter.q;

  paintFilters(which);

  const items = match(catalogue.products, filter);
  $('[data-count]').textContent = countLine(items.length, filter, which);

  if (!items.length) {
    $('[data-list]').innerHTML = `
      <p class="plate">
        ${esc(t(COPY.empty, which))}
        <button class="btn-as-link" type="button" data-clear>${esc(t(COPY.tryAll, which))}</button>
      </p>`;
    return;
  }

  $('[data-list]').innerHTML = stack(items, { merchant });
}

/* -------------------------------------------------------------------------
   Events
   ------------------------------------------------------------------------- */
$('[data-filters]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-c]');
  if (btn) write({ c: btn.dataset.c });
});

const form = $('[data-find]');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  write({ q: form.querySelector('input').value.trim() });
});

/* An empty box means no search; waiting for a submit leaves the list
   disagreeing with the field in front of it. */
form.querySelector('input').addEventListener('input', (e) => {
  if (!e.target.value.trim() && read().q) write({ q: '' }, { replace: true });
});

$('[data-list]').addEventListener('click', (e) => {
  if (e.target.closest('[data-clear]')) write({ c: '', q: '' });
});

window.addEventListener('popstate', paint);

paint();
onLang(paint);
