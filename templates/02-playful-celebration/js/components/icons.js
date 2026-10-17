/**
 * @file Icons, as strings.
 *
 * Inline rather than a sprite sheet or an icon font: there are twelve of
 * them, they are all one path, and a sprite would be a second request for
 * less than two kilobytes. Stroke weight is 2.2 to sit with the template's
 * 2–3px drawn lines rather than looking like a borrowed set.
 *
 * Every icon is aria-hidden. None of them is ever the only carrier of
 * meaning — each is paired with text in the markup that uses it.
 */

const wrap = (d, extra = '') =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true" focusable="false">${d}${extra}</svg>`;

export const icons = {
  cake: wrap(
    '<path d="M3 21h18M4 21v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7M8 12V9m4 3V9m4 3V9"/><path d="M12 6.5c0-1 1-1.5 1-2.5a1 1 0 0 0-2 0c0 1 1 1.5 1 2.5Z"/>'
  ),
  calendar: wrap(
    '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4m8-4v4"/>'
  ),
  clock: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2.2"/>'),
  van: wrap(
    '<path d="M2 7.5h11v9H2zM13 11h4.2l2.8 3v2.5H13z"/><circle cx="6.5" cy="18" r="1.8"/><circle cx="16.5" cy="18" r="1.8"/>'
  ),
  shop: wrap('<path d="M4 9h16v11H4zM3 9l2-5h14l2 5M9 20v-6h6v6"/>'),
  basket: wrap('<path d="M4 8h16l-1.6 11.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8L4 8ZM9 8V5.5a3 3 0 0 1 6 0V8"/>'),
  gift: wrap(
    '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 13h18M12 9v12"/><path d="M12 9S9.5 4 7.5 5.2C5.8 6.2 7 9 12 9Zm0 0s2.5-5 4.5-3.8C18.2 6.2 17 9 12 9Z"/>'
  ),
  heart: wrap('<path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20Z"/>'),
  check: wrap('<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>'),
  alert: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v6M12 16.6v.1"/>'),
  info: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.4v.1"/>'),
  chevron: wrap('<path d="m6 9.5 6 6 6-6"/>'),
  left: wrap('<path d="m14 6-6 6 6 6"/>'),
  right: wrap('<path d="m10 6 6 6-6 6"/>'),
  close: wrap('<path d="m6 6 12 12M18 6 6 18"/>'),
  menu: wrap('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  search: wrap('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4 4"/>'),
  print: wrap('<path d="M7 9V4h10v5M7 18H5v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6h-2M7 15h10v6H7z"/>'),
  pencil: wrap('<path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4 16.5V20Z"/>'),
  sparkle: wrap('<path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z"/>'),
};
