/**
 * @file Icons, as strings.
 *
 * Deliberately few. This template separates with position and type, so an
 * icon set that tried to label everything would be working against it. These
 * exist for the handful of places where a glyph genuinely reads faster than
 * a word: a notice, a direction, a close.
 *
 * All aria-hidden; none is ever the only carrier of meaning.
 */

const wrap = (d) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.7" stroke-linecap="square" stroke-linejoin="miter"
     aria-hidden="true" focusable="false">${d}</svg>`;

export const icons = {
  /* Square ends and mitred joins throughout — the drawn equivalent of the
     grid this template is built on. */
  arrow: wrap('<path d="M4 12h15M13 6l6 6-6 6"/>'),
  back: wrap('<path d="M20 12H5M11 18l-6-6 6-6"/>'),
  down: wrap('<path d="M12 4v15M6 13l6 6 6-6"/>'),
  close: wrap('<path d="M5 5l14 14M19 5L5 19"/>'),
  menu: wrap('<path d="M3 6h18M3 12h18M3 18h18"/>'),
  plus: wrap('<path d="M12 4v16M4 12h16"/>'),
  minus: wrap('<path d="M4 12h16"/>'),
  check: wrap('<path d="M4 12.5l5 5L20 6.5"/>'),
  alert: wrap('<path d="M12 3L1.5 21h21L12 3zM12 9v6M12 18v.5"/>'),
  info: wrap('<rect x="3" y="3" width="18" height="18"/><path d="M12 11v6M12 7.5v.5"/>'),
  clock: wrap('<rect x="3" y="3" width="18" height="18"/><path d="M12 7v5.2l3.4 2"/>'),
  calendar: wrap('<rect x="3" y="4.5" width="18" height="16"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>'),
  print: wrap('<path d="M7 9V3h10v6M7 18H4V9h16v9h-3M7 14h10v7H7z"/>'),
  basket: wrap('<path d="M3 7h18l-2 14H5L3 7zM8.5 7V4.5h7V7"/>'),
};
