// Typed accessor for the NS app instance from a driver/device context.
// Centralizes the `as NsApp` cast that would otherwise be sprinkled around.

import type Homey from 'homey';
import type NsApp from '../app';

export function getNsApp(holder: Homey.Device | Homey.Driver | Homey.App): NsApp {
  const app = (holder as { homey?: { app?: unknown }; app?: unknown }).homey?.app
    ?? (holder as { app?: unknown }).app;
  return app as NsApp;
}
