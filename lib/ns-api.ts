import https from 'https';
import { URL } from 'url';
import type { IncomingHttpHeaders } from 'http';
import type {
  Arrival,
  ArrivalsResponse,
  Departure,
  DeparturesResponse,
  Disruption,
  Station,
  Trip,
} from './types';

const REISINFO_BASE = 'https://gateway.apiportal.ns.nl/reisinformatie-api';
const DISRUPTIONS_BASE = 'https://gateway.apiportal.ns.nl/disruptions';

// Per-endpoint cache TTLs. Tuned to coalesce duplicate calls from multiple
// devices watching the same station/route while keeping data fresh enough.
const TTL = {
  departures: 20_000,
  arrivals: 20_000,
  trips: 15_000,
  stationDisruptions: 30_000,
  globalDisruptions: 60_000,
  stationsSearch: 24 * 60 * 60_000,
  stationsByCountry: 24 * 60 * 60_000,
};

type Logger = (...args: unknown[]) => void;

interface NsApiOptions {
  log?: Logger;
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 5000,
};

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  clear(): void {
    this.store.clear();
  }
}

export class NsApiError extends Error {
  status: number;
  retryAfterMs?: number;
  constructor(status: number, message: string, retryAfterMs?: number) {
    super(message);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export class NsApi {
  private apiKey: string;
  private cache = new TtlCache();
  private inflight = new Map<string, Promise<unknown>>();
  private log: Logger;

  constructor(apiKey: string, opts: NsApiOptions = {}) {
    this.apiKey = apiKey;
    this.log = opts.log ?? (() => {});
  }

  setApiKey(apiKey: string) {
    const changed = this.apiKey !== apiKey;
    this.apiKey = apiKey;
    if (changed) {
      this.cache.clear();
      this.inflight.clear();
    }
  }

  private async cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const hit = this.cache.get<T>(key);
    if (hit !== undefined) return hit;

    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;

    const p = (async () => {
      try {
        const value = await fetcher();
        this.cache.set(key, value, ttlMs);
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, p);
    return p;
  }

  private requestRaw<T>(rawUrl: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(rawUrl);
      const options: https.RequestOptions = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        timeout: 10000,
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          Accept: 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          const status = res.statusCode ?? 0;
          this.logRateLimitHeaders(url.pathname, status, res.headers);

          if (status < 200 || status >= 300) {
            const retryAfterMs = parseRetryAfterMs(res.headers['retry-after']) ?? undefined;
            return reject(new NsApiError(status, `NS API ${status}: ${body.slice(0, 200)}`, retryAfterMs));
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch (e) {
            reject(new Error(`Failed to parse NS API response: ${(e as Error).message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error('NS API request timeout'));
      });
      req.on('error', reject);
      req.end();
    });
  }

  private logRateLimitHeaders(path: string, status: number, headers: IncomingHttpHeaders): void {
    const remaining = headers['x-ratelimit-remaining'] ?? headers['ratelimit-remaining'];
    const limit = headers['x-ratelimit-limit'] ?? headers['ratelimit-limit'];
    const reset = headers['x-ratelimit-reset'] ?? headers['ratelimit-reset'];
    const retryAfter = headers['retry-after'];
    if (remaining !== undefined || limit !== undefined || reset !== undefined || retryAfter !== undefined) {
      this.log(
        `[NS] ${path} status=${status} ratelimit:`,
        `remaining=${remaining ?? '-'} limit=${limit ?? '-'} reset=${reset ?? '-'} retry-after=${retryAfter ?? '-'}`,
      );
    }
  }

  private async request<T>(rawUrl: string, retry: RetryConfig = DEFAULT_RETRY): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retry.maxRetries; attempt++) {
      try {
        return await this.requestRaw<T>(rawUrl);
      } catch (e) {
        lastErr = e;
        if (!isRetryable(e) || attempt === retry.maxRetries) throw e;
        const wait = computeBackoff(e, attempt, retry);
        this.log(`[NS] retry ${attempt + 1}/${retry.maxRetries} after ${wait}ms (${(e as Error).message})`);
        await sleep(wait);
      }
    }
    throw lastErr;
  }

  async searchStations(query: string, limit = 10): Promise<Station[]> {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) return [];
    const url = `${REISINFO_BASE}/api/v2/stations?q=${encodeURIComponent(query)}&limit=${limit}`;
    return this.cached(`searchStations:${normalized}:${limit}`, TTL.stationsSearch, async () => {
      const res = await this.request<{ payload: Station[] }>(url);
      return res.payload ?? [];
    });
  }

  async getStationsByCountry(countryCodes = 'nl'): Promise<Station[]> {
    const url = `${REISINFO_BASE}/api/v2/stations?countryCodes=${encodeURIComponent(countryCodes)}`;
    return this.cached(`stationsByCountry:${countryCodes}`, TTL.stationsByCountry, async () => {
      const res = await this.request<{ payload: Station[] }>(url);
      return res.payload ?? [];
    });
  }

  async getDepartures(stationCode: string, maxJourneys = 10): Promise<Departure[]> {
    const url = `${REISINFO_BASE}/api/v2/departures?station=${encodeURIComponent(stationCode)}&maxJourneys=${maxJourneys}`;
    return this.cached(`departures:${stationCode}:${maxJourneys}`, TTL.departures, async () => {
      const res = await this.request<DeparturesResponse>(url);
      return res.payload?.departures ?? [];
    });
  }

  async getArrivals(stationCode: string, maxJourneys = 25): Promise<Arrival[]> {
    const url = `${REISINFO_BASE}/api/v2/arrivals?station=${encodeURIComponent(stationCode)}&maxJourneys=${maxJourneys}`;
    return this.cached(`arrivals:${stationCode}:${maxJourneys}`, TTL.arrivals, async () => {
      const res = await this.request<ArrivalsResponse>(url);
      return res.payload?.arrivals ?? [];
    });
  }

  async getDisruptions(isActive = true): Promise<Disruption[]> {
    const url = `${DISRUPTIONS_BASE}/v3?isActive=${isActive}`;
    return this.cached(`disruptions:${isActive}`, TTL.globalDisruptions, () => this.request<Disruption[]>(url));
  }

  async getStationDisruptions(stationCode: string): Promise<Disruption[]> {
    const url = `${DISRUPTIONS_BASE}/v3/station/${encodeURIComponent(stationCode)}`;
    return this.cached(`stationDisruptions:${stationCode}`, TTL.stationDisruptions, () => this.request<Disruption[]>(url));
  }

  async planTrip(params: {
    fromStation: string;
    toStation: string;
    viaStation?: string;
    dateTime?: string;
    searchForArrival?: boolean;
  }): Promise<Trip[]> {
    const qs = new URLSearchParams();
    qs.set('fromStation', params.fromStation);
    qs.set('toStation', params.toStation);
    if (params.viaStation) qs.set('viaStation', params.viaStation);
    if (params.dateTime) qs.set('dateTime', params.dateTime);
    if (params.searchForArrival) qs.set('searchForArrival', 'true');
    const url = `${REISINFO_BASE}/api/v3/trips?${qs.toString()}`;
    return this.cached(`trips:${qs.toString()}`, TTL.trips, async () => {
      const res = await this.request<{ trips: Trip[] }>(url);
      return res.trips ?? [];
    });
  }

  async testCredentials(): Promise<boolean> {
    try {
      await this.searchStations('amsterdam', 1);
      return true;
    } catch {
      return false;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfterMs(header: string | string[] | undefined): number | null {
  if (!header) return null;
  const v = Array.isArray(header) ? header[0] : header;
  const num = Number(v);
  if (Number.isFinite(num)) return Math.max(0, num) * 1000;
  const t = Date.parse(v);
  if (!Number.isNaN(t)) return Math.max(0, t - Date.now());
  return null;
}

function isRetryable(e: unknown): boolean {
  if (e instanceof NsApiError) {
    return e.status === 429 || (e.status >= 500 && e.status < 600);
  }
  return e instanceof Error;
}

function computeBackoff(e: unknown, attempt: number, opts: RetryConfig): number {
  const retryAfter = (e as { retryAfterMs?: number })?.retryAfterMs;
  if (retryAfter !== undefined && retryAfter > 0) {
    return Math.min(retryAfter, opts.maxDelayMs * 4);
  }
  const exp = Math.min(opts.baseDelayMs * 2 ** attempt, opts.maxDelayMs);
  return Math.floor(Math.random() * exp);
}

export function getDelaySeconds(d: Departure): number {
  if (!d.actualDateTime || !d.plannedDateTime) return 0;
  const planned = new Date(d.plannedDateTime).getTime();
  const actual = new Date(d.actualDateTime).getTime();
  return Math.max(0, Math.round((actual - planned) / 1000));
}

export function getEffectiveDateTime(d: Departure): string {
  return d.actualDateTime || d.plannedDateTime;
}

export function getEffectiveTrack(d: Departure): string | undefined {
  return d.actualTrack || d.plannedTrack;
}

export function getDelaySecondsForLeg(leg: { origin: { actualDateTime?: string; plannedDateTime?: string } }): number {
  const o = leg.origin;
  if (!o.actualDateTime || !o.plannedDateTime) return 0;
  return Math.max(0, Math.round((new Date(o.actualDateTime).getTime() - new Date(o.plannedDateTime).getTime()) / 1000));
}

// Returns true if the iso departure time hasn't passed yet (with a small grace
// window so a train departing this very second still counts as "next").
export function isStillUpcoming(iso: string | undefined | null, graceSeconds = 60): boolean {
  if (!iso) return false;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return false;
  return ms > Date.now() - graceSeconds * 1000;
}

export function trackToNumber(track: string | undefined | null): number {
  if (!track) return 0;
  const m = track.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}
