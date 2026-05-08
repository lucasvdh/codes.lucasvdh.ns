import type Homey from 'homey';
import { getDelaySecondsForLeg, isStillUpcoming } from './ns-api';
import { formatNlTime, nextNlWallTime, parseHHMM } from './tz';
import type {
  Arrival,
  Disruption,
  Trip,
  TripFare,
  TripLeg,
  Station,
} from './types';
import type NsApp from '../app';

interface StationAutocomplete {
  name: string;
  description?: string;
  code: string;
  uicCode: string;
}

// All Flow card registration + handlers. Constructed once from app.onInit.
// Owns the disruption_started trigger card so it can be fired from outside
// (the disruption poller in NsApp).
export class FlowController {
  private app: NsApp;
  private disruptionStartedTrigger?: Homey.FlowCardTrigger;

  constructor(app: NsApp) {
    this.app = app;
  }

  private get flow() {
    return this.app.homey.flow;
  }

  register(): void {
    const trigger = this.flow.getTriggerCard('disruption_started');
    this.disruptionStartedTrigger = trigger;
    trigger.registerRunListener(
      async (args: { min_impact: string }, state: { impact: number }) => {
        const min = parseInt(args.min_impact ?? '0', 10);
        return (state?.impact ?? 0) >= min;
      },
    );

    this.flow
      .getActionCard('plan_trip')
      .registerRunListener(this.onActionPlanTrip.bind(this))
      .registerArgumentAutocompleteListener('from', this.onStationAutocomplete.bind(this))
      .registerArgumentAutocompleteListener('to', this.onStationAutocomplete.bind(this));

    this.flow
      .getActionCard('next_departure')
      .registerRunListener(this.onActionNextDeparture.bind(this))
      .registerArgumentAutocompleteListener('station', this.onStationAutocomplete.bind(this));

    this.flow
      .getActionCard('next_trains')
      .registerRunListener(this.onActionNextTrains.bind(this))
      .registerArgumentAutocompleteListener('from', this.onStationAutocomplete.bind(this))
      .registerArgumentAutocompleteListener('to', this.onStationAutocomplete.bind(this));

    this.flow
      .getActionCard('next_arrival')
      .registerRunListener(this.onActionNextArrival.bind(this))
      .registerArgumentAutocompleteListener('station', this.onStationAutocomplete.bind(this));

    this.flow
      .getActionCard('train_in_window')
      .registerRunListener(this.onActionTrainInWindow.bind(this))
      .registerArgumentAutocompleteListener('from', this.onStationAutocomplete.bind(this))
      .registerArgumentAutocompleteListener('to', this.onStationAutocomplete.bind(this));

    this.flow
      .getActionCard('trip_train_in_window')
      .registerRunListener(this.onActionTripTrainInWindow.bind(this));

    this.flow
      .getConditionCard('has_active_disruption')
      .registerRunListener(this.onConditionHasDisruption.bind(this))
      .registerArgumentAutocompleteListener('station', this.onStationAutocomplete.bind(this));

    this.flow
      .getDeviceTriggerCard('crowd_busy')
      .registerRunListener(async (args: { level: string }, state: { _rank?: number }) => {
        const min = args.level === 'high' ? 3 : 2;
        return (state?._rank ?? 0) >= min;
      });
  }

  async fireDisruptionStarted(d: Disruption): Promise<void> {
    if (!this.disruptionStartedTrigger) return;
    const impact = d.impact?.value ?? 0;
    const tokens = {
      title: d.title,
      type: d.type,
      impact,
      cause: d.timespans?.[0]?.cause?.label ?? '',
      situation: d.timespans?.[0]?.situation?.label ?? '',
      period: d.period ?? '',
      affected_stations: this.summarizeAffectedStations(d),
    };
    try {
      await this.disruptionStartedTrigger.trigger(tokens, { impact });
    } catch (e) {
      this.app.error('Failed to fire disruption_started trigger', e);
    }
  }

  private summarizeAffectedStations(d: Disruption): string {
    const names = new Set<string>();
    for (const sec of d.publicationSections ?? []) {
      for (const st of sec.section?.stations ?? []) {
        if (st.name) names.add(st.name);
      }
    }
    return Array.from(names).slice(0, 6).join(', ');
  }

  private async onStationAutocomplete(query: string): Promise<StationAutocomplete[]> {
    if (!this.app.hasApiKey()) return [];
    if (!query || query.trim().length < 2) return [];
    try {
      const stations = await this.app.getApi().searchStations(query, 15);
      return stations.map((s: Station) => ({
        name: s.namen?.lang ?? s.namen?.middel ?? s.code,
        description: `${s.code}${s.land && s.land !== 'NL' ? ` · ${s.land}` : ''}`,
        code: s.code,
        uicCode: s.UICCode,
      }));
    } catch (e) {
      this.app.error('Station autocomplete failed', e);
      return [];
    }
  }

  private requireApiKey(): void {
    if (!this.app.hasApiKey()) {
      throw new Error(this.app.homey.__('error.no_api_key'));
    }
  }

  private t(key: string, vars?: Record<string, string | number>): string {
    return this.app.homey.__(key, vars);
  }

  private async onActionPlanTrip(args: {
    from: { code: string; name: string };
    to: { code: string; name: string };
  }): Promise<Record<string, unknown>> {
    this.requireApiKey();
    const trips = await this.app.getApi().planTrip({ fromStation: args.from.code, toStation: args.to.code });
    const trip = trips.find((t) => isStillUpcoming(t.legs?.[0]?.origin?.actualDateTime || t.legs?.[0]?.origin?.plannedDateTime));
    if (!trip) throw new Error(this.t('error.no_upcoming_trips'));

    const firstLeg = trip.legs[0];
    const lastLeg = trip.legs[trip.legs.length - 1];
    const delaySec = getDelaySecondsForLeg(firstLeg);

    return {
      departure_time: formatNlTime(firstLeg.origin.actualDateTime || firstLeg.origin.plannedDateTime || ''),
      arrival_time: formatNlTime(lastLeg.destination.actualDateTime || lastLeg.destination.plannedDateTime || ''),
      duration_minutes: trip.actualDurationInMinutes ?? trip.plannedDurationInMinutes,
      transfers: trip.transfers,
      delay_minutes: Math.round(delaySec / 60),
      departure_track: firstLeg.origin.actualTrack || firstLeg.origin.plannedTrack || '',
      cancelled: trip.legs.some((l) => l.cancelled),
      price_eur: extractPriceEur(trip),
      co2_kg: trip.eco?.co2kg ?? 0,
      crowd_level: trip.crowdForecast ?? firstLeg.crowdForecast ?? 'UNKNOWN',
      booking_url: trip.bookingUrl?.uri ?? '',
    };
  }

  private async onActionNextDeparture(args: {
    station: { code: string; name: string };
    direction?: string;
  }): Promise<Record<string, unknown>> {
    this.requireApiKey();
    const departures = await this.app.getApi().getDepartures(args.station.code, 25);
    const upcoming = departures.filter((d) => isStillUpcoming(d.actualDateTime || d.plannedDateTime));
    const dirFilter = args.direction?.trim().toLowerCase();
    const match = upcoming.find((d) => {
      if (d.cancelled) return false;
      if (!dirFilter) return true;
      return d.direction?.toLowerCase().includes(dirFilter);
    }) ?? upcoming.find((d) => !d.cancelled);

    if (!match) throw new Error(this.t('error.no_upcoming_departures'));

    const planned = new Date(match.plannedDateTime).getTime();
    const actual = match.actualDateTime ? new Date(match.actualDateTime).getTime() : planned;
    const delayMin = Math.max(0, Math.round((actual - planned) / 60000));

    return {
      departure_time: formatNlTime(match.actualDateTime || match.plannedDateTime),
      destination: match.direction,
      track: match.actualTrack || match.plannedTrack || '',
      delay_minutes: delayMin,
      cancelled: match.cancelled,
      train_type: match.product?.shortCategoryName || match.trainCategory || '',
    };
  }

  private async onActionNextTrains(args: {
    from: { code: string; name: string };
    to: { code: string; name: string };
  }): Promise<Record<string, unknown>> {
    this.requireApiKey();
    const trips = await this.app.getApi().planTrip({ fromStation: args.from.code, toStation: args.to.code });
    const usable = trips
      .filter((t) => t.legs?.length)
      .filter((t) => isStillUpcoming(t.legs[0].origin.actualDateTime || t.legs[0].origin.plannedDateTime))
      .slice(0, 2);

    const empty = {
      first_departure_time: '', first_arrival_time: '', first_track: '',
      first_delay_minutes: 0, first_transfers: 0, first_cancelled: false, first_disruption: false,
      first_price_eur: 0, first_co2_kg: 0, first_crowd_level: 'UNKNOWN',
      second_departure_time: '', second_arrival_time: '', second_track: '',
      second_delay_minutes: 0, second_transfers: 0, second_cancelled: false, second_disruption: false,
      second_price_eur: 0, second_co2_kg: 0, second_crowd_level: 'UNKNOWN',
      booking_url: '',
    };

    if (usable.length === 0) {
      return { ...empty, summary: this.t('summary.no_upcoming_trains'), count: 0 };
    }

    const tokens: Record<string, unknown> = { ...empty, count: usable.length, booking_url: usable[0].bookingUrl?.uri ?? '' };
    const parts: string[] = [];
    const prefixes = ['first', 'second'] as const;

    usable.forEach((trip, i) => {
      const prefix = prefixes[i];
      const firstLeg: TripLeg = trip.legs[0];
      const lastLeg: TripLeg = trip.legs[trip.legs.length - 1];
      const dep = firstLeg.origin.actualDateTime || firstLeg.origin.plannedDateTime || '';
      const arr = lastLeg.destination.actualDateTime || lastLeg.destination.plannedDateTime || '';
      const delaySec = getDelaySecondsForLeg(firstLeg);
      const delayMin = Math.round(delaySec / 60);
      const track = firstLeg.origin.actualTrack || firstLeg.origin.plannedTrack || '';
      const cancelled = trip.legs.some((l) => l.cancelled) || trip.status === 'CANCELLED';
      const disruption = !!(trip.primaryMessage && trip.primaryMessage.type)
        || (trip.messages?.some((m) => m.type === 'DISRUPTION' || m.type === 'CALAMITY') ?? false);

      tokens[`${prefix}_departure_time`] = formatNlTime(dep);
      tokens[`${prefix}_arrival_time`] = formatNlTime(arr);
      tokens[`${prefix}_track`] = track;
      tokens[`${prefix}_delay_minutes`] = delayMin;
      tokens[`${prefix}_transfers`] = trip.transfers;
      tokens[`${prefix}_cancelled`] = cancelled;
      tokens[`${prefix}_disruption`] = disruption;
      tokens[`${prefix}_price_eur`] = extractPriceEur(trip);
      tokens[`${prefix}_co2_kg`] = trip.eco?.co2kg ?? 0;
      tokens[`${prefix}_crowd_level`] = trip.crowdForecast ?? firstLeg.crowdForecast ?? 'UNKNOWN';

      const segs: string[] = [];
      if (track) segs.push(this.t('summary.track_part', { track }));
      if (cancelled) segs.push(this.t('summary.cancelled'));
      else if (delayMin > 0) segs.push(this.t('summary.delay_part', { minutes: delayMin }));
      let part = formatNlTime(dep);
      if (segs.length) part += ` (${segs.join(', ')})`;
      parts.push(part);
    });

    tokens.summary = parts.join(` ${this.t('summary.and')} `);
    return tokens;
  }

  private async onActionNextArrival(args: {
    station: { code: string; name: string };
    origin?: string;
  }): Promise<Record<string, unknown>> {
    this.requireApiKey();
    const arrivals: Arrival[] = await this.app.getApi().getArrivals(args.station.code, 25);
    const upcoming = arrivals.filter((a) => isStillUpcoming(a.actualDateTime || a.plannedDateTime));
    const filter = args.origin?.trim().toLowerCase();
    const match = upcoming.find((a) => {
      if (a.cancelled) return false;
      if (!filter) return true;
      return (a.origin || '').toLowerCase().includes(filter);
    }) ?? upcoming.find((a) => !a.cancelled);

    if (!match) throw new Error(this.t('error.no_upcoming_arrivals'));

    const planned = new Date(match.plannedDateTime).getTime();
    const actual = match.actualDateTime ? new Date(match.actualDateTime).getTime() : planned;
    const delayMin = Math.max(0, Math.round((actual - planned) / 60000));

    return {
      arrival_time: formatNlTime(match.actualDateTime || match.plannedDateTime),
      origin: match.origin,
      track: match.actualTrack || match.plannedTrack || '',
      delay_minutes: delayMin,
      cancelled: match.cancelled,
      train_type: match.product?.shortCategoryName || match.trainCategory || '',
    };
  }

  private async onActionTrainInWindow(args: {
    from: { code: string; name: string };
    to: { code: string; name: string };
    time_from: string;
    time_to: string;
  }): Promise<Record<string, unknown>> {
    this.requireApiKey();
    return this.findTrainInWindow(args.from.code, args.to.code, args.time_from, args.time_to);
  }

  private async onActionTripTrainInWindow(args: {
    device: { getStore?: () => { fromCode?: string; toCode?: string } };
    time_from: string;
    time_to: string;
  }): Promise<Record<string, unknown>> {
    this.requireApiKey();
    const store = args.device?.getStore?.() ?? {};
    if (!store.fromCode || !store.toCode) throw new Error(this.t('error.no_trip_route'));
    return this.findTrainInWindow(store.fromCode, store.toCode, args.time_from, args.time_to);
  }

  private buildEmptyWindowTokens(reason: string): Record<string, unknown> {
    return {
      found: false,
      summary: reason,
      departure_time: '', arrival_time: '', track: '',
      delay_minutes: 0, transfers: 0, cancelled: false,
      crowd_level: 'UNKNOWN', shorter_train: false, disruption: false,
      price_eur: 0, co2_kg: 0, train_type: '',
    };
  }

  private async findTrainInWindow(
    fromCode: string,
    toCode: string,
    timeFrom: string,
    timeTo: string,
  ): Promise<Record<string, unknown>> {
    const start = parseHHMM(timeFrom);
    const end = parseHHMM(timeTo);
    if (!start || !end) {
      return this.buildEmptyWindowTokens(this.t('summary.invalid_time_format'));
    }

    const startDate = nextNlWallTime(start.hours, start.minutes);
    let endDate = nextNlWallTime(end.hours, end.minutes);
    if (endDate.getTime() <= startDate.getTime()) {
      endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    }

    const trips: Trip[] = await this.app.getApi().planTrip({
      fromStation: fromCode,
      toStation: toCode,
      dateTime: startDate.toISOString(),
    });

    const inWindow = trips.find((t) => {
      const firstLeg = t.legs?.[0];
      const dep = firstLeg?.origin?.plannedDateTime;
      if (!dep) return false;
      const ms = new Date(dep).getTime();
      return ms >= startDate.getTime() && ms <= endDate.getTime();
    });

    if (!inWindow) {
      return this.buildEmptyWindowTokens(this.t('summary.no_train_in_window', { from: timeFrom, to: timeTo }));
    }

    const firstLeg = inWindow.legs[0];
    const lastLeg = inWindow.legs[inWindow.legs.length - 1];
    const depISO = firstLeg.origin.actualDateTime || firstLeg.origin.plannedDateTime || '';
    const arrISO = lastLeg.destination.actualDateTime || lastLeg.destination.plannedDateTime || '';
    const delaySec = getDelaySecondsForLeg(firstLeg);
    const delayMin = Math.round(delaySec / 60);
    const track = firstLeg.origin.actualTrack || firstLeg.origin.plannedTrack || '';
    const cancelled = inWindow.legs.some((l) => l.cancelled) || inWindow.status === 'CANCELLED';
    const shorterStock = inWindow.legs.some((l) => l.shorterStock);
    const hasDisruption = !!(inWindow.primaryMessage && inWindow.primaryMessage.type)
      || (inWindow.messages?.some((m) => m.type === 'DISRUPTION' || m.type === 'CALAMITY') ?? false);
    const crowdLevel = inWindow.crowdForecast ?? firstLeg.crowdForecast ?? 'UNKNOWN';
    const trainType = firstLeg.product?.shortCategoryName || '';

    const segs: string[] = [];
    if (track) segs.push(this.t('summary.track_part', { track }));
    if (delayMin > 0) segs.push(this.t('summary.delay_part', { minutes: delayMin }));
    let summary = formatNlTime(depISO);
    if (segs.length) summary += ` (${segs.join(', ')})`;
    if (cancelled) summary += ` — ${this.t('summary.cancelled')}`;
    else if (crowdLevel === 'HIGH') summary += ` — ${this.t('summary.busy')}`;

    return {
      found: true,
      summary,
      departure_time: formatNlTime(depISO),
      arrival_time: formatNlTime(arrISO),
      track,
      delay_minutes: delayMin,
      transfers: inWindow.transfers,
      cancelled,
      crowd_level: crowdLevel,
      shorter_train: shorterStock,
      disruption: hasDisruption,
      price_eur: extractPriceEur(inWindow),
      co2_kg: inWindow.eco?.co2kg ?? 0,
      train_type: trainType,
    };
  }

  private async onConditionHasDisruption(args: {
    station: { code: string; name: string };
  }): Promise<boolean> {
    if (!this.app.hasApiKey()) return false;
    try {
      const list = await this.app.getApi().getStationDisruptions(args.station.code);
      return list.some((d) => d.isActive && d.type !== 'MAINTENANCE');
    } catch (e) {
      this.app.error('Disruption condition check failed', e);
      return false;
    }
  }
}

function extractPriceEur(trip: Trip): number {
  const fares = trip.fares ?? [];
  const preferred =
    fares.find((f: TripFare) => f.product === 'OVCHIPKAART_ENKELE_REIS' && f.travelClass === 'SECOND_CLASS') ??
    fares.find((f: TripFare) => f.product === 'OVCHIPKAART_ENKELE_REIS') ??
    fares[0];
  if (!preferred?.priceInCents) return 0;
  return Math.round(preferred.priceInCents) / 100;
}
