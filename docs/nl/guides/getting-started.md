---
description: Van nul naar een werkend NS-apparaat in vijf minuten.
---

# Aan de slag

## 1 · Haal een NS API-key op

Reisdata leeft achter het [NS API Developer Portal](https://apiportal.ns.nl/) en je hebt een persoonlijke subscription key nodig om er bij te kunnen. De key is **gratis**.

De volledige klik-voor-klik handleiding heeft een eigen pagina:

{% content-ref url="ns-api-key.md" %}
[ns-api-key.md](ns-api-key.md)
{% endcontent-ref %}

In het kort: registreer op apiportal.ns.nl, abonneer op het **Ns-App** product, en kopieer de **primary key** uit je profiel. Kom hier terug zodra je de key op je klembord hebt.

## 2 · Installeer de app en plak de key

1. Installeer de NS-app op je Homey.
2. Open in de Homey-app de NS-app en tik op **App configureren**.
3. Plak je subscription key in het **API key**-veld.
4. Tik op **Verbinding testen**. Je zou een groen succesbericht moeten zien.

Lukt de test niet, controleer dan dat je de **primary** key hebt gekopieerd (niet de secondary), en dat je daadwerkelijk geabonneerd bent op het Ns-App product — zonder subscription werkt de key niet.

## 3 · Koppel je eerste apparaat

De app heeft twee apparaattypes — kies welke past bij wat je wilt automatiseren.

<table data-card-size="large" data-view="cards"><thead><tr><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td><strong>Station</strong></td><td>Volg alle vertrekken vanaf één station, eventueel gefilterd op bestemming.</td><td><a href="../devices/station.md">station.md</a></td></tr><tr><td><strong>Traject</strong></td><td>Volg één A→B-route. Gebruik dit voor je dagelijkse woon-werk-traject.</td><td><a href="../devices/trip.md">trip.md</a></td></tr></tbody></table>

In Homey: **Apparaten → Apparaat toevoegen → NS → \[Station of Traject]**.

## 4 · Bouw je eerste flow

Een suggestie om mee te beginnen: krijg een melding als je trein naar huis vertraagd is.

**Wanneer**: *Volgende trein vertraagd met meer dan \[10] minuten* (Trajectapparaat)
**Dan**: *Stuur pushbericht: "Volgende trein om {{departure_time}} is +{{delay_minutes}} min"*

Zie [flowkaarten](../flow-cards.md) voor alles wat beschikbaar is.

## 5 · Stem het ververs-interval af (optioneel)

Elk apparaat heeft een **Verversingsinterval**-instelling:

- **Station** — standaard 60 s, minimum 60 s.
- **Traject** — standaard 120 s, minimum 120 s.

Lager betekent verser data en meer API-calls; de minima houden je veilig binnen typische NS API-quota. Zie de [rate limits-handleiding](rate-limits.md) voor de afweging.
