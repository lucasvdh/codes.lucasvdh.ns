import type { DelayChangeState } from './types';

// Tracks the delay each Flow was last notified about, so small steps add up
// until the change reaches the Flow's threshold.
export class DelayChangeTracker {
  private notified = new Map<string, { trainKey: string; delayMinutes: number }>();

  shouldFire(flowKey: string, thresholdMinutes: number, state: DelayChangeState): boolean {
    const threshold = Math.max(1, Number(thresholdMinutes) || 0);
    let last = this.notified.get(flowKey);
    if (!last || last.trainKey !== state.trainKey) {
      last = { trainKey: state.trainKey, delayMinutes: state.previousDelayMinutes ?? 0 };
      this.notified.set(flowKey, last);
    }
    if (Math.abs(state.delayMinutes - last.delayMinutes) < threshold) return false;
    last.delayMinutes = state.delayMinutes;
    return true;
  }
}
