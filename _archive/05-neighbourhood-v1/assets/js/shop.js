/* ==========================================================================
   TEMPLATE 05 — shop.js
   Category tabs and search. Both are plain, instant and forgiving — this is
   the template whose whole claim is that ordinary people can use it quickly.
   ========================================================================== */

(function () {
  boot('Shop');

  const $ = (s) => document.querySelector(s);
  const grid = $('[data-grid]');
  const tabsEl = $('[data-tabs]');
  const countEl = $('[data-count]');
  const emptyEl = $('[data-empty]');
  const noteEl = $('[data-note]');
  const searchEl = $('[data-search]');

  const params = new URLSearchParams(location.search);
  let cat = params.get('cat') || 'all';
  let query = '';

  /* Tabs ------------------------------------------------------------------ */
  function paintTabs() {
    const all = [{ id: 'all', label: 'Everything' }, ...CATEGORIES];
    tabsEl.innerHTML = all
      .map(
        (c) =>
          `<button class="tab" type="button" data-cat="${c.id}" aria-pressed="${c.id === cat}">${c.label}</button>`
      )
      .join('');
  }

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    cat = btn.dataset.cat;

    const url = new URL(location.href);
    if (cat === 'all') url.searchParams.delete('cat');
    else url.searchParams.set('cat', cat);
    history.replaceState({}, '', url);

    paintTabs();
    paint();
  });

  /* Search ---------------------------------------------------------------- */
  searchEl.addEventListener('input', () => {
    query = searchEl.value.trim().toLowerCase();
    paint();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-reset]')) return;
    cat = 'all';
    query = '';
    searchEl.value = '';
    paintTabs();
    paint();
  });

  /* Paint ----------------------------------------------------------------- */
  function matches(p) {
    if (cat !== 'all' && p.category !== cat) return false;
    if (!query) return true;
    const hay = [p.name, p.subtitle, p.category, ...(p.notes || []), ...(p.occasions || [])]
      .join(' ')
      .toLowerCase();
    return hay.includes(query);
  }

  function paint() {
    const when = getReadyBy();
    $('[data-when-label]').textContent = `${dayWord(when)}, ${fmtDate(when, {
      day: 'numeric',
      month: 'long',
    })}`;

    const items = PRODUCTS.filter(matches);

    // Sold-out items sink to the bottom but are never hidden — a customer who
    // wants a sourdough should be told it has gone, not shown an empty shelf.
    const sorted = items.slice().sort((a, b) => {
      const aOut = shelf(a, when).state === 'out';
      const bOut = shelf(b, when).state === 'out';
      if (aOut !== bOut) return aOut ? 1 : -1;
      return 0;
    });

    grid.innerHTML = sorted.map((p, i) => renderCard(p, { when, delay: i * 40 })).join('');
    countEl.textContent = `${sorted.length} ${sorted.length === 1 ? 'item' : 'items'}`;
    emptyEl.hidden = sorted.length > 0;

    const soldOut = sorted.filter((p) => shelf(p, when).state === 'out').length;
    noteEl.innerHTML = soldOut
      ? `<p class="notice notice--warn" style="margin-bottom:1.25rem">
           <strong>${soldOut} ${soldOut === 1 ? 'item has' : 'items have'} sold out for
           ${dayWord(when).toLowerCase()}.</strong> Pick a later day at the top of the page and they
           will come back.</p>`
      : '';

    initReveal();
  }

  document.addEventListener('readyby:change', paint);

  paintTabs();
  paint();
})();
