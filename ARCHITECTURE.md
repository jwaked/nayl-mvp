# NAYL Architecture

## System view

```text
┌────────────────────────────────────────────────────────────────────┐
│                         Browser clients                            │
│                                                                    │
│  Consumer `/`       Business `/business`       Admin `/admin`      │
│  anonymous session  business auth + profile    operations auth      │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ same-origin HTTPS / JSON
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                    NAYL Node.js application                        │
│                                                                    │
│  Security headers · input validation · role authorization          │
│  Search API · request workflow · quote workflow · booking workflow │
│  Admin operations · audit · notification orchestration             │
└───────────────┬───────────────────────────────┬────────────────────┘
                │                               │
                ▼                               ▼
┌──────────────────────────────┐    ┌───────────────────────────────┐
│ Search orchestration         │    │ Persistence                   │
│                              │    │                               │
│ • Local intent fallback      │    │ Preferred: Supabase/Postgres │
│ • OpenAI structured intent   │    │ JSONB state + revision CAS    │
│ • Parallel connectors        │    │                               │
│ • Timeout isolation          │    │ Development: atomic JSON file│
│ • Schema normalization       │    └───────────────────────────────┘
│ • Deduplication and ranking  │
└───────────────┬──────────────┘
                │
     ┌──────────┼──────────────┬────────────────┐
     ▼          ▼              ▼                ▼
 NAYL live   Google Places  Brave Search   OpenAI web_search
 providers   Text Search    public web     deep sourcing

Optional side effect: Resend transactional email
```

## Search execution

1. The API validates the query, market, city, locale, and deep-search flag.
2. A deterministic parser creates a safe fallback intent.
3. When configured, OpenAI Structured Outputs refines the intent using only supported category/market enums.
4. NAYL Marketplace, Google Places, and Brave run concurrently.
5. Deep search runs only when the consumer activates it and OpenAI is configured.
6. Each connector returns the common result contract.
7. The orchestrator deduplicates and ranks results while preserving attribution, source type, source mode, and external URL.
8. Connector failures are surfaced in the response and do not fabricate replacement results.
9. A search audit event is persisted.

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

External search results remain external and attributed. A consumer can use them as context for a NAYL request, but NAYL does not pretend the external provider has joined or will answer. Only registered, verified NAYL businesses receive and submit quotes.

## Marketplace transaction

```text
consumer session
      │
      ▼
validated persisted request
      │ match: verified + active + country + city + category
      ▼
business opportunity feed
      │
      ▼
validated quote (price, currency, availability, expiry, message)
      │
      ▼
consumer comparison
      │ atomic acceptance transaction
      ▼
confirmed booking + losing quotes declined + winning contact released
```

The contact-release rule limits disclosure: matching businesses see demand context but not personal contact information. Only the booked business receives the contact.

## Authentication and authorization

- Business passwords: random salt + Node.js `scrypt`, 64-byte derived hash.
- Sessions: HMAC-SHA256 signed bearer tokens with role, subject, issue time, expiry, and unique token ID.
- Consumer session: anonymous identity, 180-day expiry.
- Business session: 30-day expiry.
- Admin session: 12-hour expiry, created only after constant-time comparison with server environment credentials.
- Route handlers enforce role and resource ownership.

For public scale, migrate to a managed identity provider, HttpOnly secure cookies or short-lived access tokens with rotation, MFA for admins, email/phone verification, session revocation, and granular RBAC.

## Persistence model

### Pilot mode: Supabase/PostgreSQL state document

The complete state is stored in one `jsonb` row (`nayl_state.state_key='primary'`) with a revision number. Writes use optimistic compare-and-swap semantics:

1. read `data, revision`
2. mutate a private copy
3. update only where the revision still matches
4. increment revision
5. retry on conflict

Benefits for this stage:

- no database driver dependency
- works through Supabase PostgREST
- persistent on Render Free
- atomic application-level transitions
- simple export and reset

Limitations:

- the whole document is read/written on each transaction
- write contention grows with traffic
- database constraints cannot protect individual business/quote/booking records
- analytics queries require application processing

### Scale target

Normalize into tables such as:

```text
users, consumer_profiles, organizations, business_users
businesses, branches, categories, service_areas, verifications
searches, connector_runs, search_results
quote_requests, request_matches, quotes, bookings, order_events
payments, ledger_entries, refunds, disputes
reviews, notifications, notification_attempts
audit_events, admin_roles, admin_role_assignments
```

Add row-level transaction boundaries, unique/idempotency constraints, queues, outbox processing, backups, and a warehouse/event stream.

## Connector security

All provider credentials stay in server environment variables. The browser calls only NAYL. Source content is treated as untrusted:

- external URLs allow only `http` and `https`
- web markup is stripped before display
- text lengths are capped
- OpenAI structured deep results are kept only when their canonical URL appears in the actual source list returned by the web-search tool
- source attribution remains visible and clickable
- the application never embeds credentials into result URLs or browser code

## Frontend design

The interface uses an original dark performance-dashboard system influenced by high-level traits the user liked—strong contrast, telemetry rings, compact metrics, luminous action states, and restrained motion. It does not copy WHOOP logos, assets, layouts, product terminology, or proprietary visual elements.

All three portals share design tokens but have separate HTML and JavaScript entry points. English/Arabic switching updates text direction (`ltr`/`rtl`) and localized content.
