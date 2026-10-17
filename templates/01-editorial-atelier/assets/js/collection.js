/* ==========================================================================
   CRUMB ATELIER — collection.js
   Occasion filtering, plus honest availability against the chosen date.
   ========================================================================== */

(function () {
  boot('The Catalogue');

  const grid = document.querySelector('[data-grid]');
  const filtersEl = document.querySelector('[data-filters]');
  const countEl = document.querySelector('[data-count]');
  const noteEl = document.querySelector('[data-unavailable-note]');

  const params = new URLSearchParams(location.search);
  let activeOccasion = params.get('occasion') || 'all';

  /* Filters ---------------------------------------------------------------- */
  function paintFilters() {
    const all = [{ id: 'all', label: 'Everything' }, ...OCCASIONS];
    filtersEl.innerHTML = all
      .map(
        (o) =>
          `<button class="chip" type="button" data-occasion="${o.id}" aria-pressed="${
            o.id === activeOccasion
          }">${o.label}</button>`
      )
      .join('');
  }

  filtersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-occasion]');
    if (!btn) return;
    activeOccasion = btn.dataset.occasion;

    const url = new URL(location.href);
    if (activeOccasion === 'all') url.searchParams.delete('occasion');
    else url.searchParams.set('occasion', activeOccasion);
    history.replaceState({}, '', url);

    paintFilters();
    paintGrid();
  });

  /* Grid ------------------------------------------------------------------- */
  function paintGrid() {
    const readyBy = getReadyBy();
    const items = PRODUCTS.filter(
      (p) => activeOccasion === 'all' || p.occasions.includes(activeOccasion)
    );

    // Orderable cakes come first. Nothing is hidden — the brief is explicit
    // that the experience must reflect what the merchant can actually fulfil,
    // and a cake you cannot have today you may well want next week.
    const sorted = items.slice().sort((a, b) => {
      const aOk = readyBy >= earliestFor(leadDaysFor(a, a.defaults));
      const bOk = readyBy >= earliestFor(leadDaysFor(b, b.defaults));
      if (aOk !== bOk) return aOk ? -1 : 1;
      return Number(a.plate) - Number(b.plate);
    });

    const unavailable = sorted.filter(
      (p) => readyBy < earliestFor(leadDaysFor(p, p.defaults))
    ).length;

    grid.innerHTML = sorted.map((p, i) => renderCard(p, { readyBy, delay: i * 60 })).join('');

    countEl.textContent = `${sorted.length} ${sorted.length === 1 ? 'cake' : 'cakes'}`;

    noteEl.innerHTML = unavailable
      ? `<p class="notice" style="margin-bottom:clamp(1.5rem,3vw,2.25rem)">
           <b>${unavailable} ${unavailable === 1 ? 'cake needs' : 'cakes need'} more notice than
           ${fmtDateLong(readyBy)}.</b> They are still shown below, with the first date we could have
           each one ready. <button class="link" type="button" data-change-date style="border:0;border-bottom:1px solid var(--rule-strong);background:none;padding:0 0 2px">Change the date</button>
         </p>`
      : '';

    initReveal();
  }

  noteEl.addEventListener('click', (e) => {
    if (!e.target.closest('[data-change-date]')) return;
    openDateModal({
      leadDays: 0,
      selected: getReadyBy(),
      title: 'When do you need it?',
      onSelect: (d) => setReadyBy(d),
    });
  });

  document.addEventListener('readyby:change', paintGrid);

  paintFilters();
  paintGrid();
})();
