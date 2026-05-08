---
description: Veelgestelde vragen over de NS-app voor Homey.
---

# Veelgestelde vragen

* [Is dit een officiële NS-app?](faq.md#is-dit-een-officiele-ns-app)
* [Waarom heb ik een API-key nodig?](faq.md#waarom-heb-ik-een-api-key-nodig)
* [Hoe accuraat is de data?](faq.md#hoe-accuraat-is-de-data)
* [Loop ik tegen rate limits aan?](faq.md#loop-ik-tegen-rate-limits-aan)
* [Waarom is mijn apparaat onbereikbaar?](faq.md#waarom-is-mijn-apparaat-onbereikbaar)
* [Waarom staat een station niet in de lijst?](faq.md#waarom-staat-een-station-niet-in-de-lijst)
* [Kan ik dezelfde API-key op meerdere Homeys gebruiken?](faq.md#kan-ik-dezelfde-api-key-op-meerdere-homeys-gebruiken)

### Is dit een officiële NS-app?

Nee. Dit is een onofficiële, door de community gebouwde integratie. De app is niet gelieerd aan NS Groep N.V. Hij gebruikt de openbare NS API met je eigen subscription key.

### Waarom heb ik een API-key nodig?

NS biedt reisdata aan via een developer-portal die een gratis account en een per-gebruiker subscription key vereist. De app stuurt elk request met **jouw** key mee, wat betekent dat (1) je verbruik niet gedeeld wordt met andere gebruikers van de app, en (2) NS jouw key kan intrekken bij misbruik zonder iedereen plat te leggen.

Stap-voor-stap instructies voor het aanmaken van een account en het vinden van je key staan in [Je NS API-key ophalen](../guides/ns-api-key.md). Het is gratis.

### Hoe accuraat is de data?

Zo accuraat als NS hem publiceert. De app is een dunne client rond hun openbare API. Vertragingen, spoorwijzigingen en uitval komen uit dezelfde feed die ns.nl en de NS Reisplanner-app voedt. Drukte is een voorspelling, geen meting.

### Loop ik tegen rate limits aan?

Waarschijnlijk niet bij standaardinstellingen. NS publiceert geen exacte getallen, maar de defaults van de app (Traject 120s, Station 60s) plus de ingebouwde caching, coalescing en retry/backoff zijn ruim genoeg voor typische quota. Zie de [rate limits-handleiding](../guides/rate-limits.md) voor het volledige plaatje en hoe je tegen je eigen quotum verifieert.

### Waarom is mijn apparaat onbereikbaar?

De meest voorkomende oorzaken:

1. **Geen API-key ingesteld.** Open de **App configureren**-pagina en plak je subscription key. Apparaten komen automatisch terug zodra er een key is.
2. **De key is ingetrokken of verlopen.** Log in op <https://apiportal.ns.nl/> en check je subscription. Genereer eventueel een nieuwe key.
3. **Storing bij de NS API.** Check <https://apiportal.ns.nl/> voor status. De app blijft proberen met backoff.

### Waarom staat een station niet in de lijst?

De Station-picker gebruikt de eigen stationslijst van NS, gefilterd op NL. Internationale of niet-NS-stations verschijnen niet. Gebruik het **Traject**-apparaat met autocomplete als je een route nodig hebt waar zo'n station deel van uitmaakt — autocomplete doorzoekt de bredere stations-endpoint.

### Kan ik dezelfde API-key op meerdere Homeys gebruiken?

Technisch wel — de rate limit wordt per key bijgehouden, niet per apparaat. Twee Homeys met dezelfde key delen één quotum. Voor huishoudens met één Homey is dat prima; voor grotere setups kun je beter een aparte subscription per Homey aanmaken.
