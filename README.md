# NAYL Direct-Live Application

NAYL is a GCC-first AI buyer. A consumer describes an outcome, NAYL resolves the buying intent, searches every configured live source, creates a real quote request, routes it to matching businesses, collects quotes, and creates a confirmed booking when the consumer accepts one.

This package is a running application, not a static prototype. It starts immediately with no `.env` file and includes native consumer, business, and owner authentication.

## Start now

Requirements: Node.js 22 or newer.

```bash
npm start
```

Open:

```text
Consumer: http://localhost:8787/
Business: http://localhost:8787/business
Admin:   http://localhost:8787/admin
Health:  http://localhost:8787/api/health
```

On the first visit to `/admin`, create the owner account. This first-run setup closes permanently after the first owner is created.

## Separate portals

| Portal | Route | Working capabilities |
|---|---|---|
| Consumer | `/` | Create account, sign in, natural-language search, source-aware results, create request, receive quotes, accept quote, confirm booking |
| Business | `/business` | Register, sign in, manage profile, receive matched opportunities, submit/update quotes, see won bookings |
| Admin & Operations | `/admin` | First-run owner setup, sign in, configure/test connectors, provider controls, demand/booking KPIs, audit log |

The consumer portal does not link to the protected business or admin portals. Open those routes directly.

## What works before adding external credentials

The complete first-party marketplace loop works immediately:

```text
Business signs up
      ↓
Business becomes active for the direct pilot
      ↓
Consumer signs up and searches
      ↓
Consumer presses Request quote
      ↓
Persisted opportunity appears at /business
      ↓
Business submits price, timing, and scope
      ↓
Consumer receives and accepts the quote
      ↓
Confirmed booking is created
```

The default direct-pilot policy automatically activates newly registered businesses. The owner can disable **Automatic provider verification** at `/admin` and review every business manually.

## Turn on OpenAI, Google, Brave, and email inside the app

After creating the owner account, open `/admin` and use **Connect NAYL**. Add credentials and press **Save & test**. A successful key becomes active immediately; no source-code edit, environment-variable edit, or redeploy is required.

| Connector | What it does | Credential required |
|---|---|---|
| NAYL Marketplace | Searches registered NAYL businesses and powers requests, quotes, and bookings | None; always live |
| OpenAI Buyer Intelligence | Structured extraction of category, GCC market, city, budget, urgency, language, and constraints | OpenAI Platform API key |
| OpenAI Deep Search | Live provider research using the OpenAI Responses API web-search tool | Same OpenAI Platform API key |
| Google Places | Real local-business discovery through Places Text Search (New) | Google Maps API key with Places API (New) and billing enabled |
| Brave Web Search | Real public-web discovery | Brave Search API subscription token |
| Resend | Quote, opportunity, and booking emails | Resend API key and verified sender |

Credentials entered in the admin console are encrypted with AES-256-GCM before persistence. Saved values are never returned to the browser. Environment variables remain supported as an alternative.

Third-party connectors cannot be genuinely pre-enabled in a distributable ZIP because their providers require credentials tied to the application owner's account, terms, quotas, and billing. NAYL never substitutes fabricated results when a credential is absent or invalid.

## Publish on Render

The checked-in `render.yaml` is zero-prompt for the initial deployment. It creates a free Docker web service, generates a stable session secret, configures the health check, and enables direct-pilot business activation.

1. Upload the extracted package to the root of a GitHub repository.
2. In Render, choose **New → Blueprint** and select the repository.
3. Deploy.
4. Open `https://your-service.onrender.com/admin` and create the owner account.
5. Add and test OpenAI, Google, Brave, and optional Resend credentials inside the admin portal.

Render supplies `RENDER_EXTERNAL_URL`; NAYL uses it automatically for public links. Do not set `PORT` manually.

### Persistence on free hosting

NAYL uses an atomic JSON store by default, which works immediately and persists on a normal server or Docker volume. Hosts with ephemeral filesystems can lose local state after a restart or redeploy. For a lasting public pilot, either attach a persistent disk or configure Supabase using `SUPABASE_SETUP.sql` and these optional variables:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

When Supabase is configured, all accounts, encrypted connector settings, requests, quotes, bookings, and audit events use the PostgreSQL-backed store.

## Optional environment configuration

No environment variables are required for a local first launch. The full list is in `.env.example`.

```dotenv
SESSION_SECRET=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
OPENAI_DEEP_MODEL=gpt-5.6-terra
GOOGLE_MAPS_API_KEY=
BRAVE_SEARCH_API_KEY=
RESEND_API_KEY=
EMAIL_FROM=
AUTO_VERIFY_BUSINESSES=true
```

Admin-vault credentials take precedence over environment credentials. Removing a stored key makes the environment key active again, when present.

## Validation

```bash
npm run check
npm test
```

The automated suite covers:

- three separate portal routes
- consumer, business, and admin authentication boundaries
- first-run owner setup
- encrypted connector persistence and key masking
- protected connector tests
- Google Places, Brave, OpenAI Responses API, and Resend request contracts
- the full request → quote → acceptance → booking workflow
- input validation, quote expiry, and role isolation

## Public-launch boundaries

This is a functional production-pilot foundation. Before high-volume or regulated use, add verified email/phone ownership, formal KYB, granular admin RBAC, normalized database tables, durable queues, payment and ledger services, refunds/disputes, fraud controls, backups, centralized observability, consent/retention controls, and country/vertical legal review.

See:

- `DEPLOY_RENDER.md`
- `API.md`
- `ARCHITECTURE.md`
- `PRODUCTION_READINESS.md`
- `SUPABASE_SETUP.sql`
- `VALIDATION_REPORT.md`
