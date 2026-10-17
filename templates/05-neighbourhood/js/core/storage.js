/**
 * @file Storage with an in-memory fallback.
 *
 * `localStorage` throws in private mode, when site data is blocked, and in
 * some embedded webviews. Every read and write is guarded, and the page
 * works either way — the basket simply does not survive a reload.
 */

const memory = new Map();
let warned = false;

function available() {
  try {
    const k = '__probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    if (!warned) {
      warned = true;
      console.info('[storage] localStorage unavailable — using in-memory fallback.');
    }
    return false;
  }
}

/** @param {string} key @param {*} fallback */
export function read(key, fallback = null) {
  try {
    const raw = available() ? localStorage.getItem(key) : memory.get(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** @param {string} key @param {*} value */
export function write(key, value) {
  const raw = JSON.stringify(value);
  try {
    if (available()) localStorage.setItem(key, raw);
    else memory.set(key, raw);
  } catch {
    memory.set(key, raw);
  }
}

/** @param {string} key */
export function remove(key) {
  try {
    if (available()) localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  memory.delete(key);
}

/**
 * Keys are namespaced per merchant. Two bakeries served from one origin are
 * two different shops and must never share a basket.
 * @param {string} merchantId
 */
export function namespaced(merchantId) {
  const ns = `counter:${merchantId}`;
  return {
    read: (k, f) => read(`${ns}:${k}`, f),
    write: (k, v) => write(`${ns}:${k}`, v),
    remove: (k) => remove(`${ns}:${k}`),
  };
}
