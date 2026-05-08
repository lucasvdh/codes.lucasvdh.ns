import Homey from 'homey';
import type { Station } from '../../lib/types';
import { getNsApp } from '../../lib/app-accessor';

interface StationEndpoint {
  code: string;
  uicCode: string;
  name: string;
  country?: string;
}

interface ListDevice {
  name: string;
  data: { id: string };
  store: { stationCode: string; uicCode: string };
  settings: { direction_filter: string; poll_interval_seconds: number };
}

class StationDriver extends Homey.Driver {
  async onInit(): Promise<void> {
    this.log('Station driver initialized');
  }

  async onPair(session: any): Promise<void> {
    let pendingStation: StationEndpoint | null = null;

    session.setHandler('search', async (query: string): Promise<StationEndpoint[]> => {
      const app = getNsApp(this);
      if (!app.hasApiKey()) throw new Error(this.homey.__('error.no_api_key'));
      if (!query || query.trim().length < 2) return [];
      try {
        const stations = await app.getApi().searchStations(query, 12);
        return stations
          .filter((s: Station) => s.code && s.namen?.lang)
          .filter((s: Station) => s.heeftVertrektijden !== false)
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

    session.setHandler('set_station', async (station: StationEndpoint) => {
      this.log('set_station received:', station?.name);
      pendingStation = station;
      return true;
    });

    session.setHandler('clear_station', async () => {
      pendingStation = null;
      return true;
    });

    session.setHandler('getDevice', async (): Promise<ListDevice> => {
      this.log('getDevice called, pendingStation:', pendingStation?.name);
      if (!pendingStation) {
        throw new Error(this.homey.__('error.pick_station_first'));
      }
      return {
        name: pendingStation.name,
        data: { id: `ns-station-${pendingStation.uicCode}` },
        store: { stationCode: pendingStation.code, uicCode: pendingStation.uicCode },
        settings: { direction_filter: '', poll_interval_seconds: 60 },
      };
    });
  }
}

module.exports = StationDriver;
