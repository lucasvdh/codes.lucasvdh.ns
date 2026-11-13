export interface TrainStatus {
  delayMinutes: number;
  cancelled: boolean;
  disrupted: boolean;
}

// previous is null for a train that just became the next one.
export interface TrainProblemState {
  current: TrainStatus;
  previous: TrainStatus | null;
}

export function hasProblem(thresholdMinutes: number, status: TrainStatus): boolean {
  return status.cancelled || status.disrupted || status.delayMinutes > (Number(thresholdMinutes) || 0);
}

export function becameProblematic(thresholdMinutes: number, state: TrainProblemState): boolean {
  if (!hasProblem(thresholdMinutes, state.current)) return false;
  return state.previous === null || !hasProblem(thresholdMinutes, state.previous);
}

export function sameStatus(a: TrainStatus, b: TrainStatus): boolean {
  return a.delayMinutes === b.delayMinutes && a.cancelled === b.cancelled && a.disrupted === b.disrupted;
}

export function describeProblem(
  status: TrainStatus,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (status.cancelled) return t('summary.cancelled');
  const parts: string[] = [];
  if (status.delayMinutes > 0) parts.push(t('summary.delay_part', { minutes: status.delayMinutes }));
  if (status.disrupted) parts.push(t('summary.disruption'));
  return parts.join(', ');
}
