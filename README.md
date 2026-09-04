# NAYL Production Pilot

> **Flat GitHub upload edition:** every source, browser, test, SQL, documentation, and screenshot file is intentionally in this one directory. Select all extracted files and upload them together to the root of an empty GitHub repository.

NAYL is a GCC-first AI buyer. A consumer describes an outcome, NAYL resolves the buying intent, searches only configured live sources, opens a persisted quote request, matches verified businesses, collects quotes, and creates a booking when the consumer accepts one.

This package is a functioning production-pilot application, not a static mock-up. It deliberately starts with an empty marketplace: businesses must register and an administrator must verify them before they can appear in search or receive opportunities.

## Separate portals

| Portal | Route | Purpose |
|---|---|---|
| Consumer | `/` | Natural-language search, source-aware results, request creation, quote comparison, booking |
| Business | `/business` | Registration, sign-in, verified opportunity feed, quote submission, profile and KPIs |
| Admin & Operations | `/admin` | Secure sign-in, business verification, connector health, marketplace and request oversight |

The consumer interface does not expose navigation links to the business or admin portals. Those portals are opened directly through their routes.

## What is real in this build

- Consumer, business, and admin actions call the backend API and persist state.
- `Request quote` opens a validated contact/details form and creates an actual opportunity.
- Verified businesses matching the request's country, city, and category receive the opportunity.
- A business can submit or update a quote.
- The consumer automatically receives and compares quotes, then accepts one.
- Quote acceptance creates a confirmed booking, closes competing quotes, and reveals customer contact only to the winning business.
- Business passwords are salted and hashed with scrypt.
- Consumer, business, and admin data are protected by signed role-specific sessions.
- The application has audit events, rate limiting, validation, security headers, connector disclosure, and optional email notifications.
- Supabase/PostgreSQL persistence is supported for free-hosted deployments; local atomic JSON is a development fallback.

## Live connectors

| Connector | Capability | Required variable |
|---|---|---|
| NAYL Marketplace | Searches real NAYL businesses that registered and passed admin verification | Always active |
| OpenAI Buyer Intelligence | Structured intent extraction for category, GCC market, city, budget, urgency, language, and constraints | `OPENAI_API_KEY` |
| OpenAI Deep Search | Live agentic web research through the Responses API `web_search` tool, with clickable source URLs | `OPENAI_API_KEY` |
| Google Places | Live local-business discovery through Places Text Search (New) | `GOOGLE_MAPS_API_KEY` |
| Brave Web Search | Live public-web provider discovery | `BRAVE_SEARCH_API_KEY` |
| Resend | Transactional email for verification, opportunities, quotes, and bookings | `RESEND_API_KEY`, `EMAIL_FROM` |
| Supabase | Persistent PostgreSQL-backed state on hosts with ephemeral disks | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` |

A connector with no credential is returned as `not-configured`; the application never substitutes fake data. A configured connector that fails returns an error state while the other connectors continue.

A ChatGPT subscription is not an API credential. NAYL needs a separate OpenAI Platform API key with API billing enabled.

## Local start

Requirements: Node.js 22 or newer.

```bash
cp .env.example .env
npm start
```

Open:

```text
Consumer: http://localhost:8787/
Business: http://localhost:8787/business
Admin:   http://localhost:8787/admin
Health:  http://localhost:8787/api/health
```

Set at least these values in `.env` before sharing the application:

```dotenv
SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters
ADMIN_EMAIL=operations@yourdomain.com
ADMIN_PASSWORD=replace-with-a-strong-password
```

Generate a strong session secret, for example:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

## Persistent free deployment: Supabase + Render

Render Free has an ephemeral filesystem, so persistent requests and bookings require Supabase.

1. Create a Supabase project.
2. Open its SQL Editor and run [`SUPABASE_SETUP.sql`](SUPABASE_SETUP.sql).
3. Copy the project URL and a backend-only secret key from Supabase project settings.
4. Upload this repository to GitHub.
5. In Render, create a Blueprint from the repository. Render reads [`render.yaml`](render.yaml), builds the supplied [`Dockerfile`](Dockerfile), and uses `/api/health` for health checks.
6. Enter all environment variables marked `sync: false`.
7. After Render assigns the domain, set `APP_BASE_URL` to the full HTTPS domain and redeploy.

The minimum persistent configuration is:

```dotenv
APP_BASE_URL=https://your-service.onrender.com
SESSION_SECRET=<generated by Render Blueprint>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
ADMIN_EMAIL=operations@yourdomain.com
ADMIN_PASSWORD=<strong unique password>
```

Then add the connector keys you intend to activate:

```dotenv
OPENAI_API_KEY=sk-...
GOOGLE_MAPS_API_KEY=...
BRAVE_SEARCH_API_KEY=...
RESEND_API_KEY=re_...
EMAIL_FROM=NAYL <quotes@your-verified-domain.com>
```

Detailed instructions are in [`DEPLOY_RENDER.md`](DEPLOY_RENDER.md).

## First real end-to-end run

1. Open `/business`, choose **Register business**, and submit a genuine provider profile.
2. Open `/admin`, sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`, and verify the provider.
3. Open `/`, search for a need in the provider's approved city/category, and press **Request quote**.
4. Complete the buyer form. The request is persisted and appears in the verified business account.
5. Sign into `/business`, open the opportunity, and submit a price, availability, expiry, and message.
6. Return to the consumer browser. The page polls for updates every 20 seconds; press **Refresh** for an immediate update.
7. Accept the quote. NAYL creates a confirmed booking and reveals the buyer's contact to the winning business.

## Useful commands

```bash
npm run check   # syntax, route, and secret-pattern checks
npm test        # automated API and workflow tests
npm start       # production-style local server
npm run dev     # Node watch mode
```

Docker:

```bash
docker compose up --build
```

## Important pilot boundaries

This build is appropriate for a controlled pilot with real providers and quote requests, after configuring persistent storage, secrets, API billing, policies, and operational ownership. It is not yet a complete regulated public marketplace. Before accepting high-volume or regulated transactions, add consumer account verification, formal KYB, granular admin RBAC, normalized database tables, durable job queues, payment and ledger services, refunds/disputes, fraud controls, notification retries, backups, monitoring, consent/retention controls, and market/vertical legal approvals.

See [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md) and [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).

## Documentation

- [`DEPLOY_RENDER.md`](DEPLOY_RENDER.md) — exact free deployment procedure
- [`API.md`](API.md) — routes, authentication, and request examples
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — system and data-flow design
- [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) — controlled launch plan
- [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md) — completed controls and remaining launch gates
- [`SUPABASE_SETUP.sql`](SUPABASE_SETUP.sql) — one-time persistence schema

- [`VALIDATION_REPORT.md`](VALIDATION_REPORT.md) — automated and smoke-test evidence
