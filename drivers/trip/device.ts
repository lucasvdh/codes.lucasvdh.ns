import Homey from 'homey';
import type { CrowdLevel, Trip } from '../../lib/types';
import { getDelaySecondsForLeg, isStillUpcoming, trackToNumber } from '../../lib/ns-api';
import { formatNlTime, todayNlWallTime } from '../../lib/tz';
import { getNsApp } from '../../lib/app-accessor';

interface DeviceStore {
  fromCode: string;
  fromUic: string;
  fromName: string;
  toCode: string;
  toUic: string;
  toName: string;
}

interface DeviceSettings {
  poll_interval_seconds: number;
}

interface TripSnapshot {
  ctxRecon: string;
  effectiveDeparture: string;
  plannedTrack: string;
  actualTrack: string;
  delayMinutes: number;
  cancelled: boolean;
  hasDisruption: boolean;
  crowdLevel: CrowdLevel;
  shorterStock: boolean;
}

interface PerTrainSnapshot {
  cancelled: boolean;
  crowdLevel: CrowdLevel;
  shorterStock: boolean;
  delayMinutes: number;
  track: string;
  destination: string;
  effectiveDeparture: string;
}

const CROWD_RANK: Record<string, number> = { unknown: 0, low: 1, medium: 2, high: 3 };

class TripDevice extends Homey.Device {
  private pollTimer?: NodeJS.Timeout;
  private lastSnapshot?: TripSnapshot;
  private previousTrains: Map<string, PerTrainSnapshot> = new Map();
  private previousLateTrainMinutes: Map<string, number> = new Map();

  async onInit(): Promise<void> {
    this.log(`Trip device init: ${this.getName()}`);

    for (const cap of ['alarm_cancelled', 'alarm_shorter_train', 'crowd_level', 'crowd_level_value', 'cancelled_value', 'track_value']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { this.error(`addCapability ${cap}`, e); }
      }
    }

    const app = getNsApp(this);
    if (!app.hasApiKey()) {
      await this.setUnavailable('NS API key not configured. Open app settings.');
    }

    this.startPolling();
    this.refresh().catch((e) => this.error('initial refresh failed', e));
  }

  async onSettings({ changedKeys }: { changedKeys: string[] }): Promise<void> {
    if (changedKeys.includes('poll_interval_seconds')) {
      this.startPolling();
    }
  }

  async onUninit(): Promise<void> {
    if (this.pollTimer) this.homey.clearTimeout(this.pollTimer);
  }

  public async onAppApiKeyChanged(): Promise<void> {
    const app = getNsApp(this);
    if (app.hasApiKey()) {
      await this.setAvailable().catch(() => {});
      await this.refresh().catch((e) => this.error('refresh after key change failed', e));
    } else {
      await this.setUnavailable('NS API key not configured.').catch(() => {});
    }
  }


  private startPolling(): void {
    if (this.pollTimer) this.homey.clearTimeout(this.pollTimer);

    const tick = (): void => {
      this.refresh()
        .catch((e) => this.error('refresh failed', e))
        .finally(() => this.scheduleNextPoll(tick));
    };

    this.scheduleNextPoll(tick);
  }

  private scheduleNextPoll(tick: () => void): void {
    const settings = this.getSettings() as DeviceSettings;
    const intervalSec = Math.max(120, settings.poll_interval_seconds || 120);
    const intervalMs = intervalSec * 1000;
    const jitterMs = (Math.random() - 0.5) * 0.2 * intervalMs;
    const next = Math.max(1000, intervalMs + jitterMs);
    this.pollTimer = this.homey.setTimeout(tick, next);
  }

  private getActiveRoute(): { fromCode: string; toCode: string } {
    const store = this.getStore() as DeviceStore;
    if (!store?.fromCode || !store?.toCode) {
      throw new Error('Trip device store missing fromCode/toCode — re-pair the device.');
    }
    return { fromCode: store.fromCode, toCode: store.toCode };
  }

  private async refresh(): Promise<void> {
    const app = getNsApp(this);
    if (!app.hasApiKey()) return;

    const route = this.getActiveRoute();
    let trips: Trip[];
    try {
      trips = await app.getApi().planTrip({ fromStation: route.fromCode, toStation: route.toCode });
    } catch (e) {
      this.error('planTrip failed', e);
      return;
    }

    await this.updateCapabilities(trips);
    await this.checkPerTrainStateChanges(trips);
    await this.checkLateTrainWarnings(route);
  }

  private async checkLateTrainWarnings(route: { fromCode: string; toCode: string }): Promise<void> {
    const app = getNsApp(this);
    if (!app.hasApiKey()) return;

    // Only relevant in the evening / overnight window. Skips morning + afternoon
    // polls entirely so we don't waste API budget when no late trains matter.
    const nlHour = parseInt(
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hour12: false })
        .format(new Date()),
      10,
    );
    if (nlHour >= 4 && nlHour < 17) {
      this.previousLateTrainMinutes.clear();
      return;
    }

    const eveningAnchor = todayNlWallTime(23, 30);
    const cutoff = todayNlWallTime(28, 0); // tomorrow 04:00 NL local
    const now = Date.now();

    let lateTrips: Trip[];
    try {
      lateTrips = await app.getApi().planTrip({
        fromStation: route.fromCode,
        toStation: route.toCode,
        dateTime: eveningAnchor.toISOString(),
      });
    } catch (e) {
      this.error('late train fetch failed', e);
      return;
    }

    const upcoming = lateTrips
      .filter((t) => {
        const dep = t.legs?.[0]?.origin?.plannedDateTime;
        if (!dep) return false;
        const ms = new Date(dep).getTime();
        return ms > now && ms <= cutoff.getTime();
      })
      .sort((a, b) => {
        const aMs = new Date(a.legs[0].origin.plannedDateTime!).getTime();
        const bMs = new Date(b.legs[0].origin.plannedDateTime!).getTime();
        return bMs - aMs;
      });

    this.log(`late check: anchor=${eveningAnchor.toISOString()} cutoff=${cutoff.toISOString()} upcoming=${upcoming.length}`);

    const last = upcoming[0];
    const secondToLast = upcoming[1];

    if (last) await this.fireLateWarningIfApproaching('last', last);
    if (secondToLast) await this.fireLateWarningIfApproaching('second_to_last', secondToLast);

    // Drop entries for trains we're no longer tracking (departed or replaced
    // by a later schedule), keeping the map size bounded.
    const liveKeys = new Set<string>();
    if (last?.legs?.[0]?.origin?.plannedDateTime) liveKeys.add(`last:${last.legs[0].origin.plannedDateTime}`);
    if (secondToLast?.legs?.[0]?.origin?.plannedDateTime) liveKeys.add(`second_to_last:${secondToLast.legs[0].origin.plannedDateTime}`);
    for (const k of this.previousLateTrainMinutes.keys()) {
      if (!liveKeys.has(k)) this.previousLateTrainMinutes.delete(k);
    }
  }

  private async fireLateWarningIfApproaching(which: 'last' | 'second_to_last', trip: Trip): Promise<void> {
    const firstLeg = trip.legs[0];
    const lastLeg = trip.legs[trip.legs.length - 1];
    const depISO = firstLeg.origin.plannedDateTime || '';
    if (!depISO) return;
    const depMs = new Date(depISO).getTime();
    const minutesUntil = Math.max(0, Math.floor((depMs - Date.now()) / 60000));

    const key = `${which}:${depISO}`;
    const prev = this.previousLateTrainMinutes.get(key);
    this.previousLateTrainMinutes.set(key, minutesUntil);

    this.log(`late ${which}: dep=${formatNlTime(depISO)} minutesUntil=${minutesUntil} prev=${prev ?? '(first)'}`);

    // Skip only if we already saw this train and it's not approaching closer.
    // Fire on first sighting too — runListener decides per Flow whether to actually trigger.
    if (prev !== undefined && minutesUntil >= prev) return;

    const cancelled = trip.legs.some((l) => l.cancelled) || trip.status === 'CANCELLED';
    const delaySec = getDelaySecondsForLeg(firstLeg);
    const delayMin = Math.round(delaySec / 60);
    const track = firstLeg.origin.actualTrack || firstLeg.origin.plannedTrack || '';
    const destination = lastLeg.destination.name || '';
    const depTime = formatNlTime(firstLeg.origin.actualDateTime || depISO);
    const label = this.homey.__(which === 'last' ? 'summary.last_train_tonight' : 'summary.second_to_last_train_tonight');
    const summary = this.homey.__('summary.departs_in', { time: depTime, label, minutes: minutesUntil });

    try {
      await this.homey.flow
        .getDeviceTriggerCard('trip_late_train_warning')
        .trigger(this, {
          departure_time: depTime,
          destination,
          track,
          delay_minutes: delayMin,
          cancelled,
          which,
          minutes_until: minutesUntil,
          summary,
        }, {
          which,
          minutesUntil,
          previousMinutesUntil: prev ?? null,
          plannedISO: depISO,
        });
    } catch (e) {
      this.error('trip_late_train_warning trigger failed', e);
    }
  }

  private async checkPerTrainStateChanges(trips: Trip[]): Promise<void> {
    const newMap = new Map<string, PerTrainSnapshot>();

    for (const trip of trips) {
      const firstLeg = trip.legs?.[0];
      const lastLeg = trip.legs?.[trip.legs.length - 1];
      if (!firstLeg || !lastLeg) continue;
      const key = firstLeg.origin.plannedDateTime;
      if (!key) continue;

      const delaySec = getDelaySecondsForLeg(firstLeg);
      const snap: PerTrainSnapshot = {
        cancelled: trip.legs.some((l) => l.cancelled) || trip.status === 'CANCELLED',
        crowdLevel: (trip.crowdForecast || firstLeg.crowdForecast || 'UNKNOWN') as CrowdLevel,
        shorterStock: trip.legs.some((l) => l.shorterStock),
        delayMinutes: Math.round(delaySec / 60),
        track: firstLeg.origin.actualTrack || firstLeg.origin.plannedTrack || '',
        destination: lastLeg.destination.name || '',
        effectiveDeparture: firstLeg.origin.actualDateTime || key,
      };
      newMap.set(key, snap);

      const prev = this.previousTrains.get(key);
      if (!prev) continue; // first sighting — don't fire to avoid noise on startup

      const events: string[] = [];
      if (snap.cancelled && !prev.cancelled) events.push('became_cancelled');
      const newRank = CROWD_RANK[snap.crowdLevel.toLowerCase()] ?? 0;
      const prevRank = CROWD_RANK[prev.crowdLevel.toLowerCase()] ?? 0;
      if (newRank > prevRank) events.push('crowd_increased');
      if (snap.shorterStock && !prev.shorterStock) events.push('shorter_announced');
      if (snap.delayMinutes > prev.delayMinutes && snap.delayMinutes > 0) events.push('delay_increased');

      for (const event of events) {
        await this.fireTrainWindowStateTrigger(key, snap, event);
      }
    }

    this.previousTrains = newMap;
  }

  private async fireTrainWindowStateTrigger(
    plannedISO: string,
    snap: PerTrainSnapshot,
    event: string,
  ): Promise<void> {
    const depTime = formatNlTime(snap.effectiveDeparture);
    let suffix = '';
    if (event === 'became_cancelled') suffix = this.homey.__('summary.event_cancelled');
    else if (event === 'crowd_increased') suffix = this.homey.__('summary.event_now_crowd', { level: snap.crowdLevel.toLowerCase() });
    else if (event === 'shorter_announced') suffix = this.homey.__('summary.event_shorter_announced');
    else if (event === 'delay_increased') suffix = this.homey.__('summary.event_delay_increased', { minutes: snap.delayMinutes });
    const summary = `${depTime} ${suffix}`.trim();

    try {
      await this.homey.flow
        .getDeviceTriggerCard('trip_train_window_state')
        .trigger(this, {
          departure_time: depTime,
          destination: snap.destination,
          event,
          crowd_level: snap.crowdLevel,
          cancelled: snap.cancelled,
          delay_minutes: snap.delayMinutes,
          shorter_train: snap.shorterStock,
          track: snap.track,
          summary,
        }, {
          plannedISO,
          event,
          newRank: CROWD_RANK[snap.crowdLevel.toLowerCase()] ?? 0,
        });
    } catch (e) {
      this.error('trip_train_window_state trigger failed', e);
    }
  }

  private async updateCapabilities(trips: Trip[]): Promise<void> {
    const upcoming = trips.filter((t) => {
      const dep = t.legs?.[0]?.origin?.actualDateTime || t.legs?.[0]?.origin?.plannedDateTime;
      return isStillUpcoming(dep);
    });
    const next = upcoming.find((t) => t.status !== 'CANCELLED') ?? upcoming[0];

    if (!next || !next.legs?.length) {
      await this.setCapabilityValueSafe('next_departure_time', '');
      await this.setCapabilityValueSafe('next_departure_track', '');
      await this.setCapabilityValueSafe('next_departure_delay', 0);
      await this.setCapabilityValueSafe('alarm_disruption', false);
      await this.setCapabilityValueSafe('alarm_cancelled', false);
      await this.setCapabilityValueSafe('alarm_shorter_train', false);
      await this.setCapabilityValueSafe('crowd_level', 'unknown');
      await this.setCapabilityValueSafe('crowd_level_value', 0);
      await this.setCapabilityValueSafe('cancelled_value', 0);
      await this.setCapabilityValueSafe('track_value', 0);
      return;
    }

    const firstLeg = next.legs[0];
    const lastLeg = next.legs[next.legs.length - 1];
    const planned = firstLeg.origin.plannedDateTime ?? '';
    const effective = firstLeg.origin.actualDateTime || planned;
    const delaySec = getDelaySecondsForLeg(firstLeg);
    const delayMin = Math.round(delaySec / 60);
    const plannedTrack = firstLeg.origin.plannedTrack ?? '';
    const actualTrack = firstLeg.origin.actualTrack || plannedTrack;
    const cancelled = next.legs.some((l) => l.cancelled) || next.status === 'CANCELLED';
    const hasDisruption = !!(next.primaryMessage && next.primaryMessage.type)
      || (next.messages?.some((m) => m.type === 'DISRUPTION' || m.type === 'CALAMITY') ?? false);
    const crowdLevel = (next.crowdForecast || firstLeg.crowdForecast || 'UNKNOWN') as CrowdLevel;
    const shorterLeg = next.legs.find((l) => l.shorterStock);
    const shorterStock = !!shorterLeg;
    const shorterClassification = shorterLeg?.shorterStockClassification ?? '';
    const shorterWarning = shorterLeg?.shorterStockWarning ?? '';

    await this.setCapabilityValueSafe('next_departure_time', formatNlTime(effective));
    await this.setCapabilityValueSafe('next_departure_track', actualTrack);
    await this.setCapabilityValueSafe('next_departure_delay', delayMin);
    await this.setCapabilityValueSafe('alarm_disruption', hasDisruption);
    await this.setCapabilityValueSafe('alarm_cancelled', cancelled);
    await this.setCapabilityValueSafe('cancelled_value', cancelled ? 1 : 0);
    await this.setCapabilityValueSafe('alarm_shorter_train', shorterStock);
    await this.setCapabilityValueSafe('track_value', trackToNumber(actualTrack));
    const crowdLow = crowdLevel.toLowerCase();
    await this.setCapabilityValueSafe('crowd_level', crowdLow);
    await this.setCapabilityValueSafe('crowd_level_value', CROWD_RANK[crowdLow] ?? 0);

    const snapshot: TripSnapshot = {
      ctxRecon: next.ctxRecon,
      effectiveDeparture: effective,
      plannedTrack,
      actualTrack,
      delayMinutes: delayMin,
      cancelled,
      hasDisruption,
      crowdLevel,
      shorterStock,
    };

    await this.fireTriggersIfChanged(snapshot, lastLeg.destination.name || '', { shorterClassification, shorterWarning });
    this.lastSnapshot = snapshot;
  }

  private async fireTriggersIfChanged(
    snapshot: TripSnapshot,
    destination: string,
    extras: { shorterClassification: string; shorterWarning: string },
  ): Promise<void> {
    const prev = this.lastSnapshot;
    const trainChanged = !prev || prev.ctxRecon !== snapshot.ctxRecon;

    const tripChanged =
      !prev ||
      trainChanged ||
      prev.effectiveDeparture !== snapshot.effectiveDeparture ||
      prev.actualTrack !== snapshot.actualTrack ||
      prev.cancelled !== snapshot.cancelled;

    if (tripChanged) {
      this.homey.flow
        .getDeviceTriggerCard('trip_departure_changed')
        .trigger(this, {
          departure_time: formatNlTime(snapshot.effectiveDeparture),
          destination,
          track: snapshot.actualTrack,
          delay_minutes: snapshot.delayMinutes,
          cancelled: snapshot.cancelled,
        })
        .catch((e) => this.error('trip_departure_changed trigger failed', e));
    }

    if (snapshot.delayMinutes > 0 && (!prev || prev.delayMinutes !== snapshot.delayMinutes)) {
      this.homey.flow
        .getDeviceTriggerCard('trip_departure_delayed')
        .trigger(this, {
          departure_time: formatNlTime(snapshot.effectiveDeparture),
          destination,
          delay_minutes: snapshot.delayMinutes,
        }, { minutes: snapshot.delayMinutes })
        .catch((e) => this.error('trip_departure_delayed trigger failed', e));
    }

    if (
      prev &&
      !trainChanged &&
      prev.actualTrack !== snapshot.actualTrack &&
      snapshot.actualTrack !== ''
    ) {
      this.homey.flow
        .getDeviceTriggerCard('trip_track_changed')
        .trigger(this, {
          departure_time: formatNlTime(snapshot.effectiveDeparture),
          destination,
          previous_track: prev.actualTrack,
          new_track: snapshot.actualTrack,
        })
        .catch((e) => this.error('trip_track_changed trigger failed', e));
    }

    if (snapshot.cancelled && (!prev || !prev.cancelled || trainChanged)) {
      this.homey.flow
        .getDeviceTriggerCard('trip_cancelled')
        .trigger(this, {
          departure_time: formatNlTime(snapshot.effectiveDeparture),
          destination,
        })
        .catch((e) => this.error('trip_cancelled trigger failed', e));
    }

    if (snapshot.shorterStock && (!prev || !prev.shorterStock || trainChanged)) {
      this.homey.flow
        .getDeviceTriggerCard('shorter_train')
        .trigger(this, {
          departure_time: formatNlTime(snapshot.effectiveDeparture),
          destination,
          warning: extras.shorterWarning,
          classification: extras.shorterClassification,
        })
        .catch((e) => this.error('shorter_train trigger failed', e));
    }

    const crowdLow = snapshot.crowdLevel.toLowerCase();
    const prevCrowdLow = prev?.crowdLevel.toLowerCase() ?? 'unknown';
    if (
      (CROWD_RANK[crowdLow] ?? 0) >= CROWD_RANK.medium &&
      (trainChanged || crowdLow !== prevCrowdLow)
    ) {
      this.homey.flow
        .getDeviceTriggerCard('crowd_busy')
        .trigger(this, {
          departure_time: formatNlTime(snapshot.effectiveDeparture),
          destination,
          crowd_level: snapshot.crowdLevel,
        }, { level: crowdLow, _rank: CROWD_RANK[crowdLow] })
        .catch((e) => this.error('crowd_busy trigger failed', e));
    }
  }

  private async setCapabilityValueSafe(capability: string, value: unknown): Promise<void> {
    if (!this.hasCapability(capability)) return;
    try {
      await this.setCapabilityValue(capability, value as never);
    } catch (e) {
      this.error(`setCapabilityValue ${capability} failed`, e);
    }
  }

}

module.exports = TripDevice;
export default TripDevice;
