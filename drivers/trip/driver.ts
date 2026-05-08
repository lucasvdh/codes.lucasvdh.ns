import Homey from 'homey';
import type { Station } from '../../lib/types';
import { isNlIsoInWindow, parseHHMM } from '../../lib/tz';
import { getNsApp } from '../../lib/app-accessor';

interface RouteEndpoint {
  code: string;
  uicCode: string;
  name: string;
  country?: string;
}

interface ListDevice {
  name: string;
  data: { id: string };
  store: {
    fromCode: string;
    fromUic: string;
    fromName: string;
    toCode: string;
    toUic: string;
    toName: string;
  };
  settings: { poll_interval_seconds: number };
}

class TripDriver extends Homey.Driver {
  async onInit(): Promise<void> {
    this.log('Trip driver initialized');
    this.registerWindowStateRunListener();
    this.registerLateTrainWarningRunListener();
  }

  private registerLateTrainWarningRunListener(): void {
    this.homey.flow
      .getDeviceTriggerCard('trip_late_train_warning')
      .registerRunListener(async (
        args: { which: string; minutes_before: number },
        state: { which: string; minutesUntil: number; previousMinutesUntil: number | null },
      ) => {
        if (args.which !== state.which) return false;
        const threshold = args.minutes_before;
        const prev = state.previousMinutesUntil;
        // Fire when (first sighting OR previous was above threshold) AND current is within threshold.
        // This handles: app/device just started while already in window, AND normal threshold crossings.
        const wasAbove = prev === undefined || prev === null || prev > threshold;
        return wasAbove && state.minutesUntil <= threshold;
      });
  }

  private registerWindowStateRunListener(): void {
    this.homey.flow
      .getDeviceTriggerCard('trip_train_window_state')
      .registerRunListener(async (
        args: { time_from: string; time_to: string; condition: string },
        state: { plannedISO: string; event: string; newRank: number },
      ) => {
        const start = parseHHMM(args.time_from);
        const end = parseHHMM(args.time_to);
        if (!start || !end) return false;

        const startMin = start.hours * 60 + start.minutes;
        const endMin = end.hours * 60 + end.minutes;
        if (!isNlIsoInWindow(state.plannedISO, startMin, endMin)) return false;

        switch (args.condition) {
          case 'any':       return true;
          case 'cancelled': return state.event === 'became_cancelled';
          case 'busy':      return state.event === 'crowd_increased' && state.newRank >= 2;
          case 'very_busy': return state.event === 'crowd_increased' && state.newRank >= 3;
          case 'shorter':   return state.event === 'shorter_announced';
          case 'delayed':   return state.event === 'delay_increased';
          default:          return false;
        }
      });
  }

  async onPair(session: any): Promise<void> {
    let pendingFrom: RouteEndpoint | null = null;
    let pendingTo: RouteEndpoint | null = null;

    session.setHandler('search', async (query: string): Promise<RouteEndpoint[]> => {
      const app = getNsApp(this);
      if (!app.hasApiKey()) throw new Error('NS API key not configured. Open app settings first.');
      if (!query || query.trim().length < 2) return [];
      try {
        const stations = await app.getApi().searchStations(query, 12);
        return stations
          .filter((s: Station) => s.code && s.namen?.lang)
          .map((s: Station) => ({
            code: s.code,
            uicCode: s.UICCode,
            name: s.namen.lang,
            country: s.land,
          }));
      } catch (e) {
        this.error('Pair search failed', e);
        return [];
      }
    });

    session.setHandler('set_route', async (route: { from: RouteEndpoint; to: RouteEndpoint }) => {
      this.log('set_route received:', route?.from?.name, '->', route?.to?.name);
      pendingFrom = route.from;
      pendingTo = route.to;
      return true;
    });

    session.setHandler('clear_route', async () => {
      pendingFrom = null;
      pendingTo = null;
      return true;
    });

    session.setHandler('getDevice', async (): Promise<ListDevice> => {
      this.log('getDevice called, pendingFrom:', pendingFrom?.name, 'pendingTo:', pendingTo?.name);
      if (!pendingFrom || !pendingTo) {
        throw new Error('Pick a from and to station first.');
      }
      return {
        name: `${pendingFrom.name} → ${pendingTo.name}`,
        data: { id: `ns-trip-${pendingFrom.uicCode}-${pendingTo.uicCode}` },
        store: {
          fromCode: pendingFrom.code,
          fromUic: pendingFrom.uicCode,
          fromName: pendingFrom.name,
          toCode: pendingTo.code,
          toUic: pendingTo.uicCode,
          toName: pendingTo.name,
        },
        settings: { poll_interval_seconds: 120 },
      };
    });
  }
}

module.exports = TripDriver;
