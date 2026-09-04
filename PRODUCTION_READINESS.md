# Production Readiness

## Implemented now

### Product

- Responsive English/Arabic consumer experience
- Dedicated `/business` and `/admin` portals
- Natural-language GCC intent extraction with deterministic fallback
- Unified, attributed, normalized live-source results
- Consumer request history and quote comparison
- Business onboarding, profile, matching, quoting, and KPIs
- Admin verification, connector status, marketplace KPIs, request and audit visibility

### Transaction integrity

- Server-side validation of market, city, category, currency, amount, expiry, URL, and ownership
- Atomic request/quote/booking mutations within the active store
- One quote per business per request, updated on resubmission
- Expired quotes cannot be accepted
- Inactive/suspended providers cannot win bookings
- Competing quotes are declined on booking
- Contact data is hidden until a business wins

### Security baseline

- Password hashing with scrypt and random salts
- Signed, expiring role tokens
- Constant-time credential/signature comparisons where relevant
- Authorization checks on every private API route
- Content Security Policy and standard browser security headers
- Request body limits and input length limits
- IP-based rate limit
- server-only connector and database secrets
- RLS enabled on the Supabase state table; browser roles revoked
- no mock provider records or embedded API credentials

### Reliability baseline

- Connector timeouts and failure isolation
- Atomic local writes
- optimistic revision conflicts and retries for Supabase state
- health endpoint and request IDs
- structured server logs
- graceful shutdown
- automated end-to-end tests

## Required before an unrestricted public launch

### Identity and access

- verified consumer email/phone
- managed identity provider or hardened first-party identity service
- password reset, MFA, session revocation, device/session inventory
- organization membership and granular business/admin RBAC
- privileged-action step-up authentication

### Provider trust

- formal KYB workflow
- trade-license and regulated-profession validation
- beneficial-owner and sanctions checks where legally required
- document expiry and periodic reverification
- branch and staff access management

### Data architecture and operations

- normalized PostgreSQL schema with constraints and migrations
- durable queue/outbox and idempotency
- scheduled backups and restoration drills
- distributed rate limiting
- observability, error tracking, SLOs, alerts, and on-call
- secret vault, rotation, egress restrictions, and connector quotas
- WAF/bot controls and penetration testing

### Commerce

- provider commercial agreements
- explicit booking/fulfillment state machine
- payment service and double-entry ledger
- PCI-scoped design through hosted payment components
- invoices/tax handling
- refunds, cancellations, disputes, and chargebacks
- reconciliation and finance operations

### Safety, privacy, and legal

- terms, privacy notice, consent records, and cookie approach
- data inventory, classification, retention, deletion, and export
- incident response and breach notification procedures
- moderation and marketplace abuse controls
- fraud/risk rules and manual review tools
- consumer-protection, competition/ranking, advertising, licensing, and sector review for every country/category

## Credential verification status

The code paths and request schemas for OpenAI, Google Places, Brave Search, Resend, and Supabase are implemented. Automated tests validate NAYL's own workflow without network dependencies. Live third-party authentication was not executed during packaging because no user API keys were supplied. The application reports missing credentials as `not-configured` and reports runtime API errors instead of displaying fabricated results.
