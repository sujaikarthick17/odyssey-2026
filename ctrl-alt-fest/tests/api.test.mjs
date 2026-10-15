import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Import browser ES modules without needing a package manager or package.json.
const source = await readFile(new URL('../js/api.js', import.meta.url), 'utf8');
const api = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('normalization preserves IDs and handles missing or malformed optional fields', () => {
  const event = api.normalizeEvent({ id: 'unchanged/ID', price: null, tags: null, schedules: [null], cover_image_url: 'javascript:alert(1)' });
  assert.equal(event.id, 'unchanged/ID'); assert.equal(event.price, null);
  assert.equal(event.image, ''); assert.deepEqual(event.tags, []); assert.deepEqual(event.schedules, []);
  assert.equal(api.normalizeEvent(null), null); assert.equal(api.normalizeEvent({ name: 'No ID' }), null);
  assert.equal(api.normalizeEvent({ id: 0 }).id, 0);
  assert.equal(api.priceLabel(event), '');
});
test('free and paid prices remain distinct from unknown prices', () => {
  assert.equal(api.priceLabel(api.normalizeEvent({ id: 'a', price: 0 })), 'Free');
  assert.equal(api.priceLabel(api.normalizeEvent({ id: 'a', price: 500, is_per_head: false })), '500 / team');
  assert.equal(api.normalizeEvent({ id: 'a', price: -5 }).price, null);
});
test('invalid dates and unsafe links are rejected', () => {
  for (const value of ['2026-02-30', 'invalid', '', null, '2026-13-10']) assert.equal(api.dateLabel(value), '');
  assert.equal(api.dateLabel('2026-11-13'), '13 Nov 2026');
  assert.equal(api.safeURL('data:text/html,hello'), '');
  assert.equal(api.safeURL('https://example.org/register'), 'https://example.org/register');
});
test('registration respects status, event status and expired deadlines', () => {
  const base = api.normalizeEvent({ id: 'a', registration_status: 'OPEN', event_status: 'ACTIVE' });
  assert.equal(api.registrationOpen(base), true);
  assert.equal(api.registrationOpen({ ...base, registrationStatus: 'SOLD_OUT' }), false);
  assert.equal(api.registrationOpen({ ...base, deadline: '2000-01-01T00:00:00Z' }), false);
  assert.equal(api.registrationOpen({ ...base, status: 'COMPLETED' }), false);
});

test('festival demo dates stay within October 20–23 across cards and schedule rows', () => {
  const days = new Set();
  for (let id = 0; id < 40; id++) {
    const source = api.normalizeEvent({ id, schedule_summary: { start_date: '2026-11-13', end_date: '2026-11-15', start_time: '10:00' }, schedules: [{ event_date: '2026-11-13', start_time: '10:00', venue: 'Hall' }, { event_date: '2026-11-15' }], registration_deadline: '2026-11-12T18:00:00+05:30' });
    const mapped = api.scheduleForFestival(source);
    days.add(mapped.summary.start_date);
    for (const date of [mapped.summary.start_date, mapped.summary.end_date, ...mapped.schedules.map(s => s.event_date)]) assert.ok(date >= '2026-10-20' && date <= '2026-10-23');
    assert.ok(mapped.summary.end_date >= mapped.summary.start_date);
    assert.equal(mapped.id, id);
    assert.equal(mapped.schedules[0].venue, 'Hall');
    assert.equal(mapped.schedules[0].start_time, '10:00');
    assert.equal(source.summary.start_date, '2026-11-13');
    assert.ok(Date.parse(mapped.deadline) < Date.parse(mapped.summary.start_date));
    assert.deepEqual(api.scheduleForFestival(mapped), mapped);
    const listOnly = api.scheduleForFestival({ ...source, schedules: [] });
    assert.equal(listOnly.summary.start_date, mapped.summary.start_date);
    assert.equal(listOnly.summary.end_date, mapped.summary.end_date);
  }
  assert.equal(days.size, 4);
});

test('festival schedule handles missing dates and never moves a deadline beyond start day', () => {
  const missing = api.scheduleForFestival(api.normalizeEvent({ id: 'missing', schedules: [{ event_date: 'bad' }] }));
  assert.ok(missing.summary.start_date >= '2026-10-20' && missing.summary.start_date <= '2026-10-23');
  assert.equal(missing.schedules[0].event_date, missing.summary.start_date);
  const late = api.scheduleForFestival(api.normalizeEvent({ id: 'late', schedule_summary: { start_date: '2026-11-13' }, registration_deadline: '2026-12-31T00:00:00Z' }));
  assert.ok(Date.parse(late.deadline) <= Date.parse(late.summary.start_date + 'T23:59:59+05:30'));
});
test('request contracts, encoding, HTTP errors, network errors and timeout', async () => {
  const originalFetch = globalThis.fetch;
  const originalTimeout = globalThis.setTimeout;
  try {
    globalThis.fetch = async url => { assert.equal(url, `${api.API_BASE}/events`); return { ok: true, json: async () => ({ events: [{ id: 'real-id', name: 'Real title' }] }) }; };
    assert.equal((await api.getEvents())[0].id, 'real-id');
    globalThis.fetch = async url => { assert.equal(url, `${api.API_BASE}/events/a%2Fb`); return { ok: true, json: async () => ({ event: { id: 'a/b' } }) }; };
    assert.equal((await api.getEvent('a/b')).id, 'a/b');
    globalThis.fetch = async () => ({ ok: false, status: 404 });
    await assert.rejects(api.getEvent('missing'), { status: 404 });
    globalThis.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(api.getEvents(), /503/);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ wrong: [] }) });
    await assert.rejects(api.getEvents(), /unexpected list format/);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ events: [] }) });
    assert.deepEqual(await api.getEvents(), []);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ event: null }) });
    await assert.rejects(api.getEvent('missing'), { status: 404 });
    globalThis.fetch = async () => ({ ok: true, json: async () => { throw new SyntaxError(); } });
    await assert.rejects(api.getEvents(), /unreadable/);
    globalThis.fetch = async () => { throw new TypeError('Network error'); };
    await assert.rejects(api.getEvents(), /connection/);
    globalThis.setTimeout = callback => originalTimeout(callback, 1);
    globalThis.fetch = (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
    await assert.rejects(api.getEvents(), /too long/);
  } finally { globalThis.fetch = originalFetch; globalThis.setTimeout = originalTimeout; }
});
