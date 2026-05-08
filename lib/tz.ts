// All NS times are in Europe/Amsterdam (CET/CEST).
// Homey/Docker may run in UTC, so we never use Date.getHours() — always
// format and compute against an explicit timezone to avoid silent drift.

export const NL_TZ = 'Europe/Amsterdam';

const wallClockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: NL_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

interface WallClockParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}

function getWallClockParts(date: Date): WallClockParts {
  const parts = wallClockFormatter.formatToParts(date);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

export function formatNlTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const { hour, minute } = getWallClockParts(d);
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function nlMinutesOfDay(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const { hour, minute } = getWallClockParts(d);
  return hour * 60 + minute;
}

// Convert an NL wall-clock moment (Y/M/D/H/M) to the corresponding UTC Date,
// DST-aware. Works by formatting a naive UTC interpretation back through the NL
// formatter and adjusting by the diff.
export function nlWallTimeToDate(year: number, month0: number, day: number, h: number, m: number): Date {
  const naive = new Date(Date.UTC(year, month0, day, h, m, 0));
  const parts = getWallClockParts(naive);
  const wantedMin = h * 60 + m;
  const tzMin = parts.hour * 60 + parts.minute;
  let diffMin = tzMin - wantedMin;
  if (diffMin > 12 * 60) diffMin -= 24 * 60;
  if (diffMin < -12 * 60) diffMin += 24 * 60;
  return new Date(naive.getTime() - diffMin * 60 * 1000);
}

// "Today's" NL wall-clock h:m as a Date — does NOT bump to tomorrow if past.
export function todayNlWallTime(h: number, m: number): Date {
  const now = new Date();
  const today = getWallClockParts(now);
  return nlWallTimeToDate(today.year, today.month - 1, today.day, h, m);
}

// Next future Date where the NL wall clock reads h:m.
// If today's h:m has already passed (in NL time), bumps to tomorrow.
export function nextNlWallTime(h: number, m: number): Date {
  const now = new Date();
  const today = getWallClockParts(now);
  let target = nlWallTimeToDate(today.year, today.month - 1, today.day, h, m);
  if (target.getTime() <= now.getTime()) {
    target = nlWallTimeToDate(today.year, today.month - 1, today.day + 1, h, m);
  }
  return target;
}

export function parseHHMM(input: string): { hours: number; minutes: number } | null {
  if (!input) return null;
  const m = input.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

// Check whether iso falls inside a [from, to] HH:MM window using NL wall-clock.
// Window crossing midnight (e.g. 22:00 → 02:00) is supported.
export function isNlIsoInWindow(iso: string, fromMin: number, toMin: number): boolean {
  const min = nlMinutesOfDay(iso);
  if (min === null) return false;
  let endMin = toMin;
  if (endMin < fromMin) endMin += 24 * 60;
  let depMin = min;
  if (depMin < fromMin) depMin += 24 * 60;
  return depMin >= fromMin && depMin <= endMin;
}
