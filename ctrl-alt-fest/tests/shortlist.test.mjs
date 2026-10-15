import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const source = await readFile(new URL('../js/shortlist.js', import.meta.url), 'utf8');
const { createShortlist, SHORTLIST_KEY } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
function memoryStorage(initial = null) {
  let value = initial;
  return { getItem: () => value, setItem(key, next) { assert.equal(key, SHORTLIST_KEY); value = next; } };
}

test('saved IDs survive reload, normalize numeric IDs and can be removed', () => {
  const storage = memoryStorage();
  const first = createShortlist(storage);
  assert.deepEqual(first.toggle(0), { saved: true, persisted: true });
  first.toggle('event/unchanged');
  const reloaded = createShortlist(storage);
  assert.equal(reloaded.has('0'), true);
  assert.equal(reloaded.has('event/unchanged'), true);
  reloaded.toggle('event/unchanged');
  assert.deepEqual(createShortlist(storage).ids(), ['0']);
});

test('invalid stored values do not break event browsing', () => {
  for (const value of ['{broken', '{}', 'null']) assert.deepEqual(createShortlist(memoryStorage(value)).ids(), []);
  assert.deepEqual(createShortlist(memoryStorage('[null,{},true,"a","a",3]')).ids(), ['a', '3']);
});

test('unavailable or full storage preserves a temporary working shortlist', () => {
  for (const storage of [undefined, { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } }, { getItem: () => '[]', setItem() { throw Error('quota'); } }]) {
    const list = createShortlist(storage);
    assert.deepEqual(list.toggle('one'), { saved: true, persisted: false });
    list.toggle('two');
    assert.deepEqual(list.ids(), ['one', 'two']);
    list.toggle('one');
    assert.deepEqual(list.ids(), ['two']);
  }
});

test('two tabs retain each other’s saves and respond to cleared storage', () => {
  const storage = memoryStorage();
  const first = createShortlist(storage);
  const second = createShortlist(storage);
  first.toggle('a'); second.toggle('b'); first.refresh();
  assert.deepEqual(first.ids(), ['a', 'b']);
  storage.setItem(SHORTLIST_KEY, '[]'); second.refresh();
  assert.deepEqual(second.ids(), []);
});
