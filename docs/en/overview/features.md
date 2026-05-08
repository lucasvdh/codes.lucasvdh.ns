---
description: Everything the NS app for Homey can do.
---

# Features

## Devices

<table data-view="cards"><thead><tr><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td><strong>Station</strong></td><td>One station, one device. Live next-departure data with optional direction filter.</td><td><a href="../devices/station.md">station.md</a></td></tr><tr><td><strong>Trip</strong></td><td>One route (A→B), one device. Next train with crowdedness, transfers, cancellations and shorter-train alerts.</td><td><a href="../devices/trip.md">trip.md</a></td></tr></tbody></table>

## Capabilities

| Capability | Type | Station | Trip | In Insights |
|---|---|:-:|:-:|:-:|
| Next departure time | text | ✅ | ✅ | – |
| Destination | text | ✅ | ✅ | – |
| Track | text | ✅ | ✅ | as `track_value` |
| Delay (min) | number | ✅ | ✅ | ✅ |
| Disruption | alarm | ✅ | ✅ | ✅ |
| Cancelled | alarm | ✅ | ✅ | as `cancelled_value` |
| Shorter train | alarm | – | ✅ | ✅ |
| Crowd level | enum | – | ✅ | as `crowd_level_value` |

> Numeric "shadow" capabilities like `cancelled_value` and `crowd_level_value` are hidden from the device tile but show up as graphable series in Homey Insights.

## Flow cards

A short summary — see the full [flow card reference](../flow-cards.md) for arguments and tokens.

**Triggers**

- A disruption started (app-level).
- Next departure / next train: changed, delayed by more than X, cancelled, track changed.
- Train state changed in time window.
- Late train approaching (forensen-redder for last/second-to-last train of the night).
- Train is busy (medium / high crowd).
- Shorter train announced.

**Conditions**

- There is / isn't an active disruption at \[station].

**Actions**

- Plan a trip (A→B).
- Get next departure / next two trains / next arrival.
- Get train in time window (free A→B, or scoped to a Trip device).

## Built-in API hygiene

The app uses your own NS API subscription key, so the rate limit applies per Homey installation. To stay safely within it, the client:

- **Caches** responses per endpoint so two devices watching the same station/route share one API call.
- **Coalesces** in-flight requests — concurrent identical calls collapse to one.
- **Retries** on `429` and `5xx` with exponential backoff, honoring the `Retry-After` header.
- **Logs** `X-RateLimit-*` and `Retry-After` response headers to the Homey debug log so you can verify your quota.
- **Jitters** poll intervals by ±10% so multiple devices don't fire at the same instant.

Read more in the [rate limits guide](../guides/rate-limits.md).

## Languages

App, devices, settings, capabilities and flow cards are translated into **English**, **Nederlands** and **Deutsch**.
