---
description: Alle flowkaarten van de NS-app, met argumenten en tokens.
---

# Flowkaarten

## Triggers

### App-niveau

#### Er is een storing begonnen

Vuurt als er een nieuwe actieve storing op het netwerk verschijnt.

- **Argument:** *Minimum impact* (nummer) — alleen vuren als de impact-waarde minstens dit is.
- **Tokens:** `title`, `type`, `cause`, `situation`, `period`, `affected_stations`, `impact`.

### Stationapparaat

#### Volgende vertrek gewijzigd

Vuurt als het komende vertrek verschuift (andere trein, andere tijd, ander spoor, of uitgevallen).

- **Tokens:** `departure_time`, `destination`, `track`, `delay_minutes`, `cancelled`.

#### Volgende vertrek vertraagd met meer dan \[X] minuten

- **Argument:** *Minuten* (nummer).
- **Tokens:** `departure_time`, `destination`, `delay_minutes`.

#### Volgende vertrek uitgevallen

- **Tokens:** `departure_time`, `destination`, `train_type`.

#### Spoor gewijzigd

Vuurt als **dezelfde** komende trein op een ander spoor wordt aangekondigd. Vuurt niet bij de eerste waarneming na koppelen.

- **Tokens:** `departure_time`, `destination`, `previous_track`, `new_track`.

### Trajectapparaat

#### Volgende trein gewijzigd / vertraagd / uitgevallen / spoor gewijzigd

Zelfde vorm als de Station-versies, maar dan voor de geconfigureerde route. De "spoor gewijzigd"-trigger meldt het vertrekspoor van het eerste traject-deel.

#### Kortere trein aangekondigd

Vuurt als NS een verkorte treinlengte voor de volgende trein aankondigt.

- **Tokens:** `departure_time`, `destination`, `warning`, `classification`.

#### Trein is minstens \[level] druk

- **Argument:** *Niveau* (`medium` of `high`).
- **Tokens:** `departure_time`, `destination`, `crowd_level`.

#### Treinstatus gewijzigd in tijdvenster

Vuurt als een trein die **tussen** de geconfigureerde tijden vertrekt, van status verandert (uitgevallen, drukker, korter, meer vertraging).

- **Argumenten:** *Vanaf tijd* (UU\:mm-picker), *Tot tijd* (UU\:mm-picker), *Activeer bij* (elke wijziging / werd uitgevallen / werd druk / werd extra druk / kortere trein aangekondigd / vertraging toegenomen).
- **Tokens:** `departure_time`, `destination`, `event`, `crowd_level`, `cancelled`, `delay_minutes`, `shorter_train`, `track`, `summary`.

#### Late trein nadert

Vuurt als de **laatste** of **één-na-laatste** trein van de avond een instelbare countdown bereikt — perfect voor "mis de laatste trein niet"-flows.

- **Argumenten:** *Welke* (`last` / `second_to_last`), *Minuten ervoor* (nummer).
- **Tokens:** `departure_time`, `destination`, `track`, `delay_minutes`, `cancelled`.

## Condities

### Er is / is geen actieve storing bij \[station]

- **Argument:** *Station* (autocomplete).
- Geeft true terug als NS een actieve, niet-onderhouds-storing voor dat station meldt.

## Acties

### Plan een reis

Vrije A→B-reisplanner.

- **Argumenten:** *Van* (autocomplete), *Naar* (autocomplete).
- **Tokens:** `departure_time`, `arrival_time`, `duration_minutes`, `transfers`, `delay_minutes`, `departure_track`, `cancelled`, `price_eur`, `co2_kg`, `crowd_level`, `booking_url`.

### Haal volgende vertrek op

- **Argumenten:** *Station* (autocomplete), *Richting* (tekst, optioneel substring-filter).
- **Tokens:** `departure_time`, `destination`, `track`, `delay_minutes`, `cancelled`, `train_type`.

### Haal volgende twee treinen op

A→B-variant van "volgende vertrek" die in één keer twee komende treinen teruggeeft.

- **Argumenten:** *Van*, *Naar* (autocomplete).
- **Tokens:** `first_*` en `second_*` per trein (vertrek/aankomst/spoor/vertraging/overstap/uitval/storing/prijs/CO₂/drukte), plus `summary`, `count`, `booking_url`.

### Haal volgende aankomst op

- **Argumenten:** *Station* (autocomplete), *Herkomst* (tekst, optioneel substring-filter op de naam van het station van herkomst).
- **Tokens:** `arrival_time`, `origin`, `track`, `delay_minutes`, `cancelled`, `train_type`.

### Haal trein op in tijdvenster

Vrije A→B-versie: geeft de eerste trein binnen het venster terug.

- **Argumenten:** *Van*, *Naar* (autocomplete), *Vanaf tijd*, *Tot tijd* (UU\:mm-picker).
- **Tokens:** `found`, `summary`, `departure_time`, `arrival_time`, `track`, `delay_minutes`, `transfers`, `cancelled`, `crowd_level`, `shorter_train`, `disruption`, `price_eur`, `co2_kg`, `train_type`.

### Haal trein op in tijdvenster (dit traject)

Zelfde als hierboven, maar de route komt van een Trajectapparaat.

- **Argumenten:** *Apparaat* (Traject), *Vanaf tijd*, *Tot tijd* (UU\:mm-picker).
- **Tokens:** identiek aan de vrije versie.
