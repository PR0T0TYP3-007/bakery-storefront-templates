/**
 * @file Every shipped script must parse.
 *
 * This exists because a one-character mistake went live and took a whole
 * template with it. An apostrophe inside a single-quoted string —
 * `'we'll tell you'` — is a syntax error, the module never executes, and a
 * page that builds itself from JSON renders as a title and two buttons.
 *
 * Nothing caught it. The unit tests import the pure commerce modules and
 * never touch a page script. `build.mjs` copies files; it does not parse
 * them. The workflow checks that files *exist* in `dist/`, not that they
 * run. So the one defect that silently destroys a page was the one defect
 * with no gate in front of it.
 *
 * `node --check` is the cheapest possible gate: it parses and throws away
 * the result, so it costs milliseconds per file and cannot execute anything.
 * It catches exactly this class of error, which is the class most likely to
 * be introduced by editing copy inside code — which is how it happened.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = ['templates', 'shared', 'tools'];
const SKIP = new Set(['node_modules', 'dist', '.git']);

/** Every .js and .mjs file that ships or builds the thing that ships. */
async function scripts(dir, found = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await scripts(full, found);
    else if (/\.(js|mjs)$/.test(e.name)) found.push(full);
  }
  return found;
}

const files = (await Promise.all(ROOTS.map((r) => scripts(path.join(ROOT, r))))).flat();

test('there are scripts to check', () => {
  // Guards the guard: a glob that silently matches nothing passes every
  // assertion under it and proves exactly nothing.
  assert.ok(files.length > 50, `only found ${files.length} scripts — the walk is wrong`);
});

test('every shipped script parses', async () => {
  const broken = [];

  for (const file of files) {
    try {
      await run(process.execPath, ['--check', file]);
    } catch (err) {
      broken.push(`${path.relative(ROOT, file)}\n    ${String(err.stderr).trim().split('\n').slice(0, 3).join('\n    ')}`);
    }
  }

  assert.deepEqual(
    broken,
    [],
    `${broken.length} script(s) do not parse and would ship as a blank page:\n\n  ${broken.join('\n\n  ')}\n`
  );
});
