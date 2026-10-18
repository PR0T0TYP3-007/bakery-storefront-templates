/**
 * @file Icons, as strings.
 *
 * Round caps and round joins, drawn on a 24-grid at a light weight — the
 * same posture as the hairline display face. Template 04's set is square-cut
 * and mitred for the opposite reason, and the two sitting side by side is a
 * fair illustration of how much of an identity lives in a stroke setting.
 *
 * All aria-hidden; none is ever the only carrier of meaning.
 */

const wrap = (d) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true" focusable="false">${d}</svg>`;

export const icons = {
  arrow: wrap('<path d="M4 12h15M13.5 6.5L19 12l-5.5 5.5"/>'),
  back: wrap('<path d="M20 12H5M10.5 6.5L5 12l5.5 5.5"/>'),
  down: wrap('<path d="M12 4v15M6.5 13.5L12 19l5.5-5.5"/>'),
  close: wrap('<path d="M6 6l12 12M18 6L6 18"/>'),
  menu: wrap('<path d="M3.5 7h17M3.5 12h17M3.5 17h17"/>'),
  plus: wrap('<path d="M12 5v14M5 12h14"/>'),
  minus: wrap('<path d="M5 12h14"/>'),
  check: wrap('<path d="M4.5 12.5l4.8 4.8L19.5 7"/>'),
  alert: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.4v.1"/>'),
  info: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>'),
  clock: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 6.8v5.4l3.4 2"/>'),
  calendar: wrap('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  print: wrap('<path d="M7.5 9.5V3.5h9v6M7.5 17.5h-3v-8h15v8h-3M7.5 14h9v6.5h-9z"/>'),
  basket: wrap('<path d="M4 8h16l-1.6 12.5H5.6L4 8zM8.8 8V5.2a3.2 3.2 0 0 1 6.4 0V8"/>'),
  /* The two that only this template has. A card, and a pen. */
  card: wrap('<rect x="3" y="6" width="18" height="12.5" rx="1.5"/><path d="M7 10.5h7M7 14h4.5"/>'),
  pen: wrap('<path d="M4 20l1-4L16.2 4.8a2.1 2.1 0 0 1 3 3L8 19l-4 1zM14.4 6.6l3 3"/>'),
  heart: wrap('<path d="M12 20S3.8 14.6 3.8 9.4A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8.2 2.4C20.2 14.6 12 20 12 20z"/>'),
};
