---
description: Stap voor stap — NS-account aanmaken, abonneren op de API, en je key kopiëren.
---

# Je NS API-key ophalen

Voordat je deze app kunt gebruiken heb je een persoonlijke **subscription key** voor de NS API nodig. De key is gratis en je hebt hem in ongeveer vijf minuten geregeld. Deze pagina loodst je er klik voor klik doorheen.

> {% hint style="info" %}
> De NS API draait op Microsoft Azure API Management. Je subscription key is wat NS gebruikt om _jouw_ verbruik te identificeren en je rate limit te bepalen. Houd hem privé — iedereen met je key kan jouw quotum opmaken.
> {% endhint %}

## Stap 1 · Account aanmaken op het NS Developer Portal

1. Open <https://apiportal.ns.nl/> in je browser.
2. Klik rechtsboven op **Sign up**.
3. Vul het registratieformulier in:
   - **Email address** — gebruik een mailadres dat je kunt checken; je krijgt een bevestigingsmail.
   - **Password** — kies een sterk wachtwoord.
   - **First name** en **Last name** — je echte naam is prima.
   - **Company** — verplicht veld. Voor privégebruik kun je bijvoorbeeld `Persoonlijk gebruik` of je eigen naam invullen.
4. Klik onderaan op **Sign up**.
5. Open de **bevestigingsmail** die NS je stuurt en klik op de verificatielink. Zonder deze stap is je account niet actief.
6. Ga terug naar <https://apiportal.ns.nl/> en klik op **Sign in** om in te loggen.

> Als de bevestigingsmail niet binnen een paar minuten binnenkomt, kijk dan in je spam-folder. Je kunt vanaf de inlogpagina een nieuwe aanvragen.

## Stap 2 · Abonneer je op het Ns-App product

Het portal groepeert API's in _products_. Het gratis product dat vertrekken, reizen en storingen bevat heet **Ns-App**.

1. Zorg dat je bent ingelogd (je e-mailadres staat rechtsboven).
2. Klik in de bovenbalk op **Products**.
3. Zoek **Ns-App** in de productenlijst en klik erop.
4. Klik op de productpagina op de **Subscribe**-knop.
5. Geef het abonnement een herkenbare naam (bijvoorbeeld `Homey`) en klik op **Confirm**.

In de meeste gevallen wordt het abonnement direct goedgekeurd. Soms vraagt NS om kort te wachten op handmatige goedkeuring — je krijgt dan een e-mail zodra het actief is.

> {% hint style="warning" %}
> Als je niet abonneert, bestaat je key wel maar **retourneert hij bij elke call een fout**. De key werkt alleen tegen products waar je actief op geabonneerd bent.
> {% endhint %}

## Stap 3 · Kopieer je primary key

1. Klik **rechtsboven op je naam of e-mail** → **Profile**.
2. Scroll naar de sectie **Subscriptions**.
3. Zoek je **Ns-App**-abonnement.
4. Klik naast **Primary key** op **Show**.
5. Klik op **Copy** (of selecteer en kopieer handmatig).

Je hebt nu een lange alfanumerieke tekenreeks op je klembord — dat is je key. Hij ziet eruit als:

```
a1b2c3d4e5f6...  (ongeveer 32 tekens)
```

> Elk abonnement heeft een **primary** en een **secondary** key. Ze zijn gelijkwaardig — beide werken. Het systeem met twee keys bestaat zodat je zonder onderbreking kunt rouleren: plak de secondary ergens anders, regenereer de primary, en wissel ze om. Voor eenmalig gebruik pak je gewoon de primary.

## Stap 4 · Plak hem in de Homey-app

1. Open de Homey-app op je telefoon.
2. Open de **NS-app** → **App configureren**.
3. Plak de key in het **API key**-veld.
4. Tik op **Verbinding testen**.
5. Je zou een groene bevestiging moeten zien. Klaar.

Lukt de test niet, zie dan het [probleemoplossen](#probleemoplossen) hieronder.

## Probleemoplossen

**"Verbinding testen" geeft een fout**

- Heb je de **primary key** van de Ns-App-subscription gekopieerd (en niet bijvoorbeeld je account-ID)?
- Is de subscription daadwerkelijk geactiveerd? Check **Profile → Subscriptions** — de status moet **Active** zijn, niet **Submitted** of **Rejected**.
- Is de key ingetrokken of opnieuw gegenereerd? Heb je hem op het portal opnieuw gegenereerd, dan moet je de nieuwe waarde plakken.

**De key werkte gisteren maar nu niet meer**

- Open **Profile → Subscriptions** en check of de subscription nog **Active** is. NS kan keys intrekken die de conditions of use schenden.
- Is je quotum opgebruikt, dan zie je HTTP `429`-errors in de Homey debug-log. Zie [API rate limits](rate-limits.md).

**Ik wil de huidige key intrekken**

Op het portal bij **Profile → Subscriptions → Ns-App** klik je op **Regenerate** naast een van de keys. De nieuwe key vervangt de oude direct. Plak na regenereren de nieuwe waarde in de Homey-app.

## Kosten & limieten

Het Ns-App-product is **gratis**. Het portal vraagt geen betaalgegevens. Rate limits hangen af van je subscription-tier en worden niet publiek gepubliceerd als exacte getallen — zie [API rate limits](rate-limits.md) voor hoe de app daarbinnen blijft, en hoe je je werkelijke limiet uit de response-headers kunt aflezen.
