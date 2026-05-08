---
description: Een dagelijks traject (A→B) als Homey-apparaat.
---

# Trajectapparaat

Een Trajectapparaat houdt **één route tussen twee stations** in de gaten en exposeert de volgende trein als Homey-capabilities. Gebruik er één per woon-werk-traject, schoolritje of avondreis die je interessant vindt.

In tegenstelling tot een Stationapparaat (dat alles toont wat vertrekt) begrijpt een Trajectapparaat overstappen, looptijd en routegeldigheid — een Schiphol → Groningen-reis kan dus de IC-overstap op Amersfoort meenemen.

## Koppelen

**Apparaten → Apparaat toevoegen → NS → Traject**.

Kies een **Van**- en **Naar**-station via autocomplete. Beide velden doorzoeken de volledige NS-stationslijst (NL plus Belgische/Duitse grensstations die door NS bediend worden).

> Een Trajectapparaat volgt één vaste richting. Wil je beide kanten (woon-werk 's ochtends heen, 's avonds terug), koppel dan twee Trajectapparaten — één A→B en één B→A.

## Capabilities

| Capability | Type | Betekenis |
|---|---|---|
| Volgende vertrektijd | tekst (UU\:mm) | Effectieve tijd van het eerste traject-deel. |
| Bestemming | tekst | Eindstation van de route (na overstappen). |
| Spoor | tekst | Vertrekspoor op het beginstation. |
| Vertraging (min) | nummer | Vertrekvertraging in minuten. |
| Storing | alarm | Aan als de reis een storings-/calamiteitsbericht heeft. |
| Uitgevallen | alarm | Aan als een traject-deel is uitgevallen. |
| Kortere trein | alarm | Aan als NS een verkorte treinlengte aankondigt. |
| Drukte | enum (`unknown`/`low`/`medium`/`high`) | Voorspelling voor de volgende trein. |

## Verborgen Insights-reeksen

- `cancelled_value` (0/1)
- `track_value` (nummer)
- `crowd_level_value` (0..3)

## Instellingen

| Instelling | Standaard | Min | Opmerking |
|---|---|---|---|
| Verversingsinterval (s) | 120 | 120 | Elke verversing doet 1 API-call. |

## Relevante flowkaarten voor een Traject

**Triggers**

- Volgende trein gewijzigd
- Volgende trein vertraagd met meer dan \[X] minuten
- Volgende trein uitgevallen
- Spoor gewijzigd
- Kortere trein aangekondigd
- Trein is minstens \[gemiddeld / hoog] druk
- Treinstatus gewijzigd in tijdvenster — vuurt als een trein binnen een dagelijks venster van status verandert (uitgevallen, drukker, korter, meer vertraging).
- Late trein nadert — vuurt voor de **laatste** of **één-na-laatste** trein van de avond X minuten voor vertrek. Handig voor stapavonden.

**Acties**

- Haal trein op in tijdvenster (dit traject)

## Voorbeeld: mis de laatste trein niet

**Wanneer** *Late trein nadert* met **Welke** = `last` en **Minuten ervoor** = `15` (Trajectapparaat)
**Dan** *Spreek op woonkamer-speaker: "Laatste trein naar huis over 15 minuten — spoor {{track}}, +{{delay_minutes}} min vertraging"*

De trigger vuurt één keer per trein en overleeft vertraging-updates — duwt NS het geplande vertrek 20 minuten vooruit, dan vuurt de trigger opnieuw 15 minuten voor de nieuwe tijd.
