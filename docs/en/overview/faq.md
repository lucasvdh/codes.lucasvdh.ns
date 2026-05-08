---
description: Common questions about the NS app for Homey.
---

# FAQ

* [Is this an official NS app?](faq.md#is-this-an-official-ns-app)
* [Why do I need an API key?](faq.md#why-do-i-need-an-api-key)
* [How accurate is the data?](faq.md#how-accurate-is-the-data)
* [Will I run into rate limits?](faq.md#will-i-run-into-rate-limits)
* [Why is my device unavailable?](faq.md#why-is-my-device-unavailable)
* [Why doesn't a station appear in the list?](faq.md#why-doesnt-a-station-appear-in-the-list)
* [Can I use the same API key on multiple Homeys?](faq.md#can-i-use-the-same-api-key-on-multiple-homeys)

### Is this an official NS app?

No. This is an unofficial, community-built integration. It is not affiliated with NS Groep N.V. It uses the public NS API with your own subscription key.

### Why do I need an API key?

NS exposes their travel data through a developer portal that requires a free account and a per-user subscription key. The app sends every request with **your** key, which means: (1) your usage doesn't share quota with other users of the app, and (2) NS can revoke a key if it's misused without taking down everyone else.

Step-by-step instructions for creating an account and finding your key are in [Get your NS API key](../guides/ns-api-key.md). It's free.

### How accurate is the data?

As accurate as NS publishes it. The app is a thin client around their public API. Delay minutes, track changes and cancellations come from the same feed that powers ns.nl and the NS Reisplanner app. Crowdedness is a forecast, not a measurement.

### Will I run into rate limits?

Probably not at default settings. NS doesn't publish exact numbers but the app's defaults (Trip 120s, Station 60s) plus built-in caching, coalescing and retry/backoff are sized to stay well within typical quotas. See the [rate limits guide](../guides/rate-limits.md) for the full picture and how to verify against your own quota.

### Why is my device unavailable?

The most common causes:

1. **No API key configured.** Open the app's **Configure app** page and paste your subscription key. Devices come back online automatically once a key is set.
2. **The key was revoked or expired.** Sign in at <https://apiportal.ns.nl/> and check your subscription. Regenerate the key if needed.
3. **NS API outage.** Check <https://apiportal.ns.nl/> for status. The app keeps trying with backoff.

### Why doesn't a station appear in the list?

The Station picker uses NS's own station list, filtered to NL. International or non-NS-served stops won't appear. Use the **Trip** device with autocomplete if you need a route that includes such a station — autocomplete searches the broader stations endpoint.

### Can I use the same API key on multiple Homeys?

Technically yes — the rate limit is per key, not per device. Two Homeys using the same key will share one quota. For households with one Homey this is fine; for larger setups consider creating a separate subscription per Homey.
