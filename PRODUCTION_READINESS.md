# Production Readiness

## Implemented and working

### Product and workflow

- Separate consumer `/`, business `/business`, and owner `/admin` portals
- Consumer registration, sign-in, profile restoration, request history, quote comparison, and booking
- Business registration, sign-in, profile management, matching, quote creation/update, KPIs, and won-contact release
- First-run owner setup, sign-in, business controls, connector configuration/tests, KPIs, and audit visibility
- Natural-language GCC intent extraction with deterministic fallback
- Unified source-attributed result cards
- Full request → opportunity → quote → acceptance → confirmed booking transition

### Live integration framework

- NAYL Marketplace active with no credential
- OpenAI Responses API structured intent adapter
- OpenAI Responses API web-search adapter with source verification
- Google Places Text Search (New) adapter
- Brave Search API adapter
- Resend transactional email adapter
- Dynamic activation from protected admin settings without redeploy
- Per-provider test operation and persisted test status
- Explicit `setup-required`, `live`, and `error` states

### Security baseline

- scrypt password hashing and unique salts
- signed and expiring role sessions
- first-owner setup lock
- role and ownership checks on private routes
- AES-256-GCM encryption of stored connector keys
- no secret return through public/admin read APIs
- CSP and standard browser security headers
- request body and field limits
- per-IP rate limiting
- audit events for privileged and transactional actions
- Supabase state-table browser access revoked in the supplied SQL
- no seeded fake providers or embedded private API credentials

### Reliability baseline

- connector timeouts and failure isolation
- atomic local writes
- Supabase optimistic-revision retries
- health endpoint, request IDs, structured logs, and graceful shutdown
- automated API, connector-contract, auth, vault, and marketplace lifecycle tests

## Required third-party owner inputs

OpenAI, Google Places, Brave Search, and Resend cannot be pre-authorized in a redistributable package. The application owner must supply credentials linked to their own provider account, accepted terms, quotas, and billing. These can be added after deployment through `/admin` and become active immediately.

The code path is implemented and mocked contract tests pass, but authenticated live calls were not executed during packaging because no user-owned credentials were supplied.

## Required before unrestricted public launch

### Identity

- verified consumer and business email/phone
- password recovery
- MFA and step-up authentication for administrators
- token revocation, session inventory, and suspicious-login controls
- organization membership and granular RBAC

### Provider trust

- formal KYB and document workflows
- trade-license and regulated-profession checks
- beneficial-owner/sanctions controls where required
- document expiry and periodic reverification
- branch and staff access administration

### Data and operations

- normalized PostgreSQL schema with constraints and migrations
- durable queue/outbox and idempotency keys
- scheduled backups and restore drills
- distributed rate limiting
- error tracking, metrics, SLOs, alerts, and on-call procedures
- dedicated secrets manager, key rotation, connector quotas, and egress controls
- WAF/bot controls and independent security testing

### Commerce

- provider commercial agreements
- fulfillment state machine
- payment orchestration and double-entry ledger
- invoices and country-specific tax treatment
- cancellation, refund, dispute, chargeback, and reconciliation operations

### Privacy, safety, and legal

- terms and privacy notice
- consent records and data-subject workflows
- data inventory, classification, retention, export, and deletion
- incident response and breach-notification procedures
- marketplace moderation and abuse controls
- fraud/risk rules and manual review
- country-by-country consumer protection, ranking/advertising, licensing, data, and regulated-sector review
