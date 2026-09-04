# NAYL API

Base path: `/api`

All responses are JSON. Errors have this shape:

```json
{
  "error": {
    "code": "REQUEST_ERROR",
    "message": "Human-readable message",
    "requestId": "uuid"
  }
}
```

Authenticated routes use:

```http
Authorization: Bearer <signed-session-token>
```

Tokens are role-specific; a consumer token cannot access business or admin endpoints.

## Public and configuration

### `GET /api/health`

Health and active storage mode.

### `GET /api/config`

Returns GCC markets, categories, connector states, defaults, and storage mode. No secrets are returned.

### `POST /api/search`

Request:

```json
{
  "query": "I need a reliable AC technician in Dubai today under AED 500",
  "market": "AE",
  "city": "Dubai",
  "locale": "en",
  "deep": false
}
```

The response includes:

- resolved intent
- normalized and ranked results
- source attribution and connector mode on every result
- per-connector execution status
- deep-search summary and source links when enabled

Configured result connectors run concurrently and fail independently.

## Consumer

### `POST /api/consumer/session`

Creates an anonymous consumer identity and a signed 180-day token. The browser stores it locally so only that browser can read its requests.

### `GET /api/consumer/requests`

Role: consumer.

Lists the caller's persisted requests, quotes, booking references, and statuses.

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
    "meta": { "businessId": "business-..." }
  }
}
```

The server validates the market, city, category, contact, and optional source. A client-supplied preferred business is accepted only when that business still exists, is verified, is active, and matches the request.

### `POST /api/consumer/requests/:requestId/accept`

Role: consumer owner.

```json
{ "quoteId": "quote-..." }
```

Atomically:

- verifies ownership and quote validity
- verifies the provider is still active
- marks the selected quote accepted
- marks competitors declined
- marks the request booked
- creates a confirmed booking
- emits audit and optional email notifications

### `POST /api/consumer/requests/:requestId/cancel`

Role: consumer owner. Cancels an open/quoted request; booked requests cannot be cancelled through this endpoint.

## Business

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

Registration returns a business token. New businesses are `pending` unless the server explicitly enables auto-verification. Pending accounts can edit their profile but cannot access opportunities or appear in search.

### `POST /api/business/login`

```json
{
  "email": "team@provider.com",
  "password": "StrongPassword1"
}
```

### `GET /api/business/me`

Role: business. Returns the caller's profile without password material.

### `PUT /api/business/me`

Role: business. Updates approved profile fields, categories, service areas, price, and lead acceptance.

### `GET /api/business/opportunities`

Role: verified business.

Returns requests matching the provider's market, category, and service area. Customer contact is `null` until the provider wins the booking.

### `POST /api/business/opportunities/:requestId/quotes`

Role: verified matching business.

```json
{
  "amount": 325,
  "currency": "AED",
  "message": "Includes diagnosis, labour, standard parts, and a service warranty.",
  "availableAt": "Tomorrow, 10:00 AM",
  "validUntil": "2026-09-05T12:00:00.000Z"
}
```

Submitting again updates that business's existing quote. Currency must equal the request currency; expiry must be in the future.

### `GET /api/business/kpis`

Role: business. Returns opportunities, open opportunities, quotes, wins, win rate, and quoted value.

## Admin and Operations

### `POST /api/admin/login`

Uses `ADMIN_EMAIL` and `ADMIN_PASSWORD` configured on the server. The returned admin token lasts 12 hours.

### `GET /api/admin/overview`

Role: admin. Returns search, marketplace, booking, GMV, connector, market rollout, and audit data.

### `GET /api/admin/businesses`

Role: admin. Lists registered businesses and verification state.

### `PATCH /api/admin/businesses/:businessId/status`

Role: admin.

```json
{ "status": "verified" }
```

Allowed states: `pending`, `verified`, `suspended`.

### `GET /api/admin/requests`

Role: admin. Lists request operations data, including contact details. Restrict admin access accordingly.

## Request status lifecycle

```text
open
  ├── quote submitted → quoted
  │                      ├── consumer accepts → booked
  │                      └── consumer cancels → cancelled
  └── consumer cancels → cancelled
```

Quote status lifecycle:

```text
submitted → accepted
          └→ declined
```

## Rate limits and validation

API calls are subject to an in-process IP rate limit configured through:

```dotenv
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=160
```

Inputs are length-limited and validated. JSON bodies are limited to 512 KB. For a multi-instance launch, replace the in-memory limiter with a distributed store and introduce idempotency keys for transactional writes.
