# NAYL MVP API

Base URL when run locally:

```text
http://localhost:8787
```

All JSON API responses include an `X-Request-Id` response header. Errors use:

```json
{
  "error": {
    "code": "REQUEST_ERROR",
    "message": "Human-readable message",
    "requestId": "uuid"
  }
}
```

## Health and configuration

### `GET /api/health`

Returns service status and version.

### `GET /api/config`

Returns client-safe defaults, six GCC markets, cities, currencies, category labels, and connector descriptors. It never returns connector credentials.

## Search

### `POST /api/search`

Request:

```json
{
  "query": "I need a reliable cleaner in Dubai today under AED 250",
  "market": "AE",
  "city": "Dubai",
  "locale": "en"
}
```

Example:

```bash
curl -X POST http://localhost:8787/api/search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "I need a reliable cleaner in Dubai today under AED 250",
    "market": "AE",
    "city": "Dubai",
    "locale": "en"
  }'
```

Response outline:

```json
{
  "requestId": "uuid",
  "generatedAt": "2026-09-04T08:00:00.000Z",
  "query": "I need a reliable cleaner in Dubai today under AED 250",
  "context": {
    "requested": { "market": "AE", "city": "Dubai", "locale": "en" },
    "resolved": { "market": "AE", "city": "Dubai", "locale": "en" }
  },
  "intent": {
    "category": "cleaning",
    "market": "AE",
    "city": "Dubai",
    "budget": 250,
    "currency": "AED",
    "urgency": "today",
    "confidence": 98
  },
  "connectors": [],
  "results": [],
  "resultCount": 3
}
```

The endpoint calls eligible connectors concurrently and does not fail the whole search merely because one connector errors.

## Consumer marketplace requests

### `POST /api/marketplace/requests`

Creates a qualified opportunity.

```json
{
  "consumerId": "demo-consumer",
  "query": "Need apartment cleaning in Dubai tomorrow under AED 500",
  "category": "cleaning",
  "market": "AE",
  "city": "Dubai",
  "budget": 500,
  "currency": "AED",
  "urgency": "tomorrow",
  "sourceResult": {
    "id": "provider-baytcare-cleaning",
    "title": "BaytCare Home Cleaning",
    "meta": { "businessId": "biz-baytcare" }
  }
}
```

### `GET /api/marketplace/requests?consumerId=demo-consumer`

Returns the consumer's opportunities with quotes and booking status, newest first.

### `POST /api/marketplace/requests/:opportunityId/book`

Accepts one quote and declines competing quotes in the MVP record.

```json
{
  "consumerId": "demo-consumer",
  "quoteId": "quote-id"
}
```

## Business portal

### `GET /api/business/profile?businessId=biz-baytcare`

Returns business identity, market, categories, service areas, verification state, and profile fields.

### `PUT /api/business/profile`

```json
{
  "businessId": "biz-baytcare",
  "contactName": "Mariam Al Noor",
  "email": "ops@example.com",
  "phone": "+971500000000",
  "description": "Same-day home cleaning specialists.",
  "acceptingLeads": true,
  "serviceAreas": ["Dubai", "Sharjah"]
}
```

### `GET /api/business/opportunities?businessId=biz-baytcare`

Returns opportunities whose market, category, and city match the business profile. Each item includes `myQuote`, `quoteCount`, and `isPreferred`.

### `GET /api/business/kpis?businessId=biz-baytcare`

Returns qualified opportunities, submitted quotes, wins, quoted value, response rate, response time, and rating.

### `POST /api/business/opportunities/:opportunityId/quotes`

Creates or updates the business's quote.

```json
{
  "businessId": "biz-baytcare",
  "amount": 420,
  "currency": "AED",
  "message": "Two cleaners, supplies included, four-hour service window.",
  "availableAt": "Tomorrow, 10:00 AM"
}
```

The quote currency must match the opportunity currency.

## Admin & Operations

### `GET /api/admin/overview`

Returns:

- Search, request, quote, booking, conversion, and GMV-by-currency KPIs.
- Connector modes and configuration state.
- GCC market rollout seed state.
- Recent search/demand audit.
- Foundation counts for verification, dispute, payment-exception, and content queues.

## Rate limiting

The MVP applies an in-memory IP rate limit to `/api/*`. Configure:

```dotenv
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

Response headers include:

```text
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
```

Production should use a shared distributed limiter at the gateway and service levels.
