---
description: Hoe de app binnen de NS API-rate-limits blijft, en hoe je je eigen quotum verifieert.
---

# API rate limits

## Wat NS publiceert

Officieel: niet veel. De [NS API conditions of use](https://www.ns.nl/en/travel-information/ns-api/conditions-for-use-ns-api.html) vragen alleen om "respect the capacity of the NS servers" en behouden zich het recht voor om bij misbruik je key zonder waarschuwing af te sluiten. Concrete getallen (requests per minuut / uur / dag) staan achter de login op <https://apiportal.ns.nl/> en hangen af van het product waar je op geabonneerd bent.

Om je eigen quotum te checken:

1. Log in op <https://apiportal.ns.nl/>.
2. Open **Profile → Subscriptions** en klik op je Ns-App-subscription.
3. Zoek de rate-limit / usage sectie onder dat product.

## Wat de app eraan doet

De NS-app is gebouwd om beleefd om te gaan met de API. Elke call gaat door een verharde client met:

| Mechanisme | Wat het doet |
|---|---|
| **Cache per endpoint** | Vertrekken 20s, station-storingen 30s, globale storingen 60s, reizen 15s, stationslijst 24u. |
| **In-flight coalescing** | Twee apparaten die tegelijk hetzelfde station opvragen delen één HTTP-call. |
| **Retries met backoff** | Bij `429` of `5xx` wordt tot 2× opnieuw geprobeerd met exponential backoff en jitter. |
| **`Retry-After` respect** | Als NS een `Retry-After`-header meestuurt op een `429`, wacht de client exact die tijd voordat hij retry't. |
| **±10% poll-jitter** | Elk apparaat voegt willekeurige jitter toe aan zijn poll-interval zodat 5 apparaten niet op dezelfde seconde vuren. |
| **Header-logging** | De Homey debug-log print `X-RateLimit-Remaining`, `X-RateLimit-Limit`, `X-RateLimit-Reset` en `Retry-After` voor elke response die ze meestuurt. |

## Je eigen belasting inschatten

Bij standaardinstellingen doet één Homey-installatie ongeveer:

| Setup | API-calls per uur |
|---|---|
| 1 Trajectapparaat | ~30 |
| 1 Stationapparaat | ~120 (vertrekken + storingen) |
| Globale storings-poll | 12 (gedeeld over de hele app) |
| 2 Trajecten + 2 Stations | ~310 (minus wat caching wegvouwt) |

Dit zijn bovengrenzen voordat caching en coalescing toeslaan. In de praktijk halveren twee apparaten op hetzelfde station/traject hun calls automatisch.

## De werkelijke limiet aflezen

Open de developer-logs van Homey terwijl de app draait. Je ziet regels zoals:

```
[NS] /reisinformatie-api/api/v2/departures status=200 ratelimit:
  remaining=4982 limit=5000 reset=58 retry-after=-
```

Dit is het gezaghebbende antwoord voor jouw subscription-tier. NS stuurt deze headers niet altijd mee, maar als ze er staan vertellen ze je precies waar je staat.

## Wat als je een 429 krijgt

Geen paniek — de app retry't al met `Retry-After`-respect. Zie je toch aanhoudende `429`'s in de log:

1. Verhoog **Verversingsinterval** op drukke apparaten.
2. Verminder het aantal apparaten.
3. Verifieer op apiportal.ns.nl dat je niet per ongeluk op een laag-tier product zit.
4. Als laatste redmiddel: neem contact op met NS API support via het portal.
