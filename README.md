# Food Product Search

Full-stack application for searching packaged food products from
[Open Food Facts](https://world.openfoodfacts.org/). Basic product information is public;
detailed nutritional values are only returned when the demo user has an active Stripe
subscription. The interface and product names are available in English, Dutch, German and French.

```
frontend/  Next.js 16 (App Router) + React 19 + Tailwind CSS 4
backend/   Express 5 + Prisma 6 + MySQL 8, Open Food Facts client, Stripe Checkout + webhooks
```

The browser only ever talks to the Express API. Open Food Facts, Stripe and Prisma are never
called from the Next.js app, which is what makes the paywall enforceable rather than cosmetic.

---

## Setup

Requirements: Node.js 20+ and Docker (for MySQL).

```bash
# 1. Install dependencies (npm workspaces installs both apps)
npm install

# 2. Configure environment
cp .env.example .env        # Windows: copy .env.example .env

# 3. Start MySQL (host port 3307, so it will not clash with a local MySQL)
npm run db:up

# 4. Apply the migration and seed the demo user
npm run db:migrate
npm run db:seed

# 5. Run both apps
npm run dev
```

- Frontend: <http://localhost:3000> (redirects to `/en`)
- API: <http://localhost:4000> (`/health` for a quick check)

Without Stripe keys the app is fully usable: checkout is simulated locally. See
[Stripe](#stripe-test-mode) below to switch on the real integration.
`npm install --global @stripe/cli`
`stripe listen --forward-to localhost:4000/api/stripe/webhook`

### Useful commands

| Command | Description |
|---|---|
| `npm test` | Runs the backend and frontend test suites |
| `npm run build` | Type-checks and builds both apps |
| `npm run db:up` / `npm run db:down` | Starts / stops the MySQL container |
| `npm run db:migrate` | Applies Prisma migrations |
| `npm run db:migrate:fresh` | Drops the database, re-applies migrations, and seeds |
| `npm run db:seed` | Creates the demo user |

---

## API

| Method | Route | Description |
|---|---|---|
| GET | `/api/products/search?q=&locale=` | Searches Open Food Facts. Nutrition included only for subscribers. |
| GET | `/api/products/:barcode?locale=` | Single product, gated the same way. |
| GET | `/api/searches/recent?limit=` | Recent searches of the demo user, de-duplicated. |
| GET | `/api/me` | Demo user and subscription status. |
| POST | `/api/billing/checkout` | Creates a monthly Checkout session. |
| POST | `/api/stripe/webhook` | Stripe webhook; verifies the signature. |

Errors are always `{ "error": { "code": ..., "message": ... } }` with a meaningful status code.

---

## Technical decisions

**Layered backend.** Routes stay thin; `product-service.ts` holds the business rules and
repositories wrap Prisma. Because the services depend on repository *types* rather than on
`PrismaClient`, the tests run against in-memory fakes and need no database.

**One gate for nutrition.** `applyNutritionGate` in
[backend/src/services/product-service.ts](backend/src/services/product-service.ts) strips
`nutrition` from the payload and sets `isNutritionLocked` when the subscription is inactive.
The data never reaches the browser, so hiding it in the UI is not what protects it. Both the
search and the single-product endpoint pass through the same function.

**Tolerant Open Food Facts mapping.** The database is crowdsourced, so the raw response is
typed loosely and narrowed in `product-mapper.ts`. Nutriment values arrive as either numbers
or numeric strings (`"6.1"`), so everything goes through `toNumber`, and each field falls back
from `*_100g` to the plain key. Products without a barcode are dropped because they cannot be
identified; every other field may legitimately be `null`.

**Open Food Facts etiquette and resilience.** The client sends a descriptive `User-Agent` and
aborts after `OFF_TIMEOUT_MS`. Anonymous traffic is throttled with intermittent `503`
responses — during development a plain `curl` failed roughly two out of three times — so three
things soften it: identical searches are cached in memory, transient failures are retried twice
with a growing delay, and if the upstream is down while a previous result is still cached, the
stale result is served instead of an error. A rate limit (`429`) is never retried.

**The locale is not sent upstream.** All four localized name fields are requested at once and
the language is resolved in the mapper, so one cached response serves every language and the
number of upstream calls drops by a factor of four.

**Stripe behind an interface.** `BillingProvider` has two implementations. With
`STRIPE_SECRET_KEY` set, the real Stripe SDK is used; otherwise a stub simulates Checkout so
the app remains demonstrable without credentials. The webhook route is mounted with
`express.raw()` *before* `express.json()`, because signature verification needs the exact bytes.

**Prisma 6.** Prisma 7 removes `url` from the datasource block and requires driver adapters.
Version 6 keeps the conventional `DATABASE_URL` + `prisma migrate dev` workflow, which is
simpler to review and to run.

**Search history never breaks a search.** If writing to MySQL fails, the error is logged and
the results are still returned; history is a convenience, not part of the critical path.

---

## Internationalisation

Supported locales: `en`, `nl`, `de`, `fr`.

**Interface.** No i18n library. The locale is the first path segment (`/nl?q=kaas`) and
`app/[locale]/layout.tsx` is the root layout, so `<html lang>` is always correct and a language
is shareable through the URL. Translations are flat JSON files in
[frontend/i18n/messages](frontend/i18n/messages). `translate()` resolves a key in the active
locale, falls back to English, and finally returns the key itself, so a missing translation can
never render as an empty string. The selector is manual, as required: no `Accept-Language`
sniffing and no cookie-based redirect.

**Product data.** The API requests all localized name fields plus `lc=<locale>`, then resolves
a name in this order:

```
product_name_<locale> -> product_name -> generic_name_<locale> -> generic_name -> null
```

`null` becomes a translated placeholder ("Unnamed product") in the UI. Numbers and dates are
formatted with `Intl` using the active locale, so French shows `30,9 g` where English shows
`30.9 g`.

---

## Stripe (test mode)

Without keys the stub provider is active: "Subscribe monthly" calls
`/api/billing/stub/complete`, which activates the subscription and redirects back. A "Cancel
subscription" button makes the locked state easy to demonstrate again.

To use the real integration, set the following in `.env` and restart the backend:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...        # a monthly recurring price
STRIPE_WEBHOOK_SECRET=whsec_...
```

Then forward the webhooks:

```bash
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

Handled events: `checkout.session.completed`, `customer.subscription.created|updated|deleted`.
Because Stripe moved `current_period_end` from the subscription onto its items in recent API
versions, both locations are read.

---

## Tests

```bash
npm test
npm run e2e
npm run e2e:open
```

`npm run e2e` starts the frontend on port 3100 with a deterministic mock API on port 4100,
then runs Cypress headlessly. `npm run e2e:open` starts the same frontend and opens Cypress.
The E2E environment does not use MySQL, Open Food Facts, or Stripe credentials.

Backend (Vitest + Supertest, 58 tests):

- **Mapping** — localized name fallback chain, string/number coercion, missing `nutriments`,
  products without a barcode.
- **Gating** — nutrition removed for non-subscribers and present for subscribers, on both
  endpoints; lapsed periods count as inactive; the paywalled values do not appear anywhere in
  the response body.
- **Search routes** — blank and over-long terms rejected, zero results still recorded, unknown
  locale falls back to English, results survive a failing history write.
- **Stripe webhook** — missing and forged signatures rejected (signed with
  `generateTestHeaderString`, so real verification runs), `checkout.session.completed` unlocks
  nutrition, deletion locks it again, unrelated events acknowledged without side effects.
- **Open Food Facts client** — `User-Agent` and localized fields requested, one cached response
  reused across locales, `503` retried and `429` not, stale results served during an outage,
  unexpected payloads tolerated.

Frontend (Vitest + Testing Library, 17 tests):

- **i18n** — all four locales complete against the English key set, fallback to English, unknown
  keys, parameter interpolation.
- **Language selector** — offers four languages, labels itself in the active language, swaps the
  path segment and keeps the current search term.
- **Product card** — values shown when unlocked, hidden with an upgrade prompt when locked,
  placeholders for incomplete products, French formatting and labels.

Cypress E2E:

- **Pages and localization** — root redirect, all four locale pages, language switching with
  query preservation, and the unsupported-locale page.
- **Search UI** — submission, results, empty and error states, recent-search links, locked
  nutrition, and incomplete product placeholders.
- **Subscription UI** — successful and failed checkout, success/canceled notices, unlocked
  nutrition, and cancellation.

---

## Known limitations

- **One demo user, no authentication.** Every request is attributed to the seeded demo user and
  the API is unauthenticated. A real deployment needs sessions and per-user rate limiting.
- **The stub billing provider trusts the caller.** `/api/billing/stub/*` changes the subscription
  without payment. It is only reachable when no Stripe key is configured, and the redirect target
  is checked against `FRONTEND_URL`, but it must never be enabled in production.
- **Open Food Facts throttles anonymous callers.** Searches intermittently fail with `503`
  regardless of the client; retries, caching and the stale fallback reduce it but cannot remove
  it. The UI then shows a translated error. Registered API accounts are exempt from the limits,
  which would be the fix for a real deployment.
- **The cache is per process.** A 60-second in-memory cache is enough for one instance; several
  instances would need Redis.
- **Search is not paginated.** The first 24 Open Food Facts results are shown.
- **Translations cover the interface only.** Product names depend on what contributors entered;
  if a language is missing, English is shown. Ingredients and categories are not translated.
- **Nutrition is per 100 g/ml.** Per-serving values are not calculated.
- **`current_period_end` is not set immediately.** `checkout.session.completed` does not include
  it; it arrives with the first `customer.subscription.updated` event. Until then the
  subscription is active without an end date.
- **No end-to-end tests.** Both suites use mocks; no test runs against a live MySQL, Stripe or
  Open Food Facts.
