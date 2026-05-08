---
description: What's changed across releases.
---

# Changelog

<details>

<summary>v0.1.0 — initial</summary>

#### Features

* Station device with live next-departure capabilities and per-station disruption alarm.
* Trip device with crowdedness, shorter-train alerts and cancellations.
* Flow triggers for departure changes, delays, cancellations, track changes, busy trains, late-train warnings, and a global "disruption started" trigger.
* Flow conditions for "is there an active disruption at \[station]".
* Flow actions for plan a trip, next departure, next two trains, next arrival, and train in a time window.
* Insights series for delay, cancelled, disruption, shorter-train and crowd level.
* Built-in response caching, in-flight coalescing, exponential backoff with `Retry-After` support, ±10% poll jitter, and `X-RateLimit-*` debug logging.
* English, Nederlands and Deutsch translations.

</details>
