/**
 * @file Inline SVG icons. No icon font, no emoji.
 * Every icon is decorative (`aria-hidden`) and always sits beside real text —
 * nothing in this template is conveyed by an icon alone.
 */

const svg = (d, extra = '') =>
  `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false" ${extra}>${d}</svg>`;

export const icons = {
  clock: svg(
    '<circle cx="8" cy="8" r="6.4" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.4V8l2.6 1.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
  ),
  basket: svg(
    '<path d="M3 5.5h10l-.9 8.5a1 1 0 0 1-1 .9H4.9a1 1 0 0 1-1-.9L3 5.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5.9 7.3V4.9a2.1 2.1 0 1 1 4.2 0v2.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
  ),
  plus: svg('<path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  check: svg('<path d="M3 8.5 6.5 12 13 4.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  alert: svg(
    '<path d="M8 2.8 14.5 13.5h-13L8 2.8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.6v2.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.6" r=".9" fill="currentColor"/>'
  ),
  info: svg(
    '<circle cx="8" cy="8" r="6.4" stroke="currentColor" stroke-width="1.5"/><path d="M8 7.3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="4.9" r=".9" fill="currentColor"/>'
  ),
  search: svg(
    '<circle cx="7.2" cy="7.2" r="4.6" stroke="currentColor" stroke-width="1.6"/><path d="m10.8 10.8 3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
  ),
  left: svg('<path d="M10 3 5 8l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  right: svg('<path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  close: svg('<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  repeat: svg(
    '<path d="M2.6 8a5.4 5.4 0 0 1 9.2-3.8M13.4 8a5.4 5.4 0 0 1-9.2 3.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M11.8 1.6v3h-3M4.2 14.4v-3h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
  ),
  pin: svg(
    '<path d="M8 14.5s4.8-4 4.8-7.4A4.8 4.8 0 0 0 3.2 7.1C3.2 10.5 8 14.5 8 14.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="7" r="1.7" stroke="currentColor" stroke-width="1.5"/>'
  ),
};

/** The shop's mark: a wheat ear, drawn rather than borrowed. */
export const wheatMark = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false">
  <path d="M9 16V6.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M9 6.2c0-1.9 1.1-3.4 2.6-4.2.5 1.7.1 3.5-1.1 4.6-.4.4-1 .3-1.5-.4ZM9 6.2C9 4.3 7.9 2.8 6.4 2c-.5 1.7-.1 3.5 1.1 4.6.4.4 1 .3 1.5-.4Z" fill="currentColor"/>
  <path d="M9 10.4c0-1.9 1.1-3.4 2.6-4.2.5 1.7.1 3.5-1.1 4.6-.4.4-1 .3-1.5-.4ZM9 10.4c0-1.9-1.1-3.4-2.6-4.2-.5 1.7-.1 3.5 1.1 4.6.4.4 1 .3 1.5-.4Z" fill="currentColor"/>
</svg>`;
