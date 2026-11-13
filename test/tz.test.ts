import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  currentOrNextNlWindow,
  formatNlTime,
  isNlIsoInWindow,
  nlWallTimeToDate,
  parseHHMM,
} from '../lib/tz';

const hm = (s: string) => parseHHMM(s)!;

function window(from: string, to: string, nowUtc: string) {
  const w = currentOrNextNlWindow(hm(from), hm(to), new Date(nowUtc));
  return { start: w.start.toISOString(), end: w.end.toISOString() };
}

describe('parseHHMM', () => {
  it('parses valid times', () => {
    assert.deepEqual(parseHHMM('8:05'), { hours: 8, minutes: 5 });
    assert.deepEqual(parseHHMM(' 23:59 '), { hours: 23, minutes: 59 });
  });

  it('rejects invalid input', () => {
    for (const input of ['', '24:00', '12:60', '1200', 'ab:cd']) {
      assert.equal(parseHHMM(input), null, input);
    }
  });
});

describe('formatNlTime', () => {
  it('formats in Amsterdam time across DST', () => {
    assert.equal(formatNlTime('2026-01-15T07:30:00Z'), '08:30');
    assert.equal(formatNlTime('2026-07-15T07:30:00Z'), '09:30');
  });

  it('returns an empty string for invalid input', () => {
    assert.equal(formatNlTime(''), '');
    assert.equal(formatNlTime('not a date'), '');
  });
});

describe('nlWallTimeToDate', () => {
  it('converts NL wall time to UTC in winter and summer', () => {
    assert.equal(nlWallTimeToDate(2026, 0, 15, 8, 0).toISOString(), '2026-01-15T07:00:00.000Z');
    assert.equal(nlWallTimeToDate(2026, 6, 15, 8, 0).toISOString(), '2026-07-15T06:00:00.000Z');
  });
});

describe('isNlIsoInWindow', () => {
  it('handles a normal window', () => {
    assert.equal(isNlIsoInWindow('2026-11-13T07:15:00Z', 8 * 60, 8 * 60 + 30), true);
    assert.equal(isNlIsoInWindow('2026-11-13T08:15:00Z', 8 * 60, 8 * 60 + 30), false);
  });

  it('handles a window crossing midnight', () => {
    assert.equal(isNlIsoInWindow('2026-11-14T00:30:00Z', 22 * 60, 2 * 60), true);
    assert.equal(isNlIsoInWindow('2026-11-13T12:00:00Z', 22 * 60, 2 * 60), false);
  });
});

describe('currentOrNextNlWindow', () => {
  it('returns today\'s window while it is in progress', () => {
    assert.deepEqual(window('08:00', '08:30', '2026-11-13T07:05:00Z'), {
      start: '2026-11-13T07:00:00.000Z',
      end: '2026-11-13T07:30:00.000Z',
    });
  });

  it('returns today\'s window before it starts', () => {
    assert.equal(window('08:00', '08:30', '2026-11-13T06:00:00Z').start, '2026-11-13T07:00:00.000Z');
  });

  it('returns tomorrow\'s window after it ended', () => {
    assert.equal(window('08:00', '08:30', '2026-11-13T09:00:00Z').start, '2026-11-14T07:00:00.000Z');
  });

  it('returns yesterday\'s overnight window after midnight', () => {
    assert.deepEqual(window('22:00', '02:00', '2026-11-14T00:00:00Z'), {
      start: '2026-11-13T21:00:00.000Z',
      end: '2026-11-14T01:00:00.000Z',
    });
  });

  it('uses the correct offset on a DST change day', () => {
    assert.equal(window('08:00', '08:30', '2026-03-29T06:10:00Z').start, '2026-03-29T06:00:00.000Z');
  });
});
