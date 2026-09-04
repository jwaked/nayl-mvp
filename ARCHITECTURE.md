# NAYL Architecture

## Runtime view

```text
┌──────────────────────────────────────────────────────────────────────┐
│                           Browser clients                            │
│                                                                      │
│  Consumer `/`             Business `/business`       Admin `/admin`  │
│  account + requests       provider + quote console   owner + ops     │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ same-origin HTTPS + JSON
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       NAYL Node.js service                           │
│                                                                      │
│ auth · authorization · validation · rate limit · CSP · audit         │
│ search orchestration · opportunity matching · quotes · bookings      │
│ first-run owner setup · encrypted connector vault · connector tests  │
└──────────────────┬───────────────────────────┬───────────────────────┘
                   │                           │
                   ▼                           ▼
┌───────────────────────────────┐    ┌────────────────────────────────┐
│ Dynamic search runtime        │    │ Persistence                    │
│                               │    │                                │
│ • deterministic fallback      │    │ immediate: atomic JSON         │
│ • OpenAI structured intent    │    │ optional: Supabase/Postgres    │
│ • NAYL Marketplace            │    │ encrypted connector settings   │
│ • Google Places               │    │ accounts, demand, quotes       │
│ • Brave Web Search            │    │ bookings, audit, tests         │
│ • OpenAI Deep Search          │    └────────────────────────────────┘
│ • ranking + deduplication     │
└───────────────┬───────────────┘
                │
      ┌─────────┼──────────┬───────────────┐
      ▼         ▼          ▼               ▼
   OpenAI    Google      Brave           Resend
 Responses  Places API  Search API      email API
```

## Direct activation model

Connector configuration is resolved for every search or notification operation:

```text
protected admin-vault value
          │ takes precedence
          ▼
environment-variable value
          │ fallback
          ▼
setup-required state
```

The owner enters credentials at `/admin`. The backend encrypts each secret with AES-256-GCM using a key derived from the stable session secret. Only a masked hint, provider source, model configuration, and test result are returned to the browser. The decrypted value exists only in the server process while constructing a provider request.

Because connector factories are created from current runtime settings, saving a new credential activates it without a process restart or redeployment.

## Search execution

1. Validate query, GCC market, city, locale, and Deep Search flag.
2. Produce a deterministic local intent so search still functions when OpenAI is unavailable.
3. When OpenAI is configured, refine the intent with strict JSON-schema structured output.
4. Run NAYL Marketplace, Google Places, and Brave concurrently.
5. When selected, run OpenAI Deep Search with live web search and source collection.
6. Normalize every provider response into one result contract.
7. Deduplicate and rank while retaining source, mode, attribution, and URL.
8. Return independent connector status and latency; one provider failure does not cancel the others.
9. Persist a search audit event.

## Shared result contract

```json
{
  "id": "source-id",
  "source": "Google Places",
  "sourceType": "places",
  "sourceMode": "live",
  "title": "Provider or source title",
  "subtitle": "Description or address",
  "price": null,
  "currency": "AED",
  "priceLabel": null,
  "rating": 4.7,
  "reviews": 250,
  "availability": "Open now",
  "score": 91,
  "action": "View place",
  "actionType": "external-link",
  "url": "https://...",
  "attribution": "Google Places",
  "requestable": true,
  "meta": {}
}
```

External results remain attributed external sources. They can be attached as context to a NAYL request, but NAYL does not claim that an external provider was contacted. Only registered NAYL businesses receive opportunities and submit quotes.

## Marketplace transaction

```text
consumer account
      │
      ▼
validated persisted quote request
      │ match: active + market + city + category
      ▼
business opportunity feed
      │
      ▼
validated quote: amount + currency + timing + message + optional expiry
      │
      ▼
consumer quote comparison
      │ atomic acceptance
      ▼
confirmed booking + competing quotes declined + winning contact released
```

Personal contact information is hidden from matching providers until a provider wins the booking.

## Authentication and authorization

- Consumer, business, and owner passwords use unique salts and Node.js `scrypt`.
- Sessions are signed with HMAC-SHA256 and include role, subject, issue time, expiry, and unique token ID.
- Consumer and business sessions last 30 days; owner sessions last 12 hours.
- The first owner can be created only when no stored or environment administrator exists.
- Every private route enforces role and resource ownership.
- Connector-management endpoints require an owner token.

A public-scale release should add email/phone verification, password recovery, MFA for privileged users, session revocation, granular RBAC, and managed identity controls.

## Persistence

### Immediate mode: atomic JSON

The app starts with no database. Writes use a serialized transaction queue and atomic temporary-file rename. This is suitable for local use, a single server, or a Docker instance with a persistent volume.

### Optional persistent cloud mode: Supabase/PostgreSQL

The complete state can be stored in one `jsonb` row with a revision number. Writes use optimistic compare-and-swap:

1. read state and revision
2. mutate a private copy
3. update only when the revision still matches
4. increment revision
5. retry on conflict

This keeps the pilot dependency-light. At scale, normalize users, organizations, providers, service areas, searches, requests, matches, quotes, bookings, payments, notifications, and audit events into constrained tables and add queues/outbox processing.

## Connector security and source integrity

- Provider credentials remain server-side.
- Admin-vault secrets are authenticated-encrypted at rest.
- External URLs allow only HTTP and HTTPS.
- Web markup is stripped and text lengths are capped.
- OpenAI Deep Search results survive only when their canonical URL appears in the actual web-search source list.
- Source attribution remains visible.
- No connector silently falls back to fabricated data.

## Frontend system

The three portals use separate HTML and JavaScript entry points with shared design tokens. The original interface uses a dark, high-contrast, telemetry-oriented visual system inspired only by the performance qualities the user liked in WHOOP; it does not copy WHOOP assets, branding, terminology, or proprietary screens.

English and Arabic are supported, including RTL direction changes.
