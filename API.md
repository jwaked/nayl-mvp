# NAYL API

Base path: `/api`. All responses are JSON. Authenticated routes use:

```http
Authorization: Bearer <signed-session-token>
```

Tokens are role-specific. Consumer, business, and admin tokens cannot cross access boundaries.

## Health and configuration

### `GET /api/health`

Returns service version, timestamp, and storage mode.

### `GET /api/config`

Returns GCC markets, categories, public connector states, owner-setup state, defaults, and storage mode. No secret or password material is returned.

### `POST /api/search`

```json
{
  "query": "I need a reliable AC technician in Dubai today under AED 500",
  "market": "AE",
  "city": "Dubai",
  "locale": "en",
  "deep": true
}
```

Configured result connectors run concurrently and fail independently. The response includes resolved intent, normalized ranked results, source attribution, connector execution state, and Deep Search sources when requested.

## Consumer accounts

### `POST /api/consumer/register`

```json
{
  "name": "Sara Ahmed",
  "email": "sara@example.com",
  "password": "StrongPassword1",
  "phone": "+971500000000",
  "locale": "en"
}
```

### `POST /api/consumer/login`

```json
{ "email": "sara@example.com", "password": "StrongPassword1" }
```

### `GET /api/consumer/me`

Role: consumer.

### `PUT /api/consumer/me`

Role: consumer. Updates name, phone, and locale.

### `GET /api/consumer/requests`

Role: consumer. Lists the caller's requests, quotes, and booking state.

### `POST /api/consumer/requests`

Role: consumer.

```json
{
  "contact": {
    "name": "Sara Ahmed",
    "email": "sara@example.com",
    "phone": "+971500000000"
  },
  "query": "AC repair in Dubai today",
  "category": "ac-repair",
  "market": "AE",
  "city": "Dubai",
  "budget": 500,
  "urgency": "today",
  "details": "Living-room unit is blowing warm air.",
  "sourceResult": {
    "id": "business-...",
    "source": "NAYL Marketplace",
    "sourceType": "marketplace",
    "title": "Provider name",
    "url": "https://provider.example/",
    "meta": { "businessId": "biz-..." }
  }
}
```

### `POST /api/consumer/requests/:requestId/accept`

```json
{ "quoteId": "quote-..." }
```

Atomically accepts the selected quote, declines competitors, books the request, creates a confirmed booking, and reveals contact details to the winning provider.

### `POST /api/consumer/requests/:requestId/cancel`

Cancels an open or quoted request.

## Business accounts

### `POST /api/business/register`

```json
{
  "name": "Al Noor Cooling Services",
  "nameAr": "خدمات النور للتكييف",
  "email": "team@provider.com",
  "password": "StrongPassword1",
  "phone": "+971500000000",
  "website": "https://provider.com/",
  "market": "AE",
  "serviceAreas": ["Dubai"],
  "categories": ["ac-repair"],
  "description": "Licensed technicians providing residential AC diagnostics and repair.",
  "priceFrom": 180
}
```

Registration returns a business token. The default direct-pilot policy verifies new accounts immediately. The owner can disable automatic verification at `/admin`; after that, new accounts remain pending.

### `POST /api/business/login`

### `GET /api/business/me`

### `PUT /api/business/me`

### `GET /api/business/opportunities`

Role: verified business. Returns matching requests. Consumer contact is hidden until the provider wins.

### `POST /api/business/opportunities/:requestId/quotes`

```json
{
  "amount": 325,
  "currency": "AED",
  "message": "Includes diagnosis, labour, standard parts, and a service warranty.",
  "availableAt": "Tomorrow, 10:00 AM",
  "validUntil": "2026-09-05T12:00:00.000Z"
}
```

Submitting again updates the provider's existing quote.

### `GET /api/business/kpis`

## Owner and operations

### `GET /api/admin/status`

Public first-launch status. Returns `setupRequired` without exposing owner data.

### `POST /api/admin/setup`

Available only while no stored or environment administrator exists.

```json
{
  "name": "NAYL Owner",
  "email": "owner@example.com",
  "password": "StrongPassword1"
}
```

### `POST /api/admin/login`

### `GET /api/admin/me`

### `GET /api/admin/overview`

### `GET /api/admin/businesses`

### `GET /api/admin/requests`

### `GET /api/admin/consumers`

### `PATCH /api/admin/businesses/:businessId/status`

```json
{ "status": "verified" }
```

Allowed values: `pending`, `verified`, `suspended`.

## Protected live-connector management

### `GET /api/admin/connectors`

Returns masked configuration, provider source, current models, and last test results. Secret values are never returned.

### `PUT /api/admin/connectors`

```json
{
  "openai": {
    "apiKey": "sk-...",
    "model": "gpt-5.6-luna",
    "deepModel": "gpt-5.6-terra",
    "clearApiKey": false
  },
  "google": { "apiKey": "...", "clearApiKey": false },
  "brave": { "apiKey": "...", "clearApiKey": false },
  "resend": {
    "apiKey": "re_...",
    "emailFrom": "NAYL <quotes@example.com>",
    "clearApiKey": false
  },
  "marketplace": { "autoVerifyBusinesses": true }
}
```

Non-empty secrets are encrypted before storage. Blank secret fields preserve the existing value. Set `clearApiKey` to remove a stored secret.

### `POST /api/admin/connectors/:provider/test`

Allowed providers: `openai`, `google`, `brave`, `resend`.

The response always returns a structured test result:

```json
{
  "provider": "google",
  "result": {
    "ok": true,
    "message": "Google Places credentials are valid and Text Search (New) is reachable.",
    "latencyMs": 284,
    "metadata": { "resultCount": 1 }
  }
}
```

## State lifecycles

```text
request: open → quoted → booked
                   └→ cancelled
quote:   submitted → accepted
                    └→ declined
booking: confirmed
```

## Security controls in this build

- scrypt password hashing with unique salts
- signed role-specific sessions
- first-owner setup lock
- AES-256-GCM connector-secret encryption
- same-origin browser architecture
- security headers and restrictive CSP
- input validation and 512 KB JSON limit
- per-IP in-process rate limiting
- audit events for owner, connector, provider, request, quote, and booking operations
