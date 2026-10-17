/* ==========================================================================
   CRUMB ATELIER — home.js
   ========================================================================== */

(function () {
  boot('The Catalogue');

  /* Occasions ------------------------------------------------------------- */
  const occ = document.querySelector('[data-occasions]');
  if (occ) {
    occ.innerHTML = OCCASIONS.map(
      (o, i) => `
      <a class="occasion" href="collection.html?occasion=${o.id}">
        <span class="occasion__n">${String(i + 1).padStart(2, '0')}</span>
        <span class="occasion__label">${o.label}</span>
        <span class="occasion__note">${o.note}</span>
        <span class="occasion__arrow">${ICONS.arrow}</span>
      </a>`
    ).join('');
  }

  /* Featured catalogue ----------------------------------------------------- */
  const featured = document.querySelector('[data-featured]');

  function paintFeatured() {
    if (!featured) return;
    const readyBy = getReadyBy();
    const picks = PRODUCTS.slice(0, 4);
    featured.innerHTML = picks.map((p, i) => renderCard(p, { readyBy, delay: i * 70 })).join('');
    initReveal();
  }

  paintFeatured();

  // Changing the date re-evaluates what is actually orderable.
  document.addEventListener('readyby:change', paintFeatured);

  /* Press ------------------------------------------------------------------ */
  const press = document.querySelector('[data-press]');
  if (press) {
    press.innerHTML = PRESS.map(
      (p) => `<figure><blockquote>“${p.quote}”</blockquote><cite>${p.source}</cite></figure>`
    ).join('');
  }

  /* Journal ---------------------------------------------------------------- */
  const journal = document.querySelector('[data-journal]');
  if (journal) {
    journal.innerHTML = JOURNAL.map(
      (j) => `
      <a class="journal__item" href="#journal">
        <span class="meta">${j.date}</span>
        <span>
          <span class="d-3" style="display:block">${j.title}</span>
          <span class="small" style="display:block;margin-top:.35rem">${j.standfirst}</span>
        </span>
        <span class="meta">${ICONS.arrow}</span>
      </a>`
    ).join('');
  }
})();
