---
description: Alles wat de NS-app voor Homey kan.
---

# Functies

## Apparaten

<table data-view="cards"><thead><tr><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td><strong>Station</strong></td><td>Eén station, één apparaat. Live volgende-vertrek-data, optioneel met richtingsfilter.</td><td><a href="../devices/station.md">station.md</a></td></tr><tr><td><strong>Traject</strong></td><td>Eén route (A→B), één apparaat. Volgende trein met drukte, overstappen, uitval en kortere-trein-meldingen.</td><td><a href="../devices/trip.md">trip.md</a></td></tr></tbody></table>

## Capabilities

| Capability | Type | Station | Traject | In Insights |
|---|---|:-:|:-:|:-:|
| Volgende vertrektijd | tekst | ✅ | ✅ | – |
| Bestemming | tekst | ✅ | ✅ | – |
| Spoor | tekst | ✅ | ✅ | als `track_value` |
| Vertraging (min) | nummer | ✅ | ✅ | ✅ |
| Storing | alarm | ✅ | ✅ | ✅ |
| Uitgevallen | alarm | ✅ | ✅ | als `cancelled_value` |
| Kortere trein | alarm | – | ✅ | ✅ |
| Drukte | enum | – | ✅ | als `crowd_level_value` |

> Numerieke "schaduw"-capabilities zoals `cancelled_value` en `crowd_level_value` zijn verborgen op de tegel maar verschijnen wel als grafiek-bare reeks in Homey Insights.

## Flowkaarten

Korte samenvatting — zie de volledige [flowkaarten-naslag](../flow-cards.md) voor argumenten en tokens.

**Triggers**

- Er is een storing begonnen (app-niveau).
- Volgende vertrek / volgende trein: gewijzigd, vertraagd met meer dan X, uitgevallen, spoor gewijzigd.
- Treinstatus gewijzigd in tijdvenster.
- Late trein nadert (forensen-redder voor laatste/één-na-laatste trein van de avond).
- Trein is druk (gemiddeld / hoog).
- Kortere trein aangekondigd.

**Condities**

- Er is / is geen actieve storing bij \[station].

**Acties**

- Plan een reis (A→B).
- Haal volgende vertrek / volgende twee treinen / volgende aankomst op.
- Haal trein op in tijdvenster (vrij A→B, of via een Trajectapparaat).

## Ingebouwde API-hygiëne

De app gebruikt jouw eigen NS API-subscription key, dus de rate limit geldt per Homey-installatie. Om daar veilig binnen te blijven doet de client:

- **Cachen** van responses per endpoint zodat twee apparaten op hetzelfde station/traject één API-call delen.
- **Coalesceren** van gelijktijdige requests — twee identieke calls tegelijk worden er één.
- **Retries** bij `429` en `5xx` met exponential backoff, met respect voor de `Retry-After` header.
- **Loggen** van `X-RateLimit-*` en `Retry-After` headers naar de Homey debug-log zodat je je quotum kunt verifiëren.
- **Jitter** van ±10% op poll-intervallen zodat meerdere apparaten niet op dezelfde seconde vuren.

Lees meer in de [rate limits-handleiding](../guides/rate-limits.md).

## Talen

App, apparaten, instellingen, capabilities en flowkaarten zijn vertaald naar **Engels**, **Nederlands** en **Duits**.
