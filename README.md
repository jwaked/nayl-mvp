# NAYL — Complete Flat GitHub/Render Package

NAYL is a GCC-first AI buyer MVP. A consumer describes an outcome in natural language; NAYL extracts demand context, searches only configured or explicitly demonstrated sources, normalizes and ranks results, and either starts a first-party marketplace transaction or hands the consumer to the disclosed external source.

This edition contains the complete project in **one directory with no required source subfolders**, making it suitable for selecting all files and uploading them through GitHub's browser interface.

## Included portals

- **Consumer portal:** natural-language search, six GCC markets, city and budget context, intent extraction, unified result cards, source disclosure, saved-result foundation, English/Arabic UI, quote requests, quote comparison, and booking.
- **Business portal:** qualified opportunities, customer context, quote submission, KPIs, and marketplace profile/service-area foundations.
- **Admin & Operations portal:** marketplace/search KPIs, connector state, GCC rollout state, demand audit, and future operations queues.

The complete MVP loop is implemented:

```text
consumer demand -> NAYL opportunity -> business quote -> comparison -> booking
```

## Run locally

Requirements: Node.js 20 or newer. There are no runtime npm dependencies.

```bash
cp .env.example .env
npm start
```

Open `http://localhost:8787`.

Quality checks:

```bash
npm run check
npm test
```

## Deploy to Render

Upload all files in this directory to the root of a GitHub repository. Then create a Render **Web Service** with:

```text
Runtime: Docker
Root Directory: blank
Dockerfile Path: ./Dockerfile
Health Check Path: /api/health
Plan: Free
```

Do not define `PORT`; Render provides it automatically.

The Dockerfile does not refer to `src`, `public`, `docs`, or `scripts` folders, so it avoids the previous missing-folder build error.

## Connector truth model

| Connector | Current behavior |
|---|---|
| NAYL Marketplace | Always available as `live-mvp` |
| Open Web Search | `live` only when `BRAVE_SEARCH_API_KEY` is configured; otherwise `not-configured` |
| Local Places | `live` only when `GOOGLE_MAPS_API_KEY` is configured; otherwise `not-configured` |
| Partner Apps | Explicitly marked `demo`; never represented as a signed live integration |

Optional connector variables belong in Render's Environment settings or a local `.env` file:

```dotenv
BRAVE_SEARCH_API_KEY=
GOOGLE_MAPS_API_KEY=
ENABLE_PARTNER_DEMO=true
```

## Flat repository map

```text
server.js                         Application entry point
backend-app.js                    API routing and application composition
search-orchestrator.js            Multi-connector orchestration
connector-*.js                    Marketplace, Brave, Places, and partner adapters
intent.js                         Bilingual intent extraction
ranking.js                        Shared ranking and deduplication
service-*.js                      Marketplace, business, and admin services
store.js                          Atomic JSON persistence
seed.js                           GCC markets, currencies, providers, and demo demand
index.html                        Responsive web shell
web-app.js                        Consumer, Business, and Admin client
styles.css                        Responsive visual design
i18n.js                         Arabic/English strings
API.md                            HTTP API contract
ARCHITECTURE.md                   Current and target architecture
IMPLEMENTATION_PLAN.md            Delivery and production-readiness plan
DEMO_SCRIPT.md                    Guided product demonstration
test-*.js                         Automated intent, search, and transaction tests
screenshot-*.png                  Portal previews
```

## Main API routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/search` | Extract intent, run connectors, normalize, rank, and audit results |
| `POST` | `/api/marketplace/requests` | Turn consumer demand into an opportunity |
| `GET` | `/api/marketplace/requests` | Return a consumer's requests and quote comparisons |
| `POST` | `/api/marketplace/requests/:id/book` | Accept a quote and create a booking |
| `GET` | `/api/business/opportunities` | Return opportunities matching a business profile |
| `POST` | `/api/business/opportunities/:id/quotes` | Submit or update a quote |
| `GET/PUT` | `/api/business/profile` | Read or update the demo business profile |
| `GET` | `/api/admin/overview` | Return marketplace, connector, rollout, and operations KPIs |

See `API.md` for request and response examples.

## MVP boundaries

This package is a working MVP, not a production system. It uses a local JSON file and does not yet implement real identity, authorization, KYB, payments, ledger controls, notifications, disputes, fraud controls, or regulated-sector workflows. Render Free also uses an ephemeral filesystem, so demo requests, quotes, and bookings may reset after restarts or redeployments.

Use fictional demonstration data only until production controls are implemented.
