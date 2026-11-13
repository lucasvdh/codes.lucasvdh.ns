import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DelayChangeTracker } from '../lib/delay-change';

function run(threshold: number, delays: Array<[train: string, delay: number, previous: number | null]>): boolean[] {
  const tracker = new DelayChangeTracker();
  return delays.map(([trainKey, delayMinutes, previousDelayMinutes]) => (
    tracker.shouldFire('flow', threshold, { trainKey, delayMinutes, previousDelayMinutes })
  ));
}

describe('DelayChangeTracker', () => {
  it('adds up small steps until the threshold is reached', () => {
    assert.deepEqual(run(5, [['a', 2, 0], ['a', 3, 2], ['a', 4, 3], ['a', 5, 4]]), [false, false, false, true]);
  });

  it('measures from the last notification, also when the delay drops', () => {
    assert.deepEqual(run(5, [['a', 6, 0], ['a', 8, 6], ['a', 1, 8]]), [true, false, true]);
  });

  it('uses the previous delay as baseline for a train it has not seen', () => {
    assert.deepEqual(run(5, [['a', 9, 8]]), [false]);
  });

  it('treats a new train as starting from on time', () => {
    assert.deepEqual(run(5, [['a', 6, 0], ['b', 7, null]]), [true, true]);
  });

  it('keeps separate state per Flow', () => {
    const tracker = new DelayChangeTracker();
    const state = { trainKey: 'a', delayMinutes: 6, previousDelayMinutes: 0 };
    assert.equal(tracker.shouldFire('flow-5', 5, state), true);
    assert.equal(tracker.shouldFire('flow-10', 10, state), false);
  });
});
