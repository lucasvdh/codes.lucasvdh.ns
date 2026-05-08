---
description: From zero to a working NS device in five minutes.
---

# Getting started

## 1 · Get an NS API key

Travel data lives behind the [NS API Developer Portal](https://apiportal.ns.nl/) and you need a personal subscription key to access it. The key is **free**.

The full click-by-click walkthrough is in its own page:

{% content-ref url="ns-api-key.md" %}
[ns-api-key.md](ns-api-key.md)
{% endcontent-ref %}

In short: register on apiportal.ns.nl, subscribe to the **Ns-App** product, and copy the **primary key** from your profile. Come back here once you have the key on your clipboard.

## 2 · Install the app and paste the key

1. Install the NS app on your Homey.
2. In the Homey app, open the NS app and tap **Configure app**.
3. Paste your subscription key into the **API key** field.
4. Tap **Test connection**. You should see a green success message.

If the test fails, double-check that you copied the **primary** key (not the secondary), and that you actually subscribed to the Ns-App product — without a subscription the key won't work.

## 3 · Pair your first device

The app ships two device types — pick whichever matches what you want to automate.

<table data-card-size="large" data-view="cards"><thead><tr><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td><strong>Station</strong></td><td>Track all departures from a single station, optionally filtered by destination text.</td><td><a href="../devices/station.md">station.md</a></td></tr><tr><td><strong>Trip</strong></td><td>Track a single A→B route. Use this if you have a regular commute.</td><td><a href="../devices/trip.md">trip.md</a></td></tr></tbody></table>

In Homey: **Devices → Add device → NS → \[Station or Trip]**.

## 4 · Build your first flow

A starting suggestion: notify yourself if your next train home is delayed.

**When**: *Next train delayed by more than \[10] minutes* (Trip device)
**Then**: *Send push notification: "Next train at {{departure_time}} is +{{delay_minutes}} min"*

See [flow cards](../flow-cards.md) for everything available.

## 5 · Tune the refresh interval (optional)

Each device has a **Refresh interval** setting:

- **Station** — default 60 s, minimum 60 s.
- **Trip** — default 120 s, minimum 120 s.

Lower means fresher data and more API calls; the minimums keep you safely within typical NS API quotas. See the [rate limits guide](rate-limits.md) for the trade-off.
