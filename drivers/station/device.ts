import Homey from 'homey';
import type NsApp from '../../app';
import type { DelayChangeState, DelayTriggerState, Departure, Disruption } from '../../lib/types';
import { getDelaySeconds, getEffectiveDateTime, getEffectiveTrack, isStillUpcoming, trackToNumber } from '../../lib/ns-api';
import { departureTimeTokens, formatNlTime } from '../../lib/tz';
import { getNsApp } from '../../lib/app-accessor';
import { describeProblem, sameStatus, type TrainProblemState, type TrainStatus } from '../../lib/train-problem';

interface DeviceStore {
  stationCode: string;
  uicCode: string;
}

interface DeviceSettings {
  direction_filter: string;
  poll_interval_seconds: number;
}

interface DepartureSnapshot {
  trainNumber: string;
  destination: string;
  plannedDateTime: string;
  effectiveDateTime: string;
  plannedTrack: string;
  actualTrack: string;
  delayMinutes: number;
  cancelled: boolean;
  trainType: string;
}

class StationDevice extends Homey.Device {
  private pollTimer?: NodeJS.Timeout;
  // Bumped on every (re)start so a refresh still in flight can't schedule a second loop.
  private pollGeneration = 0;
  // null: a warning from before a restart may still be set.
  private apiWarningShown: boolean | null = null;
  private lastSnapshot?: DepartureSnapshot;

  async onInit(): Promise<void> {
    this.log(`Station device init: ${this.getName()}`);

    for (const cap of ['alarm_cancelled', 'cancelled_value', 'track_value']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { this.error(`addCapability ${cap}`, e); }
      }
    }

    const app = getNsApp(this);
    if (!app.hasApiKey()) {
      await this.setUnavailable(this.homey.__('error.no_api_key'));
    }

    this.startPolling();
    this.refresh().catch((e) => this.error('initial refresh failed', e));
  }

  async onSettings({ changedKeys }: { changedKeys: string[] }): Promise<void> {
    if (changedKeys.includes('poll_interval_seconds')) {
      this.startPolling();
    }
    if (changedKeys.includes('direction_filter')) {
      this.lastSnapshot = undefined;
      this.refresh().catch((e) => this.error('refresh after settings change failed', e));
    }
  }

  async onUninit(): Promise<void> {
    this.stopPolling();
  }

  public async onAppApiKeyChanged(): Promise<void> {
    const app = getNsApp(this);
    if (app.hasApiKey()) {
      await this.setAvailable().catch(() => {});
      await this.refresh().catch((e) => this.error('refresh after key change failed', e));
    } else {
      await this.setUnavailable(this.homey.__('error.no_api_key')).catch(() => {});
    }
  }

  private startPolling(): void {
    this.stopPolling();
    const generation = this.pollGeneration;

    const tick = (): void => {
      this.refresh()
        .catch((e) => this.error('refresh failed', e))
        .finally(() => {
          if (generation === this.pollGeneration) this.scheduleNextPoll(tick);
        });
    };

    this.scheduleNextPoll(tick);
  }

  private stopPolling(): void {
    this.pollGeneration++;
    if (this.pollTimer) this.homey.clearTimeout(this.pollTimer);
  }

  private scheduleNextPoll(tick: () => void): void {
    const settings = this.getSettings() as DeviceSettings;
    const intervalSec = Math.max(60, settings.poll_interval_seconds || 60);
    const intervalMs = intervalSec * 1000;
    const jitterMs = (Math.random() - 0.5) * 0.2 * intervalMs;
    const next = Math.max(1000, intervalMs + jitterMs);
    this.pollTimer = this.homey.setTimeout(tick, next);
  }

  private getStationCode(): string {
    const store = this.getStore() as DeviceStore;
    if (!store?.stationCode) {
      throw new Error('Station device store missing stationCode — re-pair the device.');
    }
    return store.stationCode;
  }

  private async refresh(): Promise<void> {
    const app = getNsApp(this);
    if (!app.hasApiKey()) return;

    const api = app.getApi();
    const code = this.getStationCode();

    // On failure keep the last values; an empty list would read as "no disruptions".
    const [departures, disruptions] = await Promise.allSettled([
      api.getDepartures(code, 25),
      api.getStationDisruptions(code),
    ]);

    if (departures.status === 'fulfilled') {
      await this.updateDepartureCapabilities(departures.value);
    } else {
      this.error('getDepartures failed', departures.reason);
    }
    if (disruptions.status === 'fulfilled') {
      await this.updateDisruptionCapability(disruptions.value);
    } else {
      this.error('getStationDisruptions failed', disruptions.reason);
    }

    const failed = departures.status === 'rejected' || disruptions.status === 'rejected';
    await this.setApiWarning(failed);
  }

  private async setApiWarning(failed: boolean): Promise<void> {
    if (failed === this.apiWarningShown) return;
    this.apiWarningShown = failed;
    try {
      if (failed) await this.setWarning(this.homey.__('warning.api_unreachable'));
      else await this.unsetWarning();
    } catch (e) {
      this.error('setWarning failed', e);
    }
  }

  private async updateDepartureCapabilities(departures: Departure[]): Promise<void> {
    const settings = this.getSettings() as DeviceSettings;
    const filter = (settings.direction_filter || '').trim().toLowerCase();
    const matching = departures.filter((d) => {
      if (!isStillUpcoming(d.actualDateTime || d.plannedDateTime)) return false;
      if (!filter) return true;
      return (d.direction || '').toLowerCase().includes(filter);
    });

    // Cancelled trains stay "next" so the cancelled alarm and trigger can fire.
    const next = matching[0];

    if (!next) {
      await this.setCapabilityValueSafe('next_departure_time', '');
      await this.setCapabilityValueSafe('next_departure_destination', '');
      await this.setCapabilityValueSafe('next_departure_track', '');
      await this.setCapabilityValueSafe('next_departure_delay', 0);
      await this.setCapabilityValueSafe('alarm_cancelled', false);
      await this.setCapabilityValueSafe('cancelled_value', 0);
      await this.setCapabilityValueSafe('track_value', 0);
      return;
    }

    const delaySec = getDelaySeconds(next);
    const delayMin = Math.round(delaySec / 60);
    const effectiveTime = formatNlTime(getEffectiveDateTime(next));
    const plannedTrack = next.plannedTrack ?? '';
    const actualTrack = getEffectiveTrack(next) ?? '';
    const trainType = next.product?.shortCategoryName || next.trainCategory || '';

    await this.setCapabilityValueSafe('next_departure_time', effectiveTime);
    await this.setCapabilityValueSafe('next_departure_destination', next.direction);
    await this.setCapabilityValueSafe('next_departure_track', actualTrack);
    await this.setCapabilityValueSafe('next_departure_delay', delayMin);
    await this.setCapabilityValueSafe('alarm_cancelled', !!next.cancelled);
    await this.setCapabilityValueSafe('cancelled_value', next.cancelled ? 1 : 0);
    await this.setCapabilityValueSafe('track_value', trackToNumber(actualTrack));

    const snapshot: DepartureSnapshot = {
      trainNumber: next.product?.number || next.name,
      destination: next.direction,
      plannedDateTime: next.plannedDateTime,
      effectiveDateTime: getEffectiveDateTime(next),
      plannedTrack,
      actualTrack,
      delayMinutes: delayMin,
      cancelled: !!next.cancelled,
      trainType,
    };

    await this.checkAndFireDepartureTriggers(snapshot);
    this.lastSnapshot = snapshot;
  }

  private async checkAndFireDepartureTriggers(snapshot: DepartureSnapshot): Promise<void> {
    const prev = this.lastSnapshot;
    // The first observation only sets the baseline, so restarts don't fire triggers.
    if (!prev) return;

    const trainChanged = prev.trainNumber !== snapshot.trainNumber;
    const departureChanged = !trainChanged && (
      prev.effectiveDateTime !== snapshot.effectiveDateTime
      || prev.actualTrack !== snapshot.actualTrack
      || prev.cancelled !== snapshot.cancelled
    );

    const departureTokens = {
      departure_time: formatNlTime(snapshot.effectiveDateTime),
      ...departureTimeTokens(snapshot.plannedDateTime, snapshot.effectiveDateTime),
      destination: snapshot.destination,
      track: snapshot.actualTrack,
      delay_minutes: snapshot.delayMinutes,
      cancelled: snapshot.cancelled,
    };

    if (trainChanged) {
      this.homey.flow
        .getDeviceTriggerCard('next_departure_switched')
        .trigger(this, departureTokens)
        .catch((e) => this.error('next_departure_switched trigger failed', e));
    }

    if (departureChanged) {
      this.homey.flow
        .getDeviceTriggerCard('departure_changed')
        .trigger(this, departureTokens)
        .catch((e) => this.error('departure_changed trigger failed', e));
    }

    // The run listeners decide per Flow whether its threshold was reached.
    const previousDelay = trainChanged ? null : prev.delayMinutes;
    const delayTokens = {
      departure_time: formatNlTime(snapshot.effectiveDateTime),
      ...departureTimeTokens(snapshot.plannedDateTime, snapshot.effectiveDateTime),
      destination: snapshot.destination,
      delay_minutes: snapshot.delayMinutes,
    };

    if (snapshot.delayMinutes > 0 && snapshot.delayMinutes !== previousDelay) {
      const state: DelayTriggerState = { delayMinutes: snapshot.delayMinutes, previousDelayMinutes: previousDelay };
      this.homey.flow
        .getDeviceTriggerCard('departure_delayed')
        .trigger(this, delayTokens, state)
        .catch((e) => this.error('departure_delayed trigger failed', e));
    }

    if (snapshot.delayMinutes !== (previousDelay ?? 0)) {
      const changeState: DelayChangeState = {
        trainKey: snapshot.trainNumber,
        delayMinutes: snapshot.delayMinutes,
        previousDelayMinutes: previousDelay,
      };
      this.homey.flow
        .getDeviceTriggerCard('departure_delay_changed')
        .trigger(this, delayTokens, changeState)
        .catch((e) => this.error('departure_delay_changed trigger failed', e));
    }

    // Track changed: same train but track shifted
    if (
      !trainChanged &&
      prev.actualTrack !== snapshot.actualTrack &&
      snapshot.actualTrack !== ''
    ) {
      this.homey.flow
        .getDeviceTriggerCard('track_changed')
        .trigger(this, {
          departure_time: formatNlTime(snapshot.effectiveDateTime),
          ...departureTimeTokens(snapshot.plannedDateTime, snapshot.effectiveDateTime),
          destination: snapshot.destination,
          previous_track: prev.actualTrack,
          new_track: snapshot.actualTrack,
        })
        .catch((e) => this.error('track_changed trigger failed', e));
    }

    // Cancelled: just became cancelled
    if (snapshot.cancelled && (!prev.cancelled || trainChanged)) {
      this.homey.flow
        .getDeviceTriggerCard('departure_cancelled')
        .trigger(this, {
          departure_time: formatNlTime(snapshot.plannedDateTime),
          ...departureTimeTokens(snapshot.plannedDateTime, snapshot.effectiveDateTime),
          destination: snapshot.destination,
          train_type: snapshot.trainType,
        })
        .catch((e) => this.error('departure_cancelled trigger failed', e));
    }

    const status: TrainStatus = { delayMinutes: snapshot.delayMinutes, cancelled: snapshot.cancelled, disrupted: false };
    const previousStatus: TrainStatus | null = trainChanged
      ? null
      : { delayMinutes: prev.delayMinutes, cancelled: prev.cancelled, disrupted: false };
    if (!previousStatus || !sameStatus(status, previousStatus)) {
      const problemState: TrainProblemState = { current: status, previous: previousStatus };
      this.homey.flow
        .getDeviceTriggerCard('train_problem')
        .trigger(this, {
          ...delayTokens,
          cancelled: snapshot.cancelled,
          reason: describeProblem(status, this.homey.__.bind(this.homey)),
        }, problemState)
        .catch((e) => this.error('train_problem trigger failed', e));
    }
  }

  private async updateDisruptionCapability(disruptions: Disruption[]): Promise<void> {
    const hasActive = disruptions.some((d) => d.isActive && d.type !== 'MAINTENANCE');
    await this.setCapabilityValueSafe('alarm_disruption', hasActive);
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

module.exports = StationDevice;
