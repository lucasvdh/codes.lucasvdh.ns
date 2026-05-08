# NS App for Homey

Brings Dutch Railways (NS) into your Homey: live departures and arrivals, trip planning between two stations, disruption alerts, crowdedness, and time-window automations.

## Features

- **Station devices** — pin any NL station; live next-departure capability set (time, destination, track, delay, cancelled, disruption alarm).
- **Trip devices** — pin a route (A→B); next-train capability set with crowdedness, shorter-train alerts and cancellations.
- **Flow cards** — plan a trip, get the next departure/arrival, find a train in a time window, react to disruptions, delays, track changes, busy trains and late-night last-train warnings.
- **Insights** — log delay, cancellations, disruptions, crowd level and track over time per device.
- **Built-in caching, retry/backoff and jitter** — coalesces API calls between devices, honors `Retry-After` on rate-limit responses, logs `X-RateLimit-*` headers to debug log.

## Documentation

Full guides on [GitBook](https://github.com/lucasvdh/codes.lucasvdh.ns/tree/main/docs):

- [English documentation](docs/en/README.md)
- [Nederlandse documentatie](docs/nl/README.md)

## Setup

1. **Get an NS API key** — see the [step-by-step guide](docs/en/guides/ns-api-key.md) ([Nederlands](docs/nl/guides/ns-api-key.md)). It's free.
2. Install the app, open **Configure app**, paste the key and **Test connection**.
3. Add a **Station** or **Trip** device via **Devices → Add → NS**.

See [docs/en/guides/getting-started.md](docs/en/guides/getting-started.md) for the full walkthrough.

## Disclaimer

This is an unofficial third-party app. It is not affiliated with NS Groep N.V. Use at your own risk.

## Development

```sh
npm install
npm run build           # tsc → .homeybuild/
npx homey app validate  # structural validation
npx homey app run       # run on Homey for development
```

## API reference

- Reisinformatie API: <https://apiportal.ns.nl/api-details#api=reisinformatie-api>
- Disruptions API: <https://apiportal.ns.nl/api-details#api=Disruptions-Api>

OpenAPI specs for both APIs are vendored in [`api-specs/`](api-specs/) for offline reference.

## Contributing

Issues and pull requests welcome at <https://github.com/lucasvdh/codes.lucasvdh.ns>.

## License

[GPL-3.0-or-later](LICENSE) — you're free to use, modify and redistribute this code, including for your own Homey app, **provided that** derivative works remain open source under the same license and that the original copyright notice is preserved.
