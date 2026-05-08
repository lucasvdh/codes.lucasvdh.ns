---
description: Step-by-step — create an NS account, subscribe to the API, and copy your key.
---

# Get your NS API key

Before you can use this app, you need a personal **subscription key** for the NS API. The key is free and takes about five minutes to set up. This page walks you through it click by click.

> {% hint style="info" %}
> The NS API runs on Microsoft Azure API Management. Your subscription key is what NS uses to identify _your_ traffic and apply rate limits. Keep it private — anyone with your key can use up your quota.
> {% endhint %}

## Step 1 · Create an account on the NS Developer Portal

1. Open <https://apiportal.ns.nl/> in your browser.
2. Click **Sign up** in the top-right corner.
3. Fill in the registration form:
   - **Email address** — use one you can check; you'll receive a confirmation link.
   - **Password** — pick a strong one.
   - **First name** and **Last name** — your real name is fine.
   - **Company** — required by the form. If you're using the API privately, type something like `Personal use` or your own name.
4. Click **Sign up** at the bottom.
5. Open the **confirmation email** NS sends you and click the verification link. Without this step the account isn't active.
6. Return to <https://apiportal.ns.nl/> and **Sign in** with your email and password.

> If the confirmation email doesn't arrive within a few minutes, check your spam folder. You can request a new one from the sign-in page.

## Step 2 · Subscribe to the Ns-App product

The portal groups APIs into _products_. The free product that includes departures, trips, and disruptions is called **Ns-App**.

1. Make sure you are signed in (your email shows in the top-right).
2. Click **Products** in the top navigation.
3. Find **Ns-App** in the product list and click it.
4. Click the **Subscribe** button on the product page.
5. Give the subscription a recognisable name (e.g. `Homey`) and click **Confirm**.

In most cases the subscription is approved instantly. Occasionally NS asks you to wait briefly for manual approval — you'll get an email when it's active.

> {% hint style="warning" %}
> If you don't subscribe, your key will exist but **return errors on every call**. The key only works against products you actively subscribed to.
> {% endhint %}

## Step 3 · Copy your primary key

1. Click your **name or email in the top-right corner** → **Profile**.
2. Scroll down to the **Subscriptions** section.
3. Find your **Ns-App** subscription.
4. Next to **Primary key** click **Show**.
5. Click **Copy** (or select and copy manually).

You should now have a long alphanumeric string on your clipboard — that's your key. It looks like:

```
a1b2c3d4e5f6...  (about 32 characters)
```

> Each subscription has a **primary** and a **secondary** key. They're equivalent — both work. The two-key system exists so you can rotate without downtime: paste the secondary in a new place, regenerate the primary, then swap. For one-off use, just take the primary.

## Step 4 · Paste it into the Homey app

1. Open the Homey app on your phone.
2. Open the **NS app** → **Configure app**.
3. Paste the key into the **API key** field.
4. Tap **Test connection**.
5. You should see a green confirmation. Done.

If the test fails, see [troubleshooting](#troubleshooting) below.

## Troubleshooting

**"Test connection" returns an error**

- Did you copy the **primary key** of the Ns-App subscription (not, say, your account ID)?
- Did the subscription actually activate? Check **Profile → Subscriptions** — the state should be **Active**, not **Submitted** or **Rejected**.
- Was the key revoked or regenerated? If you regenerated it on the portal, you need to paste the new value.

**The key worked yesterday but doesn't anymore**

- Open **Profile → Subscriptions** and check whether the subscription is still **Active**. NS can revoke keys that breach the conditions of use.
- If your quota is exhausted you'll see HTTP `429` errors in the Homey debug log. See [API rate limits](rate-limits.md).

**I want to revoke the current key**

On the portal at **Profile → Subscriptions → Ns-App**, click **Regenerate** next to either key. The new key replaces the old one immediately. After regenerating, paste the new value into the Homey app.

## Cost & limits

The Ns-App product is **free**. The portal does not ask for payment details. Rate limits depend on your subscription tier and are not publicly published as exact numbers — see [API rate limits](rate-limits.md) for how the app stays within them and how to read your actual limit from the response headers.
