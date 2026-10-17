/**
 * Assembles a deployable site containing ONLY Template 01, with its pages at
 * the root so the bare domain opens on the storefront itself.
 *
 *   node build.mjs            -> builds ./dist
 *   node build.mjs --template 05-neighbourhood
 *
 * Why a build step at all, when the templates are deliberately buildless:
 * the templates themselves still have none — this only copies files and
 * rewrites two path prefixes. Nothing is bundled, minified or transpiled, and
 * the output is the same plain HTML, CSS and JS that runs from the repo.
 *
 * What it does:
 *   1. Copies the chosen template's pages to the root of dist/.
 *   2. Copies shared/js, and only the photographs that template references.
 *   3. Rewrites `../../shared/` to `shared/` to suit the flatter layout.
 *   4. Drops the "All templates" footer link, since there is no chooser.
 *   5. Writes a tailored _headers and a 404.
 *
 * The repo is untouched: the chooser and Template 05 stay where they are and
 * simply are not deployed.
 */

import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// fileURLToPath, not url.pathname: the latter keeps the percent-encoding and
// the leading slash on Windows drive letters, so a path containing a space
// silently resolves to nothing.
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'dist');

const argv = process.argv.slice(2);
const templateArg = argv.indexOf('--template');
const TEMPLATE = templateArg > -1 ? argv[templateArg + 1] : '01-editorial-atelier';
const SRC = path.join(ROOT, 'templates', TEMPLATE);

if (!existsSync(SRC)) {
  console.error(`No such template: templates/${TEMPLATE}`);
  process.exit(1);
}

/* ------------------------------------------------------------------------ */

// GitHub Pages cannot send response headers, so `noindex` has to live in the
// markup to survive on every host. Injected rather than written into the
// templates, so the source stays clean for a real launch.
const ROBOTS = '<meta name="robots" content="noindex, nofollow">';

const REWRITES = [
  // The template sits two levels deep in the repo and at the root in dist.
  [/\.\.\/\.\.\/shared\//g, 'shared/'],
  // There is no chooser in a single-template build, so the link would 404.
  [/\s*<p class="meta"><a href="\.\.\/\.\.\/index\.html">All templates<\/a>[^<]*<\/p>/g, ''],
  [/\s*<p><a href="\.\.\/\.\.\/index\.html">All templates<\/a>[^<]*<\/p>/g, ''],
  [/<a href="\.\.\/\.\.\/index\.html">All templates<\/a>\s*·\s*/g, ''],
];

const TEXT = new Set(['.html', '.js', '.css', '.json', '.svg', '.webmanifest']);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function rewriteIn(dir) {
  let touched = 0;
  for (const file of await walk(dir)) {
    if (!TEXT.has(path.extname(file))) continue;
    const before = await readFile(file, 'utf8');
    let after = before;
    for (const [find, replace] of REWRITES) after = after.replace(find, replace);

    if (path.extname(file) === '.html' && !after.includes('name="robots"')) {
      after = after.replace('<meta charset="utf-8">', `<meta charset="utf-8">
${ROBOTS}`);
    }

    if (after !== before) {
      await writeFile(file, after, 'utf8');
      touched++;
    }
  }
  return touched;
}

/* ------------------------------------------------------------------------ */

console.log(`Building templates/${TEMPLATE} -> dist/`);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// 1. The template's own files, flattened to the root.
await cp(SRC, OUT, { recursive: true });

// Development-only files have no business on a public site.
for (const junk of ['package.json', 'tests', 'README.md']) {
  await rm(path.join(OUT, junk), { recursive: true, force: true });
}

// 2. Shared JavaScript.
if (existsSync(path.join(ROOT, 'shared', 'js'))) {
  await cp(path.join(ROOT, 'shared', 'js'), path.join(OUT, 'shared', 'js'), { recursive: true });
}

// 3. Only the photographs this template actually references. Template 05's
//    bread and pastry shots are several megabytes that Template 01 never asks
//    for, and shipping them would be dead weight on every deploy.
const referenced = new Set();
for (const file of await walk(OUT)) {
  if (!TEXT.has(path.extname(file))) continue;
  const text = await readFile(file, 'utf8');
  for (const m of text.matchAll(/photo-[0-9a-zA-Z_-]+?(?=-(?:sm|md|lg)\.jpg|["'`)\s])/g)) {
    referenced.add(m[0]);
  }
}

const imgSrc = path.join(ROOT, 'shared', 'img');
const imgOut = path.join(OUT, 'shared', 'img');
await mkdir(imgOut, { recursive: true });

let copied = 0;
let skipped = 0;
for (const name of await readdir(imgSrc)) {
  const id = name.replace(/-(sm|md|lg)\.jpg$/, '');
  if (referenced.has(id)) {
    await cp(path.join(imgSrc, name), path.join(imgOut, name));
    copied++;
  } else {
    skipped++;
  }
}

// 4. Path rewrites.
const touched = await rewriteIn(OUT);

// 5. Headers. Cloudflare and Netlify honour this file; GitHub Pages cannot
//    send custom headers at all, which is why `noindex` is also injected into
//    the markup above. Kept so the output stays portable between hosts.
await writeFile(
  path.join(OUT, '_headers'),
  `# Generated by build.mjs — edit the generator, not this file.

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()

  # Demonstration build. Remove this line when it becomes a real storefront.
  X-Robots-Tag: noindex, nofollow

# Filenames carry no content hash, so these must revalidate rather than be
# cached hard — otherwise an edit is invisible until the cache expires.
/*.html
  Cache-Control: public, max-age=0, must-revalidate
/
  Cache-Control: public, max-age=0, must-revalidate
/*.css
  Cache-Control: public, max-age=0, must-revalidate
/*.js
  Cache-Control: public, max-age=0, must-revalidate

# Stable filenames, safe to cache for a year.
/shared/img/*
  Cache-Control: public, max-age=31536000, immutable
`,
  'utf8'
);

// 6. A 404 in this template's own voice.
await writeFile(
  path.join(OUT, '404.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Not found — Crumb Atelier</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/base.css">
<link rel="stylesheet" href="assets/css/components.css">
</head>
<body>
<main class="wrap" style="min-height:100vh;display:grid;place-items:center;text-align:center">
  <div style="max-width:46ch">
    <p class="meta">404</p>
    <h1 class="d-1" style="margin-top:1rem">No such plate.</h1>
    <p class="lede" style="margin:1.25rem auto 0">
      That page isn't in the catalogue. The link may be old, or the cake may have been
      retired from the book.
    </p>
    <p style="margin-top:2.5rem">
      <a class="btn" href="index.html">Back to the catalogue</a>
    </p>
  </div>
</main>
</body>
</html>
`,
  'utf8'
);

// 7. Stop GitHub Pages running Jekyll, which silently drops any path starting
//    with an underscore. Template 01 has none today, but this costs nothing
//    and the failure it prevents is invisible until something is missing.
await writeFile(path.join(OUT, '.nojekyll'), '', 'utf8');

/* ------------------------------------------------------------------------ */

const pages = (await readdir(OUT)).filter((f) => f.endsWith('.html')).sort();
console.log(`  pages     ${pages.join(', ')}`);
console.log(`  images    ${copied} copied, ${skipped} skipped as unreferenced`);
console.log(`  rewrites  ${touched} files`);
console.log(`  output    dist/`);
