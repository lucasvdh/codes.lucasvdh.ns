---
description: Wat er per release is veranderd.
---

# Wijzigingsoverzicht

<details>

<summary>v0.1.0 — initieel</summary>

#### Functies

* Stationapparaat met live volgende-vertrek-capabilities en per-station storingsalarm.
* Trajectapparaat met drukte, kortere-trein-meldingen en uitval.
* Flow-triggers voor vertrekwijzigingen, vertragingen, uitval, spoorwijzigingen, drukke treinen, late-trein-waarschuwingen, en een globale "storing begonnen"-trigger.
* Flow-condities voor "is er een actieve storing bij \[station]".
* Flow-acties voor reis plannen, volgende vertrek, volgende twee treinen, volgende aankomst, en trein in tijdvenster.
* Insights-reeksen voor vertraging, uitval, storing, kortere trein en drukte.
* Ingebouwde response-caching, in-flight coalescing, exponential backoff met `Retry-After`-respect, ±10% poll-jitter, en `X-RateLimit-*` debug-logging.
* Vertalingen in het Engels, Nederlands en Duits.

</details>
