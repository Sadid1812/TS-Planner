import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSaveQueue, assertRevision} from '../src/persistence.js';
test('queued edits cannot leapfrog a conflict and overwrite another window', async () => {
  let disk = {revision: 2, note: 'Other window'}, calls = 0;
  const queue = createSaveQueue(async value => {
    calls++; assertRevision(disk, value.revision);
    disk = {...value, revision: value.revision + 1};
  });
  const outcomes = await Promise.allSettled([
    queue.enqueue({revision: 1, note: 'Stale edit'}, 'local'),
    queue.enqueue({revision: 2, note: 'Later stale edit'}, 'local')
  ]);
  assert.deepEqual(outcomes.map(x => x.status), ['rejected', 'rejected']);
  assert.equal(calls, 1); assert.equal(disk.note, 'Other window');
  await assert.rejects(queue.flush(), /another window/);
});
test('successful queued writes retain order and account key', async () => {
  const saved = [];
  const queue = createSaveQueue(async (value, key) => { saved.push([value.revision, key]); });
  await Promise.all([queue.enqueue({revision: 0}, 'account-a'), queue.enqueue({revision: 1}, 'account-a')]);
  await queue.flush(); assert.deepEqual(saved, [[0, 'account-a'], [1, 'account-a']]);
});
test('quota failure remains a failure until explicit recovery', async () => {
  const queue = createSaveQueue(async () => { throw new Error('Storage full'); });
  await assert.rejects(queue.enqueue({}, 'local'), /Storage full/);
  await assert.rejects(queue.flush(), /Storage full/);
  await assert.rejects(queue.enqueue({}, 'local'), /Storage full/);
});
test('revision guard rejects missing or older records for existing edits', () => {
  assertRevision(undefined, 0); assertRevision({revision: 3}, 3);
  assert.throws(() => assertRevision(undefined, 3));
  assert.throws(() => assertRevision({revision: 2}, 3));
});
