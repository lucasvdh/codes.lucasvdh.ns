---
description: How the app stays within NS API rate limits — and how to verify your own quota.
---

# API rate limits

## What NS publishes

Officially: not much. The [NS API conditions of use](https://www.ns.nl/en/travel-information/ns-api/conditions-for-use-ns-api.html) only ask you to "respect the capacity of the NS servers" and reserve the right to cut off abusive keys without warning. Concrete numbers (requests per minute / hour / day) live behind the login on <https://apiportal.ns.nl/> and depend on the product you subscribed to.

To check your own quota:

1. Sign in at <https://apiportal.ns.nl/>.
2. Open **Profile → Subscriptions** and click your Ns-App subscription.
3. Look for the rate-limit / usage section under that product.

## What the app does about it

The NS app is built to be a polite citizen. Every API call goes through a hardened client that adds:

| Mechanism | What it does |
|---|---|
| **Per-endpoint cache** | Departures are cached 20 s, station-disruptions 30 s, global disruptions 60 s, trips 15 s, station list 24 h. |
| **In-flight coalescing** | Two devices asking for the same station at the same instant share one HTTP call. |
| **Retry with backoff** | On `429` or `5xx` the call retries up to 2× with exponential backoff and jitter. |
| **`Retry-After` honoring** | If NS sends a `Retry-After` header on a `429`, the client waits exactly that long before retrying. |
| **±10% poll jitter** | Each device adds random jitter to its poll interval so 5 devices don't all fire at the same second. |
| **Header logging** | The Homey debug log prints `X-RateLimit-Remaining`, `X-RateLimit-Limit`, `X-RateLimit-Reset` and `Retry-After` for every response that includes them. |

## Estimating your own load

At default settings, a single Homey installation makes roughly:

| Setup | API calls per hour |
|---|---|
| 1 Trip device | ~30 |
| 1 Station device | ~120 (departures + disruptions) |
| Global disruption poll | 12 (shared across the whole app) |
| 2 Trips + 2 Stations | ~310 (minus what caching collapses) |

These are upper bounds before caching and coalescing kick in. In practice, two devices on the same station/route halve their calls automatically.

## Reading the actual limit

Open Homey's developer logs while the app is running. You'll see lines like:

```
[NS] /reisinformatie-api/api/v2/departures status=200 ratelimit:
  remaining=4982 limit=5000 reset=58 retry-after=-
```

This is the authoritative answer for your subscription tier. NS doesn't always send these headers, but when it does, they tell you exactly where you stand.

## What to do if you hit a 429

Don't panic — the app already retries with `Retry-After`. If you see persistent `429`s in the log:

1. Increase **Refresh interval** on busy devices.
2. Reduce the number of devices.
3. Verify on apiportal.ns.nl that you didn't accidentally subscribe to a low-tier product.
4. As a last resort, contact NS API support via the portal.
