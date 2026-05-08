---
description: A daily route (A→B) as a Homey device.
---

# Trip device

A Trip device watches **a single route between two stations** and exposes the next train as Homey capabilities. Use one for each commute, school run, or evening trip you care about.

Unlike a Station device (which lists everything that leaves), a Trip device understands transfers, walking time, and route validity — so a Schiphol → Groningen trip can include the IC change at Amersfoort.

## Pairing

**Devices → Add device → NS → Trip**.

Pick a **From** and **To** station via autocomplete. Both fields search the full NS station list (NL + Belgian/German border stations served by NS).

> A Trip device tracks one fixed direction. If you want both ways (commute out in the morning, back in the evening), pair two Trip devices — one A→B, one B→A.

## Capabilities

| Capability | Type | Meaning |
|---|---|---|
| Next departure time | text (HH:mm) | Effective time of the first leg. |
| Destination | text | End-of-route station (after transfers). |
| Track | text | Departure track at the origin. |
| Delay (min) | number | Departure delay in minutes. |
| Disruption | alarm | On if the trip carries a disruption/calamity message. |
| Cancelled | alarm | On if any leg of the trip is cancelled. |
| Shorter train | alarm | On if NS announced reduced train length. |
| Crowd level | enum (`unknown`/`low`/`medium`/`high`) | Forecast for the next train. |

## Hidden Insights series

- `cancelled_value` (0/1)
- `track_value` (number)
- `crowd_level_value` (0..3)

## Settings

| Setting | Default | Min | Notes |
|---|---|---|---|
| Refresh interval (s) | 120 | 120 | Each refresh makes 1 API call. |

## Flow cards relevant to a Trip

**Triggers**

- Next train changed
- Next train delayed by more than \[X] minutes
- Next train cancelled
- Track changed
- Shorter train announced
- Train is at least \[medium / high] busy
- Train state changed in time window — fires when a train within a daily window changes (cancelled, became busy, shorter, more delay).
- Late train approaching — fires for the **last** or **second-to-last** train of the night X minutes before departure. Handy for nights out.

**Actions**

- Get train in time window (this route)

## Example: don't miss the last train

**When** *Late train approaching* with **Which** = `last` and **Minutes before** = `15` (Trip device)
**Then** *Speak on living room speaker: "Last train home in 15 minutes — track {{track}}, +{{delay_minutes}} min delay"*

The trigger fires once per train and survives delay updates — if NS pushes the planned departure 20 minutes later, the trigger fires again 15 minutes before the new time.
