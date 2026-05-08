# API specs

OpenAPI 3 specifications for the third-party APIs this app integrates with. They are reference material — the app does not import or generate code from them at build time.

| File | Source | Used by |
|---|---|---|
| `reisinformatie-api-v1.0.yaml` | <https://apiportal.ns.nl/api-details#api=reisinformatie-api> | `lib/ns-api.ts` — departures, arrivals, trips, stations |
| `disruptions-api-v1.0.yaml` | <https://apiportal.ns.nl/api-details#api=Disruptions-Api> | `lib/ns-api.ts` — global and per-station disruptions |

## Refreshing a spec

When NS publishes a new version of the API, replace the file in this folder with the new export from the developer portal:

1. Sign in at <https://apiportal.ns.nl/>.
2. Open the relevant API → **Definition** → **Download** (OpenAPI v3, YAML).
3. Save it here, version-suffixed (e.g. `reisinformatie-api-v1.1.yaml`).
4. Delete the previous version once `lib/ns-api.ts` has been updated to match.

## Naming convention

`<api-name>-v<major>.<minor>.yaml` — keep the version in the filename so diffs across upgrades stay reviewable in git history.
