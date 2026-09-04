# NAYL — GCC-first AI Buyer MVP

NAYL is a runnable, dependency-light MVP for a GCC-first **AI buyer**. A consumer describes an outcome in natural language; NAYL extracts demand context, queries only configured or explicitly demonstrated sources, normalizes the results, ranks them, and either starts a first-party marketplace transaction or hands the consumer to the disclosed external source.

The application contains three responsive portals in one deployable project:

- **Consumer portal:** natural-language search, GCC context, intent extraction, unified result cards, connector disclosure, saved results, English/Arabic UI, marketplace requests, quote comparison, and booking.
- **Business portal:** qualified opportunities, budget/location/urgency context, quote submission, KPIs, and marketplace profile/service-area management.
- **Admin & Operations portal:** search and marketplace KPIs, connector configuration state, GCC rollout state, demand audit, and operating queues.

The core marketplace loop works end to end:

```text
consumer demand → NAYL opportunity → business quote → consumer comparison → booking
```

## Screens

| Consumer | Business | Admin & Operations |
|---|---|---|
| ![Consumer portal](docs/screenshots/consumer.png) | ![Business portal](docs/screenshots/business.png) | ![Admin portal](docs/screenshots/admin.png) |

Arabic/RTL is included: [Arabic consumer screenshot](docs/screenshots/consumer-ar.png).

## Run locally

Requirements: Node.js 20 or newer. The project has no runtime npm dependencies.

```bash
cp .env.example .env
npm start
```

Open:

```text
http://localhost:8787
```

The app reads `.env` directly. API keys are optional; without them, the corresponding connectors remain visibly **Not configured**.

Development mode with automatic restart:

```bash
npm run dev
```

Quality checks:

```bash
npm run check
npm test
```

Reset the local demo database:

```bash
rm -f .data/nayl.json
npm start
```

## Run with Docker

```bash
cp .env.example .env
docker compose up --build
```

The compose file stores mutable MVP data in the `nayl-data` volume.

## Connector truth model

| Connector | Mode | Behavior |
|---|---|---|
| NAYL Marketplace | `live-mvp` | Always available; searches first-party seeded provider records and supports quote/booking actions. |
| Open Web Search | `live` or `not-configured` | Calls Brave Search only when `BRAVE_SEARCH_API_KEY` exists. |
| Local Places | `live` or `not-configured` | Calls Google Places Text Search only when `GOOGLE_MAPS_API_KEY` exists. |
| Partner Apps | `demo` or `not-configured` | Clearly labelled illustrative adapter; it never pretends an unsigned integration is live. |

Configure live connectors in `.env`:

```dotenv
BRAVE_SEARCH_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key
ENABLE_PARTNER_DEMO=true
```

Implementation references:

- Brave Web Search API: `https://api-dashboard.search.brave.com/app/documentation/web-search/get-started`
- Google Places Text Search (New): `https://developers.google.com/maps/documentation/places/web-service/text-search`
- Google Places field masks: `https://developers.google.com/maps/documentation/places/web-service/choose-fields`

## Repository map

```text
public/                         Responsive English/Arabic web client
src/app.js                      HTTP routes and application composition
src/search/orchestrator.js      Multi-connector search orchestration
src/connectors/                 Marketplace, Brave, Places, partner-demo adapters
src/intent.js                   Deterministic bilingual MVP intent extraction
src/ranking.js                  Shared scoring and result deduplication
src/services/                   Marketplace, business, and admin domain services
src/lib/store.js                Atomic JSON persistence for the runnable MVP
src/data/seed.js                Six GCC markets, currencies, providers, and demo demand
test/                           Intent, search, connector-state, and transaction tests
docs/IMPLEMENTATION_PLAN.md     Product and engineering delivery plan
docs/ARCHITECTURE.md            Current and target architecture
docs/API.md                     HTTP API contract
docs/DEMO_SCRIPT.md             Guided product demonstration
```

## Main API routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/search` | Extract intent, run connectors, normalize, rank, and audit results. |
| `POST` | `/api/marketplace/requests` | Convert consumer demand into a business opportunity. |
| `GET` | `/api/marketplace/requests` | Return a consumer's requests and quote comparisons. |
| `POST` | `/api/marketplace/requests/:id/book` | Accept a quote and create an MVP booking. |
| `GET` | `/api/business/opportunities` | Return opportunities matching a business profile. |
| `POST` | `/api/business/opportunities/:id/quotes` | Submit or update a business quote. |
| `GET/PUT` | `/api/business/profile` | Read or update the demo marketplace profile. |
| `GET` | `/api/admin/overview` | Return marketplace, connector, rollout, and operations KPIs. |

Full examples are in [docs/API.md](docs/API.md).

## MVP boundaries

This package intentionally does **not** claim production readiness. It uses a JSON file rather than a transactional database and has no real identity, KYB, payment, ledger, notification, dispute, fraud, or regulated-sector workflow. Seeded provider verification labels are demonstration states, not legal verification claims.

Before public activation, implement the service split, controls, commercial agreements, market-by-market review, and rollout gates in [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).
