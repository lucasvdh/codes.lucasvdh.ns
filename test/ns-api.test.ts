import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDelaySeconds, isStillUpcoming, trackToNumber, tripHasDisruption } from '../lib/ns-api';
import type { Departure, Trip } from '../lib/types';

const departure = (planned: string, actual?: string) => (
  { plannedDateTime: planned, actualDateTime: actual } as Departure
);

describe('getDelaySeconds', () => {
  it('returns the delay in seconds', () => {
    assert.equal(getDelaySeconds(departure('2026-11-13T08:00:00+0100', '2026-11-13T08:04:00+0100')), 240);
  });

  it('never returns a negative delay', () => {
    assert.equal(getDelaySeconds(departure('2026-11-13T08:00:00+0100', '2026-11-13T07:59:00+0100')), 0);
  });

  it('returns 0 without an actual time', () => {
    assert.equal(getDelaySeconds(departure('2026-11-13T08:00:00+0100')), 0);
  });
});

describe('isStillUpcoming', () => {
  it('keeps trains within the grace period', () => {
    assert.equal(isStillUpcoming(new Date(Date.now() - 30_000).toISOString()), true);
    assert.equal(isStillUpcoming(new Date(Date.now() + 60_000).toISOString()), true);
  });

  it('drops departed trains and invalid input', () => {
    assert.equal(isStillUpcoming(new Date(Date.now() - 120_000).toISOString()), false);
    assert.equal(isStillUpcoming(undefined), false);
    assert.equal(isStillUpcoming('nonsense'), false);
  });
});

describe('trackToNumber', () => {
  it('extracts the leading track number', () => {
    assert.equal(trackToNumber('5'), 5);
    assert.equal(trackToNumber('14b'), 14);
    assert.equal(trackToNumber(''), 0);
    assert.equal(trackToNumber('a'), 0);
  });
});

describe('tripHasDisruption', () => {
  const trip = (fields: Partial<Trip>) => ({ status: 'NORMAL', legs: [], ...fields } as unknown as Trip);

  it('flags disruptions from status, primary message and messages', () => {
    assert.equal(tripHasDisruption(trip({ status: 'DISRUPTION' })), true);
    assert.equal(tripHasDisruption(trip({ primaryMessage: { type: 'ALTERNATIVE_TRANSPORT' } })), true);
    assert.equal(tripHasDisruption(trip({ messages: [{ type: 'CALAMITY' }] })), true);
  });

  it('ignores planned work and notices', () => {
    for (const type of ['MAINTENANCE', 'REPLACEMENT', 'ADDITIONAL', 'SHORTENED_TRAIN']) {
      assert.equal(tripHasDisruption(trip({ primaryMessage: { type } })), false, type);
    }
    assert.equal(tripHasDisruption(trip({ status: 'MAINTENANCE', messages: [{ type: 'MAINTENANCE' }] })), false);
  });
});
