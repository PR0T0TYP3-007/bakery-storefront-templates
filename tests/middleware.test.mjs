import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/_middleware.js';

const NEXT = async () => new Response('SITE', { status: 200, headers: { 'X-From': 'site' } });
const req = (auth) => new Request('https://x.test/', auth ? { headers: { Authorization: auth } } : {});
const basic = (u, p) => 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');

test('inert when neither variable is set', async () => {
  const r = await onRequest({ request: req(), env: {}, next: NEXT });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'SITE');
});

test('refuses when only one variable is set', async () => {
  for (const env of [{ DEMO_USER: 'a' }, { DEMO_PASS: 'b' }]) {
    const r = await onRequest({ request: req(), env, next: NEXT });
    assert.equal(r.status, 503, JSON.stringify(env));
  }
});

const env = { DEMO_USER: 'bakery', DEMO_PASS: 'long-secret' };

test('challenges with no credentials', async () => {
  const r = await onRequest({ request: req(), env, next: NEXT });
  assert.equal(r.status, 401);
  assert.match(r.headers.get('WWW-Authenticate'), /^Basic realm=/);
});

test('rejects wrong password and wrong user', async () => {
  for (const h of [basic('bakery', 'nope'), basic('nope', 'long-secret'), basic('', '')]) {
    assert.equal((await onRequest({ request: req(h), env, next: NEXT })).status, 401);
  }
});

test('rejects a non-Basic scheme and malformed base64', async () => {
  for (const h of ['Bearer abc', 'Basic !!!!', 'Basic', 'Basic ' + Buffer.from('nocolon').toString('base64')]) {
    assert.equal((await onRequest({ request: req(h), env, next: NEXT })).status, 401, h);
  }
});

test('accepts correct credentials and passes the site through', async () => {
  const r = await onRequest({ request: req(basic('bakery', 'long-secret')), env, next: NEXT });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'SITE');
  assert.equal(r.headers.get('X-From'), 'site', 'original headers survive');
  assert.equal(r.headers.get('Cache-Control'), 'no-store', 'protected pages are not cacheable');
});

test('a password containing a colon works', async () => {
  const e = { DEMO_USER: 'u', DEMO_PASS: 'a:b:c' };
  const r = await onRequest({ request: req(basic('u', 'a:b:c')), env: e, next: NEXT });
  assert.equal(r.status, 200);
});

test('a prefix of the real password is rejected', async () => {
  const r = await onRequest({ request: req(basic('bakery', 'long')), env, next: NEXT });
  assert.equal(r.status, 401);
});
