import Homey from 'homey';
import { NsApi } from './lib/ns-api';
import { FlowController } from './lib/flow-controller';
import type { Disruption } from './lib/types';

const DISRUPTION_POLL_MS = 5 * 60 * 1000;

class NsApp extends Homey.App {
  private api!: NsApi;
  private flowController!: FlowController;
  private knownDisruptionIds = new Set<string>();
  private disruptionInterval?: NodeJS.Timeout;

  async onInit(): Promise<void> {
    this.log('NS app initializing');

    const apiKey = (this.homey.settings.get('apiKey') as string | null) ?? '';
    this.api = new NsApi(apiKey, { log: this.log.bind(this) });

    this.homey.settings.on('set', (key: string) => {
      if (key !== 'apiKey') return;
      const newKey = (this.homey.settings.get('apiKey') as string | null) ?? '';
      this.api.setApiKey(newKey);
      this.log('API key updated');
      this.refreshDisruptions().catch((e) => this.error('disruption refresh after key change failed', e));
      this.notifyDevicesOfApiKeyChange().catch((e) => this.error('notify devices failed', e));
    });

    this.flowController = new FlowController(this);
    this.flowController.register();
    this.startDisruptionPolling();

    this.log('NS app initialized');
  }

  getApi(): NsApi {
    return this.api;
  }

  hasApiKey(): boolean {
    const k = (this.homey.settings.get('apiKey') as string | null) ?? '';
    return k.trim().length > 0;
  }

  async onUninit(): Promise<void> {
    if (this.disruptionInterval) this.homey.clearInterval(this.disruptionInterval);
  }

  private async notifyDevicesOfApiKeyChange(): Promise<void> {
    for (const driverId of ['station', 'trip']) {
      let driver: Homey.Driver;
      try {
        driver = this.homey.drivers.getDriver(driverId);
      } catch {
        continue;
      }
      for (const device of driver.getDevices()) {
        const fn = (device as unknown as { onAppApiKeyChanged?: () => Promise<void> }).onAppApiKeyChanged;
        if (typeof fn === 'function') {
          fn.call(device).catch((e: unknown) => this.error(`onAppApiKeyChanged on ${driverId}`, e));
        }
      }
    }
  }

  private startDisruptionPolling(): void {
    this.refreshDisruptions().catch((e) => this.error('initial disruption refresh failed', e));
    this.disruptionInterval = this.homey.setInterval(() => {
      this.refreshDisruptions().catch((e) => this.error('disruption refresh failed', e));
    }, DISRUPTION_POLL_MS);
  }

  private async refreshDisruptions(): Promise<void> {
    if (!this.hasApiKey()) return;

    let disruptions: Disruption[];
    try {
      disruptions = await this.api.getDisruptions(true);
    } catch (e) {
      this.error('Failed to fetch disruptions', e);
      return;
    }

    const currentIds = new Set<string>();
    for (const d of disruptions) {
      currentIds.add(d.id);
      if (!this.knownDisruptionIds.has(d.id) && this.knownDisruptionIds.size > 0) {
        await this.flowController.fireDisruptionStarted(d);
      }
    }

    this.knownDisruptionIds = currentIds;
  }
}

module.exports = NsApp;
export default NsApp;
