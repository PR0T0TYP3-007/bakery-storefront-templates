/**
 * @file The style guide.
 *
 * Everything with a number in it is read out of the live CSS or the live
 * catalogue. A ratio typed into a style guide is a claim about the
 * stylesheet; a ratio computed in the page is a reading of it, and it goes
 * red on its own when somebody moves a token.
 *
 * And it is bilingual, like every other page here — including the prose
 * explaining why it is bilingual.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter, esc } from '../components/chrome.js';
import { plate, names, money } from '../components/plates.js';
import { toast } from '../components/toast.js';
import { lang, onLang, t, bcp47 } from '../services/locale.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader();
renderFooter();

const { merchant, catalogue } = session.state;
const css = getComputedStyle(document.documentElement);
const token = (name) => css.getPropertyValue(name).trim();

/* -------------------------------------------------------------------------
   Contrast, the WCAG 2.x way

   Hex only. Every colour in tokens.css is a literal hex, and refusing
   anything else beats quietly mis-reading an `oklab()` — which is exactly
   how this project's contrast sweep invented failures twice.
   ------------------------------------------------------------------------- */
function rgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

const relLum = (c) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};

function ratio(a, b) {
  const l1 = relLum(rgb(a));
  const l2 = relLum(rgb(b));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* -------------------------------------------------------------------------
   Copy
   ------------------------------------------------------------------------- */
const C = {
  skip: { fr: 'Aller au guide', en: 'Skip to the guide' },
  head: { fr: 'Le guide', en: 'Style guide' },
  lede: {
    fr: 'Chaque surface, chaque paire de couleurs et chaque morceau, avec les chiffres lus dans le CSS vivant plutôt que tapés en dessous.',
    en: 'Every surface, every colour pairing and every component, with the numbers read out of the live CSS rather than typed in underneath it.',
  },

  hSep: { fr: '1 · La séparation', en: '1 · The separation method' },
  pSep: {
    fr: [
      "La vaisselle émaillée — les assiettes et les bassines en tôle qu'il y a dans toutes les cuisines du Nord — a un rebord dur, plus foncé, et pas d'ombre pantoute. Ça ne flotte pas. Ça pose, et quand il y en a plusieurs, ça pose les unes SUR les autres.",
      "Donc le contenu est sur des plaques plates avec un rebord de 2 px, et un groupe de plaques se chevauche d'exactement ce rebord-là au lieu d'être espacé. Ce qui sépare, c'est le rebord et laquelle est par-dessus.",
    ],
    en: [
      'Enamelware — the steel plates and basins in every northern kitchen — has a hard rolled rim in a darker tone and no shadow at all. It does not float. It sits, and when there are several they sit ON one another.',
      'So content sits on flat plates with a 2px rim, and a group of plates OVERLAPS by exactly that rim rather than being spaced apart. What separates them is the rim and which one is on top.',
    ],
  },
  sepSet: {
    fr: 'Chaque gabarit a la sienne : filets et cartes (01), contour dessiné et ombre décalée (02), ouvertures masquées (03), chevauchement et grille visible (04), rangées réglées sur papier épinglé (05), modules carrelés (06), et celle-ci. La seule à surveiller est 04, qui chevauche aussi — mais 04 chevauche le CONTENU en travers d’une grille ; ici ce sont les BORDS seulement, et rien ne traverse jamais la plaque d’à côté.',
    en: 'Each template has its own: hairline rules and cards (01), drawn outlines and offset shadow (02), masked apertures (03), overlap and visible grid (04), ruled rows on pinned paper (05), tiled modules (06), and this. The one to watch is 04, which also overlaps — but 04 overlaps CONTENT across a visible grid; this overlaps EDGES only, and nothing ever crosses another plate’s field.',
  },

  hNames: { fr: '2 · Les deux noms', en: '2 · The two names' },
  pNames: {
    fr: [
      "Un titre de produit porte les DEUX noms, de la même grandeur, avec un filet entre les deux. Ni l'un ni l'autre n'est un sous-titre. Cette décision typographique, c'est le concept au complet.",
      "Le français prend les capitales, l'anglais la casse normale, pour qu'on les distingue avant de les lire. L’attribut lang est posé sur chaque nom, pas une fois sur le parent : un lecteur d'écran ne doit pas dire « tarte au sucre » avec une voix anglaise, et c'est le seul gabarit de la série où ça arrive sur chaque titre.",
      "Quand les deux langues utilisent le même mot — tourtière, butter tart — on l'écrit une fois. L'écrire deux fois avec un filet entre les deux, ce serait la page qui travaille contre son propre propos.",
    ],
    en: [
      'A product heading carries BOTH names, at the same size, with a rule between them. Neither is a subtitle. That typographic decision is the entire concept.',
      'French takes caps and English sentence case, so the two are distinguishable before they are read. The lang attribute is set on each NAME rather than once on the parent: a screen reader must not say “tarte au sucre” in an English voice, and this is the only template in the set where that happens on every heading.',
      'Where both languages use the same word — tourtière, butter tart — it is written once. Writing it twice with a rule between would be the page working against its own point.',
    ],
  },

  hCol: { fr: '3 · La couleur', en: '3 · Colour' },
  pCol: {
    fr: [
      "Un fond or de blé : le grain, le sirop d'érable à contre-jour, et la moutarde de la vaisselle émaillée. C'est le seul fond chaud que le contrôle de distance laissait libre — il passe de 2 points, coincé entre le soleil de 02 et la prune de 03.",
      "Le vert du drapeau franco-ontarien était la palette évidente et il échoue : 156 du cobalt de 06. Il est quand même là, dessiné, dans le pied de page.",
    ],
    en: [
      'A wheat gold ground: grain, maple syrup held to the light, and the mustard of enamel kitchenware. It is the one warm ground the distance check left free — it passes by two, boxed in by 02’s sun above and 03’s plum below.',
      'The Franco-Ontarian flag green was the obvious palette and it fails: 156 from 06’s cobalt. It is here anyway, drawn, in the footer.',
    ],
  },

  hMeas: { fr: 'Mesuré, pas affirmé', en: 'Measured, not asserted' },
  pMeas: {
    fr: ["Chaque encre sur chaque surface, calculé dans cette page à partir des valeurs vivantes. Changez un token et ce tableau change avec — y compris virer au rouge, ce qui est tout l'intérêt de le générer plutôt que de l'écrire."],
    en: ['Every ink against every surface, computed in this page from the live token values. Change a token and this table changes with it — including going red, which is the entire point of generating it rather than writing it.'],
  },
  gridCaption: {
    fr: 'Le rapport de contraste de chaque encre sur chaque surface',
    en: 'Contrast ratio of each ink on each surface',
  },
  hRules: {
    fr: 'Les deux règles qui ne se cassent pas',
    en: 'The two rules that cannot be broken',
  },

  hType: { fr: '4 · La typo', en: '4 · Type' },
  pType: {
    fr: [
      "Du bois de caisse pour ce qui est PEINT — les titres, l'enseigne, les prix — et une gothique ordinaire pour tout ce qui se lit. Du bois de caisse à longueur de paragraphe, c'est illisible et, pire ici, ça fait basculer le registre dans le western de pacotille que le concept interdit.",
      "Le concept demandait « bois de caisse ÉTROIT ». Aucune étroite n'était disponible : toutes les candidates étroites étaient des grotesques déguisées (et collent avec 05) ou des égyptiennes (et collent avec 06). Rye est vraiment du bois de caisse et vraiment sa propre classe. L'écart est écrit dans tokens.css plutôt que caché.",
    ],
    en: [
      'Wood type for what is PAINTED — headings, the sign, prices — and a plain gothic for everything that is read. Wood type at paragraph length is unreadable and, worse here, it tips the register into the Western novelty the concept bans.',
      'The concept asked for “antique wood-type CONDENSED”. No condensed wood-type face was available: every condensed candidate was a grotesque in disguise (colliding with 05) or a slab (colliding with 06). Rye is genuinely wood type and genuinely its own class. The deviation is written into tokens.css rather than hidden.',
    ],
  },

  hComp: { fr: '5 · Les morceaux', en: '5 · Components' },
  hBtn: { fr: 'Les boutons', en: 'Buttons' },
  bAdd: { fr: 'Mettre au panier', en: 'Add to basket' },
  bChange: { fr: 'Changer la journée', en: 'Change the day' },
  bOff: { fr: 'Pas cette journée-là', en: 'Not that day' },

  hLang: { fr: 'Le bouton de langue', en: 'The language switch' },
  pLang: {
    fr: ["Un mot, jamais un drapeau. Les drapeaux sont des pays, pas des langues, et les Franco-Ontariens ne sont pas Français — un tricolore ici serait faux sur le monde à qui ça s'adresse. C'est un vrai bouton avec un nom accessible dans les DEUX langues, parce que la personne qui en a le plus besoin est justement celle qui ne lit pas celle qui est affichée."],
    en: ['A word, never a flag. Flags are countries, not languages, and Franco-Ontarians are not French — a tricolore here would be wrong about the people it is for. It is a real button with an accessible name in BOTH languages, because the person who most needs it is the one who cannot read the language showing.'],
  },

  hPlates: { fr: 'Les plaques de produit', en: 'Product plates' },
  hForm: { fr: 'Les champs', en: 'Form fields' },
  lOk: { fr: 'Nom', en: 'Name' },
  lBad: { fr: 'Courriel', en: 'Email' },
  msgBad: { fr: 'Ce courriel-là a l’air croche.', en: 'That email does not look right.' },
  hSlots: { fr: 'Les heures de ramassage', en: 'Collection times' },
  hToast: { fr: 'Les avis', en: 'Toast' },
  bToast: { fr: 'En montrer un', en: 'Show one' },

  hCite: { fr: '6 · Citer ses sources', en: '6 · Citing sources' },
  pCite: {
    fr: ["Le glossaire est la seule page de toute la série qui cite quelque chose, parce que c'est la seule qui avance des faits vérifiables sur l'histoire. D13 : on n'affirme pas une chose vérifiable qu'on n'a pas vérifiée. Et quand la source hésite — « la plus vieille recette imprimée qu'on a trouvée » n'est pas « la première » — l'hésitation est reportée dans le texte au lieu d'être gommée."],
    en: ['The glossary is the only page in the whole set that cites anything, because it is the only one making checkable claims about history. D13: do not state a checkable thing you have not checked. And where the source hedges — “the earliest printed recipe anyone has found” is not “the first” — the hedge is carried into the copy rather than smoothed away.'],
  },
};

/* -------------------------------------------------------------------------
   Palette
   ------------------------------------------------------------------------- */
const PALETTE = [
  ['--wheat', { fr: 'Le fond', en: 'The ground' }],
  ['--wheat-2', { fr: 'Fond, bande', en: 'Ground, banded' }],
  ['--wheat-3', { fr: 'Fond, foncé', en: 'Ground, deep' }],
  ['--enamel', { fr: 'La plaque qui porte le texte', en: 'The plate that carries text' }],
  ['--enamel-2', { fr: 'Plaque, seconde', en: 'Plate, second' }],
  ['--rim', { fr: 'Le rebord — la séparation', en: 'The rim — the division' }],
  ['--ink', { fr: 'Texte', en: 'Text' }],
  ['--ink-2', { fr: 'Secondaire — plaque seulement', en: 'Secondary — plate only' }],
  ['--ink-3', { fr: 'Tertiaire — plaque seulement', en: 'Tertiary — plate only' }],
  ['--blueberry', { fr: 'L’accent : le bleuet', en: 'The accent: blueberry' }],
  ['--blueberry-deep', { fr: 'Accent, foncé', en: 'Accent, deep' }],
  ['--ok', { fr: 'Correct', en: 'Good' }],
  ['--warn', { fr: 'Attention', en: 'Warning' }],
  ['--bad', { fr: 'Erreur, refus', en: 'Errors, declines' }],
  ['--flag-green', { fr: 'Le drapeau — dessiné seulement', en: 'The flag — drawn only' }],
];

const SURFACES = [
  ['--wheat', 'Wheat'],
  ['--wheat-2', 'Wheat 2'],
  ['--wheat-3', 'Wheat 3'],
  ['--enamel', 'Enamel'],
  ['--enamel-2', 'Enamel 2'],
  ['--rim', 'Rim'],
  ['--blueberry', 'Blueberry'],
  ['--blueberry-deep', 'Blueberry deep'],
];

const INKS = [
  ['--ink', 'Ink'],
  ['--ink-2', 'Ink 2'],
  ['--ink-3', 'Ink 3'],
  ['--enamel', 'Enamel'],
  ['--ok', 'Good'],
  ['--warn', 'Warn'],
  ['--bad', 'Bad'],
  ['--flag-green', 'Flag green'],
];

const RULES = [
  {
    head: {
      fr: 'Sur l’or de blé, seul --ink porte du texte.',
      en: 'On the wheat ground, only --ink carries text.',
    },
    why: {
      fr: 'Tout ce qui est secondaire doit donc monter sur une plaque. La contrainte de contraste et la méthode de séparation tombent d’accord.',
      en: 'Everything secondary therefore has to sit on a plate. The contrast constraint and the separation method agree.',
    },
    pairs: [
      ['--ink', '--wheat'],
      ['--ink-2', '--wheat'],
      ['--ink-3', '--wheat'],
      ['--enamel', '--wheat'],
    ],
  },
  {
    head: {
      fr: 'Le vert du drapeau n’est jamais du texte, ni derrière du texte.',
      en: 'The flag green is never text and never behind text.',
    },
    why: {
      fr: 'Son meilleur score dans toute la palette est 3,03. C’est un drapeau. Il se dessine, point.',
      en: 'Its best reading anywhere in this palette is 3.03. It is a flag. It gets drawn, and that is all.',
    },
    pairs: [
      ['--flag-green', '--enamel'],
      ['--flag-green', '--wheat'],
      ['--enamel', '--flag-green'],
    ],
  },
];

/* -------------------------------------------------------------------------
   Draw
   ------------------------------------------------------------------------- */
function draw() {
  const which = lang();
  const L = bcp47(which);

  document.title = `${t(C.head, which)} — ${merchant.name}`;

  const set = (sel, v) => {
    const el = $(sel);
    if (el) el.textContent = v;
  };
  const prose = (sel, paras) => {
    const el = $(sel);
    if (el) {
      el.lang = L;
      el.innerHTML = paras.map((p) => `<p>${esc(p)}</p>`).join('');
    }
  };

  set('[data-skip]', t(C.skip, which));
  set('[data-head]', t(C.head, which));
  set('[data-lede]', t(C.lede, which));

  set('[data-h-sep]', t(C.hSep, which));
  prose('[data-p-sep]', t(C.pSep, which));
  set('[data-sep-set]', t(C.sepSet, which));

  set('[data-h-names]', t(C.hNames, which));
  prose('[data-p-names]', t(C.pNames, which));

  set('[data-h-col]', t(C.hCol, which));
  prose('[data-p-col]', t(C.pCol, which));

  set('[data-h-meas]', t(C.hMeas, which));
  prose('[data-p-meas]', t(C.pMeas, which));
  set('[data-grid-caption]', t(C.gridCaption, which));
  set('[data-h-rules]', t(C.hRules, which));

  set('[data-h-type]', t(C.hType, which));
  prose('[data-p-type]', t(C.pType, which));

  set('[data-h-comp]', t(C.hComp, which));
  set('[data-h-btn]', t(C.hBtn, which));
  set('[data-b-add]', t(C.bAdd, which));
  set('[data-b-change]', t(C.bChange, which));
  set('[data-b-off]', t(C.bOff, which));
  set('[data-h-lang]', t(C.hLang, which));
  prose('[data-p-lang]', t(C.pLang, which));
  set('[data-h-plates]', t(C.hPlates, which));
  set('[data-h-form]', t(C.hForm, which));
  set('[data-l-ok]', t(C.lOk, which));
  set('[data-l-bad]', t(C.lBad, which));
  set('[data-msg-bad]', t(C.msgBad, which));
  set('[data-h-slots]', t(C.hSlots, which));
  set('[data-h-toast]', t(C.hToast, which));
  set('[data-toast]', t(C.bToast, which));

  set('[data-h-cite]', t(C.hCite, which));
  prose('[data-p-cite]', t(C.pCite, which));

  drawPlatesDemo();
  drawNamesDemo(which);
  drawSwatches(which);
  drawGrid();
  drawRules(which);
  drawScale(which);
  drawProducts();
  drawSlots(which);
}

function drawPlatesDemo() {
  $('[data-demo-plates]').innerHTML = `
    <div class="stack-plates">
      ${['', '--2', '--2', '']
        .map(
          (v, i) => `
            <div class="plate plate${v} demo__cell">
              <p class="label dim">${i + 1}</p>
              <p class="sm" style="margin-top:var(--s-2)">.plate${v}</p>
            </div>`
        )
        .join('')}
    </div>`;
}

function drawNamesDemo(which) {
  /* Real products: one that renames across the line, one that does not. */
  const renames = catalogue.products.find((p) => p.fr.name !== p.en.name);
  const keeps = catalogue.products.find((p) => p.fr.name === p.en.name);

  $('[data-demo-names]').innerHTML = `
    <div class="stack-plates">
      ${[renames, keeps]
        .filter(Boolean)
        .map(
          (p) => `
            <div class="plate demo__cell">
              ${names(p, { tag: 'p', cls: 't-2' })}
              <p class="sm dim" style="margin-top:var(--s-3)" lang="${esc(bcp47(which))}">${esc(
                p.fr.name === p.en.name
                  ? which === 'fr'
                    ? 'Même mot des deux bords — écrit une fois.'
                    : 'Same word on both sides — written once.'
                  : which === 'fr'
                    ? 'Deux noms, même grandeur, filet entre les deux.'
                    : 'Two names, same size, a rule between them.'
              )}</p>
            </div>`
        )
        .join('')}
    </div>`;
}

function drawSwatches(which) {
  $('[data-swatches]').innerHTML = PALETTE.map(
    ([name, role]) => `
      <figure class="sw plate">
        <div class="sw__chip" style="background:var(${name})"></div>
        <figcaption>
          <p class="sm"><strong>${esc(t(role, which))}</strong></p>
          <code class="sm">${esc(name)}</code>
          <code class="sm dim">${esc(token(name))}</code>
        </figcaption>
      </figure>`
  ).join('');
}

function drawGrid() {
  $('[data-contrast]').innerHTML = `
    <thead>
      <tr>
        <th scope="col">·</th>
        ${SURFACES.map(([, label]) => `<th scope="col">${esc(label)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${INKS.map(
        ([ink, inkLabel]) => `
          <tr>
            <th scope="row">${esc(inkLabel)}</th>
            ${SURFACES.map(([surface]) => {
              const r = ratio(token(ink), token(surface));
              const grade = r >= 4.5 ? 'pass' : r >= 3 ? 'large' : 'fail';
              return `<td class="cell cell--${grade}">
                        <span class="num">${r.toFixed(2)}</span>
                        <span class="cell__g" aria-hidden="true">${
                          grade === 'pass' ? 'AA' : grade === 'large' ? 'lg' : 'no'
                        }</span>
                      </td>`;
            }).join('')}
          </tr>`
      ).join('')}
    </tbody>`;
}

function drawRules(which) {
  $('[data-rules]').innerHTML = RULES.map(
    (rule) => `
      <section class="rule plate">
        <h4 class="t-3 sign">${esc(t(rule.head, which)).replace(
          /--[a-z-]+/g,
          (m) => `<code class="nb">${m}</code>`
        )}</h4>
        <p class="sm" style="margin-top:var(--s-2)">${esc(t(rule.why, which))}</p>
        <ul class="rule__list">
          ${rule.pairs
            .map(([ink, surface]) => {
              const r = ratio(token(ink), token(surface));
              const ok = r >= 4.5;
              return `<li class="rule__row">
                        <span class="rule__swatch" data-contrast-demo
                              style="background:var(${surface});color:var(${ink})">Aa</span>
                        <span><code>${esc(ink)}</code> / <code>${esc(surface)}</code></span>
                        <span class="rule__n num${ok ? '' : ' is-bad'}">${r.toFixed(2)}</span>
                      </li>`;
            })
            .join('')}
        </ul>
      </section>`
  ).join('');
}

function drawScale(which) {
  const SCALE = [
    ['t-hero sign', 'Deux noms', '--t-hero'],
    ['t-1 sign', 'La boutique', '--t-1'],
    ['t-2 sign', 'Tarte au sucre', '--t-2'],
    ['t-3 sign', 'Butter tart', '--t-3'],
    [
      'lede',
      which === 'fr'
        ? 'Ce ne sont pas des traductions — ce sont des cousines.'
        : 'They are not translations — they are cousins.',
      '—',
    ],
    [
      '',
      which === 'fr'
        ? 'Le texte courant. Libre Franklin, la seule fonte ici qui se lit au lieu de se peindre.'
        : 'Body copy. Libre Franklin, the one face here that is read rather than painted.',
      '--t-body',
    ],
    ['sm', which === 'fr' ? 'Les petits caractères.' : 'Small print.', '--t-sm'],
    ['label', which === 'fr' ? 'Un mot peint' : 'A painted word', '--t-label'],
    ['money', money(18, merchant, which), '—'],
  ];

  $('[data-scale]').innerHTML = SCALE.map(
    ([cls, sample, name]) => `
      <div class="step plate">
        <p class="step__name sm dim"><code>${esc(
          cls ? `.${cls.split(' ')[0]}` : 'body'
        )}</code> ${esc(name)}</p>
        <p class="${esc(cls)}">${esc(sample)}</p>
      </div>`
  ).join('');
}

function drawProducts() {
  const picks = catalogue.products.slice(0, 3);
  $('[data-demo-products]').innerHTML = `<div class="stack-plates">${picks
    .map((p) => plate(p, { merchant }))
    .join('')}</div>`;
}

function drawSlots(which) {
  const rows = [
    ['07:00–09:00', which === 'fr' ? '7 places' : '7 left', true, false],
    ['09:00–11:00', which === 'fr' ? '2 places' : '2 left', false, false],
    ['11:00–13:00', which === 'fr' ? 'Plein' : 'Full', false, true],
  ];

  $('[data-demo-slots]').innerHTML = rows
    .map(
      ([time, left, checked, full]) => `
        <label class="slot plate">
          <input type="radio" name="g-slot" ${checked ? 'checked' : ''} ${
            full ? 'disabled' : ''
          }>
          <span class="slot__time sign">${esc(time)}</span>
          <span class="slot__left sm">${esc(left)}</span>
        </label>`
    )
    .join('');
}

$('[data-toast]').addEventListener('click', () => {
  const which = lang();
  toast({
    title: which === 'fr' ? 'Tarte au sucre, au panier.' : 'Sugar pie, in the basket.',
    detail:
      which === 'fr'
        ? 'On n’y arrivait pas à temps, donc c’est pour le 28 octobre.'
        : 'We could not make it in time, so it is down for 28 October.',
  });
});

draw();
onLang(draw);
