---
description: A single NL station as a Homey device.
---

# Station device

A Station device watches **all departures from one station** and exposes the next one as Homey capabilities. Add as many Station devices as stations you care about.

## Pairing

**Devices → Add device → NS → Station**.

You'll see the full list of NL stations served by NS departures. Pick one. The device is named after the station — rename it after pairing if you prefer something shorter.

## Capabilities

| Capability | Type | Meaning |
|---|---|---|
| Next departure time | text (HH:mm) | Effective time (actual if known, else planned). |
| Destination | text | Final destination of the upcoming departure. |
| Track | text | Effective track, e.g. `5a`. |
| Delay (min) | number | Minutes late, `0` if on time. |
| Disruption | alarm | On if any active disruption affects this station. |
| Cancelled | alarm | On if the next departure is cancelled. |

## Hidden Insights series

These don't appear on the device tile but are graphable in Homey Insights:

- `cancelled_value` (0/1) — numeric mirror of the cancelled alarm.
- `track_value` (number) — leading digits of the track string (`5a` → `5`).

## Settings

| Setting | Default | Min | Notes |
|---|---|---|---|
| Direction filter | empty | – | Substring match on the destination name. Case-insensitive. Empty shows all. |
| Refresh interval (s) | 60 | 60 | Each refresh makes 2 API calls (departures + disruptions). |

> **Direction filter example.** Setting it to `Utrecht` on Amsterdam Centraal limits the device to departures going to Utrecht Centraal, Utrecht Overvecht etc.

## Flow cards relevant to a Station

**Triggers**

- Next departure changed
- Next departure delayed by more than \[X] minutes
- Next departure cancelled
- Track changed

**Conditions**

- There is/isn't an active disruption at \[station] (autocomplete; the autocomplete uses the same station list).

## Example: notify when track changes

**When** *Track changed* (Station device)
**Then** *Send push: "{{destination}} now at track {{new_track}} (was {{previous_track}})"*

Useful at busy stations where the track sometimes flips minutes before departure.
