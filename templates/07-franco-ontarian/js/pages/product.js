/**
 * @file One thing, and its two names.
 *
 * The page the template exists for. Three things happen here that happen
 * nowhere else in the set:
 *
 *   1. The heading carries BOTH names at the same size, neither a subtitle.
 *   2. The kin note says how the two differ — or why one of them did not
 *      change — and only where the data actually carries one.
 *   3. The raisin question is a real choice with a real fact attached.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter, esc } from '../components/chrome.js';
import { names, kin, money, shot } from '../components/plates.js';
import { lang, onLang, t, bcp47 } from '../services/locale.js';
import { bothFaces } from '../lang.js';
import { toast } from '../components/toast.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader('shop');
renderFooter();

const { merchant, catalogue } = session.state;

const id = new URLSearchParams(location.search).get('id');
const product = catalogue.products.find((p) => p.id === id) ?? null;

const COPY = {
  skip: { fr: 'Aller au produit', en: 'Skip to the product' },
  shop: { fr: 'La boutique', en: 'The shop' },
  notFound: { fr: 'On n’a pas ça', en: 'Not found' },
  notFoundHead: {
    fr: 'On n’a rien de ce nom-là.',
    en: 'We have nothing by that name.',
  },
  notFoundBody: {
    fr: 'Ça a peut-être changé de nom, ou on ne le fait plus.',
    en: 'It may have changed its name, or we may not make it any more.',
  },
  seeShop: { fr: 'Voir la boutique', en: 'See the shop' },
  contains: { fr: 'Il y a dedans', en: 'Contains' },
  howMany: { fr: 'Combien', en: 'How many' },
  add: { fr: 'Mettre au panier', en: 'Add to basket' },
  ifYouLike: { fr: 'Si vous voulez', en: 'If you’d like' },
  noNotice: { fr: 'Fait chaque matin ; pas besoin d’avertir.', en: 'Made every morning; no notice needed.' },
  inBasket: { fr: 'au panier.', en: 'in the basket.' },
  moved: {
    fr: 'On n’y arrivait pas à temps, donc c’est pour le',
    en: 'We could not make it in time, so it is down for',
  },
};

/**
 * What the reader has chosen, held across a language switch.
 *
 * `draw()` rebuilds the whole page on every switch — it has to, because the
 * two languages are not translations and the content itself changes. The
 * first version therefore threw the form away: three currant tarts became
 * one plain one, silently, just for reading the page in the other language.
 *
 * The switch is meant to be used freely, so the choices survive it. Nothing
 * is persisted beyond the page: this is a variable, not storage.
 */
let chosen = null;

const ALLERGENS = {
  gluten: { fr: 'gluten', en: 'gluten' },
  egg: { fr: 'œuf', en: 'egg' },
  milk: { fr: 'lait', en: 'milk' },
  nuts: { fr: 'noix', en: 'nuts' },
  soy: { fr: 'soja', en: 'soy' },
};

/**
 * The raisin question.
 *
 * A real argument with a real date on it: the first written butter tart
 * recipe we know of — Barrie, Ontario, 1900 — called for CURRANTS, not
 * raisins, and people have been arguing ever since. It is one option group
 * and one sentence. The concept doc warns this should not tip into novelty,
 * so there is no festival, no trail and no quiz.
 */
const RAISIN_FACT = {
  fr: 'La première recette écrite qu’on connaisse — Barrie, en Ontario, 1900 — demandait des gadelles, pas des raisins. Le monde se chicane là-dessus depuis.',
  en: 'The first written recipe we know of — Barrie, Ontario, 1900 — called for currants, not raisins. People have been arguing about it ever since.',
};

function draw() {
  const which = lang();

  $('[data-skip]').textContent = t(COPY.skip, which);
  $('[data-crumb-shop]').textContent = t(COPY.shop, which);
  $('[data-crumbs]').setAttribute(
    'aria-label',
    which === 'fr' ? "Fil d'Ariane" : 'Breadcrumb'
  );

  if (!product) {
    document.title = `${t(COPY.notFound, which)} — ${merchant.name}`;
    $('[data-crumb]').textContent = t(COPY.notFound, which);
    $('[data-thing]').innerHTML = `
      <h1 class="t-1 sign" style="margin-top:var(--s-5)">${esc(t(COPY.notFoundHead, which))}</h1>
      <p class="lede" style="margin-top:var(--s-3)">${esc(t(COPY.notFoundBody, which))}</p>
      <p style="margin-top:var(--s-5)"><a class="btn" href="shop.html">${esc(
        t(COPY.seeShop, which)
      )}</a></p>`;
    return;
  }

  const [here] = bothFaces(product, which);
  document.title = `${here.name} — ${merchant.name}`;
  $('[data-crumb]').textContent = here.name;

  const groups = session.groups();
  const options = (product.options ?? []).map((k) => groups[k]).filter(Boolean);
  const addons = (product.addons ?? [])
    .map((k) => catalogue.addons.find((a) => a.id === k))
    .filter(Boolean);

  const faces = bothFaces(product, which);

  $('[data-thing]').innerHTML = `
    ${product.image ? `<div class="thing__shot">${shot(product, { eager: true, size: 'lg' })}</div>` : ''}

    ${names(product, { tag: 'h1', cls: 't-1' })}

    <!-- Both descriptions, at once, side by side.

         06 puts the words in a column with a price card sticky beside
         them, and so did this page. But the claim here is that the two
         languages are not translations — and the only way a reader can
         CHECK that is to see both at the same time. Reading the pair is
         the argument. -->
    <div class="faces">
      ${faces
        .map(
          (f, i) => `
            <section class="face${i ? ' face--other' : ''}" lang="${esc(bcp47(f.lang))}">
              <p class="label dim">${esc(f.lang === 'fr' ? 'En français' : 'In English')}</p>
              <p class="face__sub lede">${esc(f.subtitle)}</p>
              <p class="face__body">${esc(f.description)}</p>
            </section>`
        )
        .join('')}
    </div>

    ${kin(product)}

    ${allergens(which)}

    <!-- The order controls as a band across the foot of the page, not a
         card down the side. The side card is 06's shape. -->
    <form class="buy" data-buy>
      <div class="buy__head">
        <p class="money buy__price" data-price>${esc(money(product.price, merchant, which))}</p>
        <p class="sm dim" data-lead></p>
      </div>

      <div class="buy__choices">
        ${options.map((g) => optionGroup(g, which)).join('')}
        ${addons.length ? addonBlock(addons, which) : ''}
      </div>

      <div class="buy__do">
        <div class="qty">
          <label class="label" for="qty">${esc(t(COPY.howMany, which))}</label>
          <input class="qty__in num" id="qty" name="qty" type="number"
                 inputmode="numeric" min="1" max="20" step="1" value="1">
        </div>

        <button class="btn btn--block" type="submit">${esc(t(COPY.add, which))}</button>
      </div>
    </form>`;

  wire(options);
}

function allergens(which) {
  if (!product.allergens?.length) return '';
  return `
    <div class="alrg">
      <p class="label dim">${esc(t(COPY.contains, which))}</p>
      <ul class="alrg__list">
        ${product.allergens
          .map((a) => `<li>${esc(t(ALLERGENS[a] ?? { fr: a, en: a }, which))}</li>`)
          .join('')}
      </ul>
      <p class="sm dim" style="margin-top:var(--s-3)">${esc(
        t(merchant.allergenStatement, which)
      )}</p>
    </div>`;
}

function optionGroup(group, which) {
  /* The raisin question gets its sentence. Nothing else does — a fact under
     every option group would be a template that cannot stop talking. */
  const fact = group.id === 'raisins' ? t(RAISIN_FACT, which) : null;

  return `
    <fieldset class="opt">
      <legend class="label">${esc(t(group.label, which))}</legend>
      ${fact ? `<p class="opt__fact sm">${esc(fact)}</p>` : ''}
      ${group.options
        .map(
          (o) => `
            <label class="opt__row">
              <input type="radio" name="${esc(group.id)}" value="${esc(o.id)}">
              <span class="opt__label">${esc(t(o.label, which))}</span>
              <span class="opt__price money">${esc(
                money(product.price + (o.price ?? 0), merchant, which)
              )}</span>
            </label>`
        )
        .join('')}
    </fieldset>`;
}

function addonBlock(addons, which) {
  return `
    <fieldset class="opt">
      <legend class="label">${esc(t(COPY.ifYouLike, which))}</legend>
      ${addons
        .map(
          (a) => `
            <label class="opt__row">
              <input type="checkbox" name="addon" value="${esc(a.id)}">
              <span class="opt__label">${esc(t(a.label, which))}</span>
              <span class="opt__price money">${esc(money(a.price, merchant, which))}</span>
            </label>`
        )
        .join('')}
    </fieldset>`;
}

function wire(options) {
  const form = $('[data-buy]');
  const which = lang();

  /* What the reader picked beats what the product defaults to — otherwise a
     language switch resets the form. */
  for (const group of options) {
    const want =
      chosen?.selections?.[group.id] ??
      product.defaults?.[group.id] ??
      group.options[0].id;
    const input = form.querySelector(`input[name="${group.id}"][value="${want}"]`);
    if (input) input.checked = true;
  }

  for (const id of chosen?.addons ?? []) {
    const box = form.querySelector(`input[name="addon"][value="${id}"]`);
    if (box) box.checked = true;
  }

  if (chosen?.qty) form.qty.value = String(chosen.qty);

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
    chosen = { selections, addons, qty };

    /* priceOf returns a LinePrice, not a number. Template 06 shipped
       "NaN €" by handing the object straight to Intl. */
    form.querySelector('[data-price]').textContent = money(
      session.priceOf(product, selections, addons, qty).total,
      merchant,
      which
    );

    const lead = session.leadFor(product, selections);
    form.querySelector('[data-lead]').textContent =
      lead === 0
        ? t(COPY.noNotice, which)
        : which === 'fr'
          ? `Il faut nous avertir ${lead} jour${lead > 1 ? 's' : ''} d’avance.`
          : `We need ${lead} day${lead > 1 ? 's' : ''}' notice.`;
  }

  form.addEventListener('change', repaint);
  form.addEventListener('input', repaint);
  repaint();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { selections, addons, qty } = read();
    const { movedTo } = session.add({ productId: product.id, selections, addons, qty });
    const [face] = bothFaces(product, which);

    toast({
      title: `${face.name}, ${t(COPY.inBasket, which)}`,
      detail: movedTo
        ? `${t(COPY.moved, which)} ${new Intl.DateTimeFormat(bcp47(which), {
            day: 'numeric',
            month: 'long',
          }).format(movedTo)}.`
        : null,
    });
  });
}

draw();
onLang(draw);
