---
description: Eén NL-station als Homey-apparaat.
---

# Stationapparaat

Een Stationapparaat houdt **alle vertrekken vanaf één station** in de gaten en exposeert het volgende vertrek als Homey-capabilities. Voeg zoveel Stationapparaten toe als je stations interessant vindt.

## Koppelen

**Apparaten → Apparaat toevoegen → NS → Station**.

Je ziet de volledige lijst NL-stations die door NS worden bediend. Kies er één. Het apparaat krijgt de naam van het station — hernoem het na koppelen als je iets korters wilt.

## Capabilities

| Capability | Type | Betekenis |
|---|---|---|
| Volgende vertrektijd | tekst (UU\:mm) | Effectieve tijd (werkelijk indien bekend, anders gepland). |
| Bestemming | tekst | Eindbestemming van het komende vertrek. |
| Spoor | tekst | Effectief spoor, bijv. `5a`. |
| Vertraging (min) | nummer | Minuten te laat, `0` bij op tijd. |
| Storing | alarm | Aan als er een actieve storing dit station raakt. |
| Uitgevallen | alarm | Aan als het volgende vertrek is uitgevallen. |

## Verborgen Insights-reeksen

Deze staan niet op de tegel, maar zijn wel grafiek-baar in Homey Insights:

- `cancelled_value` (0/1) — numerieke spiegel van het uitval-alarm.
- `track_value` (nummer) — voorste cijfers van het spoor (`5a` → `5`).

## Instellingen

| Instelling | Standaard | Min | Opmerking |
|---|---|---|---|
| Richtingfilter | leeg | – | Substring-match op de bestemmingsnaam. Hoofdletterongevoelig. Leeg toont alles. |
| Verversingsinterval (s) | 60 | 60 | Elke verversing doet 2 API-calls (vertrekken + storingen). |

> **Voorbeeld richtingfilter.** Op Amsterdam Centraal beperkt `Utrecht` het apparaat tot vertrekken naar Utrecht Centraal, Utrecht Overvecht etc.

## Relevante flowkaarten voor een Station

**Triggers**

- Volgende vertrek gewijzigd
- Volgende vertrek vertraagd met meer dan \[X] minuten
- Volgende vertrek uitgevallen
- Spoor gewijzigd

**Condities**

- Er is/is geen actieve storing bij \[station] (autocomplete; gebruikt dezelfde stationslijst).

## Voorbeeld: melding bij spoorwijziging

**Wanneer** *Spoor gewijzigd* (Stationapparaat)
**Dan** *Stuur push: "{{destination}} nu op spoor {{new_track}} (was {{previous_track}})"*

Handig op drukke stations waar het spoor soms minuten voor vertrek nog wisselt.
