/**
 * @file 404. Chrome, and nothing else — the page's words are in the HTML
 * because they say nothing about this particular merchant.
 */

import { startPage, $$, link } from './_page.js';

await startPage({ nav: null });

for (const el of $$('[data-home-link]')) el.href = link('index.html');
for (const el of $$('[data-cakes-link]')) el.href = link('cakes.html');
