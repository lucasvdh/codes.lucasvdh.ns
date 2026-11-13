import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { becameProblematic, describeProblem, type TrainStatus } from '../lib/train-problem';

const status = (delayMinutes: number, cancelled = false, disrupted = false): TrainStatus => (
  { delayMinutes, cancelled, disrupted }
);

describe('becameProblematic', () => {
  it('fires when the delay goes above the threshold', () => {
    assert.equal(becameProblematic(5, { current: status(6), previous: status(4) }), true);
  });

  it('fires on cancellation and disruption, whatever the delay', () => {
    assert.equal(becameProblematic(5, { current: status(0, true), previous: status(0) }), true);
    assert.equal(becameProblematic(5, { current: status(0, false, true), previous: status(0) }), true);
  });

  it('does not fire again while the train stays problematic', () => {
    assert.equal(becameProblematic(5, { current: status(9), previous: status(6) }), false);
    assert.equal(becameProblematic(5, { current: status(9, true), previous: status(6) }), false);
  });

  it('fires for a new train that already has a problem', () => {
    assert.equal(becameProblematic(5, { current: status(7), previous: null }), true);
    assert.equal(becameProblematic(5, { current: status(2), previous: null }), false);
  });
});

describe('describeProblem', () => {
  const t = (key: string, vars?: Record<string, string | number>) => (vars ? `${key}:${vars.minutes}` : key);

  it('reports a cancellation on its own', () => {
    assert.equal(describeProblem(status(12, true, true), t), 'summary.cancelled');
  });

  it('combines delay and disruption', () => {
    assert.equal(describeProblem(status(12, false, true), t), 'summary.delay_part:12, summary.disruption');
  });
});
