import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { crossedDelayThreshold, matchesFilter } from '../lib/flow-controller';

describe('crossedDelayThreshold', () => {
  const crossed = (threshold: number, delayMinutes: number, previousDelayMinutes: number | null) => (
    crossedDelayThreshold(threshold, { delayMinutes, previousDelayMinutes })
  );

  it('fires for a newly seen train above the threshold', () => {
    assert.equal(crossed(5, 6, null), true);
  });

  it('fires when the delay crosses the threshold', () => {
    assert.equal(crossed(5, 6, 5), true);
    assert.equal(crossed(5, 8, 2), true);
  });

  it('does not fire for further changes above the threshold', () => {
    assert.equal(crossed(5, 7, 6), false);
    assert.equal(crossed(5, 6, 9), false);
  });

  it('does not fire at or below the threshold', () => {
    assert.equal(crossed(5, 5, null), false);
    assert.equal(crossed(5, 3, 1), false);
  });

  it('fires again after dropping below and crossing again', () => {
    assert.equal(crossed(5, 4, 7), false);
    assert.equal(crossed(5, 6, 4), true);
  });
});

describe('matchesFilter', () => {
  it('matches everything without a filter', () => {
    assert.equal(matchesFilter('Utrecht Centraal', ''), true);
    assert.equal(matchesFilter(undefined, ''), true);
  });

  it('matches case-insensitive substrings', () => {
    assert.equal(matchesFilter('Amsterdam Centraal', 'amsterdam'), true);
    assert.equal(matchesFilter('Utrecht Centraal', 'Amsterdam'), false);
    assert.equal(matchesFilter(undefined, 'Amsterdam'), false);
  });
});
