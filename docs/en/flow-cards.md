---
description: Every flow card the NS app exposes, with arguments and tokens.
---

# Flow cards

## Triggers

### App-level

#### A disruption started

Fires when a new active disruption appears anywhere on the network.

- **Argument:** *Minimum impact* (number) — only fire if the disruption's impact value is at least this.
- **Tokens:** `title`, `type`, `cause`, `situation`, `period`, `affected_stations`, `impact`.

### Station device

#### Next departure changed

Fires when the upcoming departure shifts (different train, different time, different track, or it became cancelled).

- **Tokens:** `departure_time`, `destination`, `track`, `delay_minutes`, `cancelled`.

#### Next departure delayed by more than \[X] minutes

- **Argument:** *Minutes* (number).
- **Tokens:** `departure_time`, `destination`, `delay_minutes`.

#### Next departure cancelled

- **Tokens:** `departure_time`, `destination`, `train_type`.

#### Track changed

Fires when the **same** upcoming train switches to a different track. Doesn't fire on the first sighting after pairing.

- **Tokens:** `departure_time`, `destination`, `previous_track`, `new_track`.

### Trip device

#### Next train changed / delayed / cancelled / track changed

Same shape as the Station-device versions, scoped to the configured route. The "track changed" trigger reports the origin track of the trip's first leg.

#### Shorter train announced

Fires when NS announces the next train will run with reduced length.

- **Tokens:** `departure_time`, `destination`, `warning`, `classification`.

#### Train is at least \[level] busy

- **Argument:** *Level* (`medium` or `high`).
- **Tokens:** `departure_time`, `destination`, `crowd_level`.

#### Train state changed in time window

Fires when a train that departs **between** the configured times changes state (cancelled, busier, shorter, or more delayed).

- **Arguments:** *From time* (HH\:mm picker), *Until time* (HH\:mm picker), *Match on* (any change / became cancelled / became busy / became very busy / shorter announced / delay increased).
- **Tokens:** `departure_time`, `destination`, `event`, `crowd_level`, `cancelled`, `delay_minutes`, `shorter_train`, `track`, `summary`.

#### Late train approaching

Fires when the **last** or **second-to-last** train of the night reaches a configurable countdown — perfect for "don't miss the last train" automations.

- **Arguments:** *Which* (`last` / `second_to_last`), *Minutes before* (number).
- **Tokens:** `departure_time`, `destination`, `track`, `delay_minutes`, `cancelled`.

## Conditions

### There is / isn't an active disruption at \[station]

- **Argument:** *Station* (autocomplete).
- Returns true if NS reports any active non-maintenance disruption for that station.

## Actions

### Plan a trip

Free-form A→B trip planner.

- **Arguments:** *From* (autocomplete), *To* (autocomplete).
- **Tokens:** `departure_time`, `arrival_time`, `duration_minutes`, `transfers`, `delay_minutes`, `departure_track`, `cancelled`, `price_eur`, `co2_kg`, `crowd_level`, `booking_url`.

### Get next departure

- **Arguments:** *Station* (autocomplete), *Direction* (text, optional substring filter).
- **Tokens:** `departure_time`, `destination`, `track`, `delay_minutes`, `cancelled`, `train_type`.

### Get next two trains

A→B variant of "next departure" that returns two upcoming trains in one go.

- **Arguments:** *From*, *To* (autocomplete).
- **Tokens:** `first_*` and `second_*` per-train (departure/arrival/track/delay/transfers/cancelled/disruption/price/CO₂/crowd), plus `summary`, `count`, `booking_url`.

### Get next arrival

- **Arguments:** *Station* (autocomplete), *Origin* (text, optional substring filter on origin station name).
- **Tokens:** `arrival_time`, `origin`, `track`, `delay_minutes`, `cancelled`, `train_type`.

### Get train in time window

Free A→B version: returns the first train departing within the window.

- **Arguments:** *From*, *To* (autocomplete), *From time*, *Until time* (HH\:mm picker).
- **Tokens:** `found`, `summary`, `departure_time`, `arrival_time`, `track`, `delay_minutes`, `transfers`, `cancelled`, `crowd_level`, `shorter_train`, `disruption`, `price_eur`, `co2_kg`, `train_type`.

### Get train in time window (this route)

Same as above but takes the route from a Trip device.

- **Arguments:** *Device* (Trip), *From time*, *Until time* (HH\:mm picker).
- **Tokens:** identical to the free version.
