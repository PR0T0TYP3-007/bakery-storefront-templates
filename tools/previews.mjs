/**
 * Regenerate the listing page's preview screenshots.
 *
 *   node tools/previews.mjs            # against the local dev server
 *   node tools/previews.mjs --port 4321
 *
 * The README has said since the first commit that these must be regenerated
 * after a visual change, because they are real captures and a stale one
 * misrepresents the template. It was still missed across nine commits, which
 * is what a manual step in a README buys you. This is that step, written
 * down as something runnable.
 *
 * Captures at twice the final size and downscales, so the type in the
 * thumbnail is resampled rather than rendered at thumbnail size — a 1120px
 * screenshot of a page designed for 1400px looks like a broken layout, not a
 * small one.
 */

import { execFile } from 'node:child_process';
import { mkdtemp, rm, readdir, copyFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

const WIDTH = 1400;           // capture viewport
const HEIGHT = 875;           // 1.6:1, the ratio the listing page expects
const SCALE = 2;              // retina capture, downscaled after
const OUT_W = 1120;
const OUT_H = 700;

const TEMPLATES = [
  '01-editorial-atelier',
  '02-playful-celebration',
  '03-romantic-boutique',
  '04-creative-studio',
  '05-neighbourhood',
];

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

async function findChrome() {
  for (const c of CHROME) {
    try {
      await access(c);
      return c;
    } catch {
      /* next */
    }
  }
  throw new Error('No Chrome or Edge found. Add its path to CHROME in this file.');
}

const port = flag('port', '4321');
const root = path.resolve(import.meta.dirname, '..');
const chrome = await findChrome();

console.log(`  browser   ${path.basename(chrome)}`);
console.log(`  capture   ${WIDTH}x${HEIGHT} @${SCALE}x -> ${OUT_W}x${OUT_H}`);

for (const t of TEMPLATES) {
  const url = `http://localhost:${port}/templates/${t}/index.html`;
  const dir = await mkdtemp(path.join(tmpdir(), 'shot-'));
  const shot = path.join(dir, 'out.png');
  const profile = path.join(dir, 'profile');

  const args = (extra) => [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    /* Without this, headless draws the frame before every compositor stage
       has run, and images that are inside a transformed or clipped box come
       out blank while their neighbours render. That is what was wrong with
       Template 05: the hero photograph and two of three morning pictures
       were missing every single run, identically, which is the signature of
       a compositing problem rather than the network race it looked like. */
    '--run-all-compositor-stages-before-draw',
    '--force-color-profile=srgb',
    `--user-data-dir=${profile}`,
    // Fonts load late, the pages draw themselves from JSON, and the images
    // are only requested once that JSON has produced the markup that asks
    // for them. 6000 was not enough: Template 05's hero photograph and two
    // of its three morning pictures were still blank when the shutter fell,
    // so the preview showed a flat green band where the shop should be.
    '--virtual-time-budget=20000',
    `--window-size=${WIDTH},${HEIGHT}`,
    `--force-device-scale-factor=${SCALE}`,
    ...extra,
    url,
  ];

  /* Two passes, sharing one profile.
  
     `--virtual-time-budget` fast-forwards the page's clock but leaves the
     network real, so the shutter can fall while images are still in flight.
     Raising the budget did not fix it, because the budget is not what runs
     out -- Template 05's hero photograph and two of its three morning
     pictures were still missing at 20s, while the middle one made it, which
     is a race rather than a timeout.
  
     The first pass loads the page and is thrown away; it exists to fill the
     HTTP cache in a profile the second pass reuses. The second pass then
     has every image locally and nothing to wait for. */
  await run(chrome, args([]), { timeout: 90000 });
  await run(chrome, args([`--screenshot=${shot}`]), { timeout: 90000 });

  const dest = path.join(root, 'assets', 'previews', `template-${t.slice(0, 2)}.jpg`);
  await run('python', ['-I', '-c', `
from PIL import Image
im = Image.open(r"${shot}").convert("RGB")
im = im.resize((${OUT_W}, ${OUT_H}), Image.LANCZOS)
im.save(r"${dest}", "JPEG", quality=82, optimize=True, progressive=True)
print("   %-26s %s" % ("${t}", im.size))
`], { cwd: root }).then((r) => process.stdout.write(r.stdout));

  await rm(dir, { recursive: true, force: true });
}

const files = await readdir(path.join(root, 'assets', 'previews'));
console.log(`  wrote     ${files.filter((f) => f.endsWith('.jpg')).length} previews`);
void copyFile;
